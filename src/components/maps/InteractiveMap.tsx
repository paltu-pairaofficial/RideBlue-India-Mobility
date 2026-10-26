
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Crosshair } from 'lucide-react';
import { LocationPoint, RideStop } from '../../types';

interface InteractiveMapProps {
  pickup?: LocationPoint | null;
  destination?: LocationPoint | null;
  stops?: RideStop[];
  driverLocation?: { lat: number; lng: number } | null;
  routeCoordinates?: Array<[number, number]>;
  interactive?: boolean;
  onSelectCoordinates?: (coords: {
    lat: number;
    lng: number;
    address?: string;
  }) => void;
  className?: string;
  zoomLevel?: number;
}

const isValidCoordinate = (lat: number, lng: number): boolean =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= 6.0 &&
  lat <= 37.5 &&
  lng >= 68.0 &&
  lng <= 97.5;

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  pickup,
  destination,
  stops = [],
  driverLocation,
  routeCoordinates = [],
  interactive = true,
  onSelectCoordinates,
  className = 'h-96 w-full rounded-2xl overflow-hidden',
  zoomLevel = 13,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  const [isFollowingDriver, setIsFollowingDriver] = useState(true);
  const [tileError, setTileError] = useState(false);

  // Only accept finite coordinates inside the supported geographic area.
  const validDriverLocation =
    driverLocation &&
    isValidCoordinate(driverLocation.lat, driverLocation.lng)
      ? driverLocation
      : null;

  // Initialize Leaflet map.
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const defaultCenter: [number, number] =
      pickup && isValidCoordinate(pickup.lat, pickup.lng)
        ? [pickup.lat, pickup.lng]
        : [22.9734, 78.6569];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: zoomLevel,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tiles = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        crossOrigin: true,
      }
    );

    tiles.on('tileerror', () => setTileError(true));
    tiles.on('tileload', () => setTileError(false));
    tiles.addTo(map);

    const markersGroup = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = markersGroup;

    map.on('dragstart', () => {
      setIsFollowingDriver(false);
    });

    if (interactive && onSelectCoordinates) {
      map.on('click', (event: L.LeafletMouseEvent) => {
        onSelectCoordinates({
          lat: event.latlng.lat,
          lng: event.latlng.lng,
          address: `Pin Location (${event.latlng.lat.toFixed(
            4
          )}, ${event.latlng.lng.toFixed(4)})`,
        });
      });
    }

    map.whenReady(() => {
      map.invalidateSize({ pan: false });
    });

    return () => {
      map.off();
      map.remove();

      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      routeLayerRef.current = null;
    };
    // Initialize the map once; changing props are handled in the update effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update all markers and the route.
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;

    if (!map || !markersGroup) return;

    // Always remove previous markers first. This removes the old car marker
    // when driverLocation becomes null or invalid.
    markersGroup.clearLayers();

    const bounds = L.latLngBounds([]);
    let hasPoints = false;

    const createPinIcon = (color: string, label: string) =>
      L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
            <div style="background:${color};color:#fff;font-weight:700;font-size:11px;padding:3px 7px;border-radius:9999px;box-shadow:0 3px 8px rgba(0,0,0,0.25);white-space:nowrap;border:2px solid #fff;">
              ${label}
            </div>
            <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};"></div>
          </div>
        `,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
      });

    // 1. Pickup marker.
    if (
      pickup &&
      isValidCoordinate(pickup.lat, pickup.lng)
    ) {
      const marker = L.marker([pickup.lat, pickup.lng], {
        icon: createPinIcon('#16865C', 'Pickup'),
      }).bindPopup(`<b>Pickup:</b> ${pickup.address}`);

      markersGroup.addLayer(marker);
      bounds.extend([pickup.lat, pickup.lng]);
      hasPoints = true;
    }

    // 2. Intermediate stops.
    stops.forEach((stop, index) => {
      if (!isValidCoordinate(stop.lat, stop.lng)) return;

      const marker = L.marker([stop.lat, stop.lng], {
        icon: createPinIcon('#0798F2', `Stop ${index + 1}`),
      }).bindPopup(`<b>Stop ${index + 1}:</b> ${stop.address}`);

      markersGroup.addLayer(marker);
      bounds.extend([stop.lat, stop.lng]);
      hasPoints = true;
    });

    // 3. Destination marker.
    if (
      destination &&
      isValidCoordinate(destination.lat, destination.lng)
    ) {
      const marker = L.marker(
        [destination.lat, destination.lng],
        {
          icon: createPinIcon('#DC2626', 'Destination'),
        }
      ).bindPopup(`<b>Destination:</b> ${destination.address}`);

      markersGroup.addLayer(marker);
      bounds.extend([destination.lat, destination.lng]);
      hasPoints = true;
    }

    // 4. Driver marker: render only when valid coordinates are provided.
    if (validDriverLocation) {
      const cabIcon = L.divIcon({
        className: 'custom-cab-pin',
        html: `
          <div style="width:36px;height:36px;border-radius:50%;background:#FFE600;border:3px solid #111111;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111111" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 11 2 11.3V16c0 .6.4 1 1 1h2"></path>
              <circle cx="7" cy="17" r="2"></circle>
              <path d="M9 17h6"></path>
              <circle cx="17" cy="17" r="2"></circle>
            </svg>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker(
        [validDriverLocation.lat, validDriverLocation.lng],
        {
          icon: cabIcon,
          zIndexOffset: 1000,
        }
      ).bindPopup('<b>RideBlue Driver</b><br>Reported driver position');

      markersGroup.addLayer(marker);
      bounds.extend([
        validDriverLocation.lat,
        validDriverLocation.lng,
      ]);
      hasPoints = true;

      if (isFollowingDriver) {
        map.panTo(
          [validDriverLocation.lat, validDriverLocation.lng],
          { animate: true }
        );
      }
    }

    // 5. Replace the route line.
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    const validRoute =
      routeCoordinates.length > 1 &&
      routeCoordinates.every(
        ([lat, lng]) => isValidCoordinate(lat, lng)
      );

    if (validRoute) {
      routeLayerRef.current = L.polyline(routeCoordinates, {
        color: '#0798F2',
        weight: 5,
        opacity: 0.85,
        lineJoin: 'round',
      }).addTo(map);
    }

    // Fit the available points when not following the driver.
    if (hasPoints && !isFollowingDriver) {
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15,
      });
    } else if (hasPoints && !validDriverLocation) {
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15,
      });
    }
  }, [
    pickup,
    destination,
    stops,
    validDriverLocation?.lat,
    validDriverLocation?.lng,
    routeCoordinates,
    isFollowingDriver,
  ]);

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    setIsFollowingDriver(true);

    if (validDriverLocation) {
      map.flyTo(
        [validDriverLocation.lat, validDriverLocation.lng],
        15,
        { duration: 0.8 }
      );
    } else if (
      pickup &&
      destination &&
      isValidCoordinate(pickup.lat, pickup.lng) &&
      isValidCoordinate(destination.lat, destination.lng)
    ) {
      map.fitBounds(
        [
          [pickup.lat, pickup.lng],
          [destination.lat, destination.lng],
        ],
        { padding: [50, 50] }
      );
    } else if (
      pickup &&
      isValidCoordinate(pickup.lat, pickup.lng)
    ) {
      map.flyTo([pickup.lat, pickup.lng], 14);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mapContainerRef}
        className="w-full h-full min-h-[280px]"
      />

      {tileError && (
        <div
          role="status"
          className="absolute top-3 left-3 z-[400] max-w-[75%] rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow"
        >
          Map tiles are not loading. Check your internet connection and
          refresh the map.
        </div>
      )}

      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
        <button
          type="button"
          onClick={handleRecenter}
          className="p-2.5 bg-white text-slate-800 rounded-xl shadow-md border border-slate-200/90 hover:bg-slate-50 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          title="Recenter Map View"
        >
          <Crosshair className="w-4 h-4 text-[#0798F2]" />
          <span className="hidden sm:inline">Recenter</span>
        </button>
      </div>

      <div className="absolute bottom-2 left-3 z-[400] bg-white/90 backdrop-blur-sm border border-slate-200 px-2.5 py-1 rounded-md shadow-sm text-[11px] text-slate-600 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-blue-500" />
        <span>OpenStreetMap · Route shown when available</span>
      </div>
    </div>
  );
};
