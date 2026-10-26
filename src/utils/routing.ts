export interface RouteSummary {
  distanceKm: number;
  durationMinutes: number;
  coordinates: Array<[number, number]>;
}

// Haversine formula to compute geodesic distance between two points
export function calculateGeodesicDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Realistic road distance calculation with urban curvature multiplier (1.28x)
export function getEstimatedRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  stops: Array<{ lat: number; lng: number }> = []
): RouteSummary {
  const allPoints = [start, ...stops, end];
  let totalDistanceKm = 0;

  for (let i = 0; i < allPoints.length - 1; i++) {
    const d = calculateGeodesicDistance(
      allPoints[i].lat,
      allPoints[i].lng,
      allPoints[i + 1].lat,
      allPoints[i + 1].lng
    );
    totalDistanceKm += d * 1.28; // Road curvature factor
  }

  // Rounded to 1 decimal place, minimum 2.5 km
  totalDistanceKm = Math.max(2.5, Math.round(totalDistanceKm * 10) / 10);

  // Urban driving speed in West Bengal averages 22-28 km/h in metro, 45 km/h on highways
  const avgSpeedKmh = totalDistanceKm > 50 ? 42 : 24;
  const durationMinutes = Math.max(
    10,
    Math.round((totalDistanceKm / avgSpeedKmh) * 60) + stops.length * 8
  );

  // Generate intermediate waypoint polyline for Leaflet
  const coordinates: Array<[number, number]> = [];
  const segments = 12;

  for (let i = 0; i < allPoints.length - 1; i++) {
    const p1 = allPoints[i];
    const p2 = allPoints[i + 1];
    for (let s = 0; s <= segments; s++) {
      const t = s / segments;
      // Slight jitter along the perpendicular to mimic real road curves
      const perpOffset = Math.sin(t * Math.PI) * 0.003 * ((i % 2 === 0) ? 1 : -1);
      const lat = p1.lat + (p2.lat - p1.lat) * t + perpOffset;
      const lng = p1.lng + (p2.lng - p1.lng) * t - perpOffset;
      coordinates.push([lat, lng]);
    }
  }

  return {
    distanceKm: totalDistanceKm,
    durationMinutes,
    coordinates,
  };
}


/** Request actual driving distance, duration, and road geometry from OSRM. */
export async function getDrivingRoute(start: { lat: number; lng: number }, end: { lat: number; lng: number }, stops: Array<{ lat: number; lng: number }> = []): Promise<RouteSummary> {
  const points = [start, ...stops, end];
  if (points.some((p) => !Number.isFinite(p.lat) || !Number.isFinite(p.lng) ||
      p.lat < 6 || p.lat > 37.5 || p.lng < 68 || p.lng > 97.5)) {
    throw new Error('Select a valid location in India from the search suggestions.');
  }
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`);
  if (!response.ok) throw new Error('Routing service is unavailable. Please try again.');
  const data = await response.json() as { code?: string; routes?: Array<{ distance: number; duration: number; geometry: { coordinates: Array<[number, number]> } }> };
  const route = data.routes?.[0];
  if (data.code !== 'Ok' || !route || !route.geometry?.coordinates?.length) {
    throw new Error('No driving route was found for these locations. Please choose different locations.');
  }
  return {
    distanceKm: Math.round(route.distance / 100) / 10,
    durationMinutes: Math.max(1, Math.round(route.duration / 60)),
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  };
}
