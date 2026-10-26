import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Search, AlertCircle, X, LoaderCircle } from 'lucide-react';
import { LocationPoint } from '../../types';

interface LocationAutocompleteProps {
  label: string;
  placeholder?: string;
  value: LocationPoint | null;
  onChange: (location: LocationPoint) => void;
  required?: boolean;
  className?: string;
}

interface PhotonFeature {
  properties: { name?: string; street?: string; housenumber?: string; city?: string; state?: string; country?: string; postcode?: string; type?: string };
  geometry: { coordinates: [number, number] };
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  label,
  placeholder = 'Search any location in India...',
  value,
  onChange,
  required = false,
  className = '',
}) => {
  const [query, setQuery] = useState(value?.address || '');
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedAddressRef = useRef(value?.address || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    if (value && Number.isFinite(value.lat) && Number.isFinite(value.lng)) {
      setQuery(value.address);
      selectedAddressRef.current = value.address;
    } else if (value?.address && value.address !== query) {
      setQuery(value.address);
    }
    // Parent updates the value while typing; don't reset the query on each keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng, value?.address]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestRef.current += 1;
  }, []);

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const searchLocations = (text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = text.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestRef.current;
      setSearching(true);
      setSearchError(null);
      try {
        // Bias/filter results to India (west,south,east,north); the search still supports nationwide addresses.
        const params = new URLSearchParams({ q, limit: '7', lang: 'en', bbox: '68.0,6.0,97.5,37.5' });
        const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`);
        if (!response.ok) throw new Error('Location search is temporarily unavailable.');
        const data = await response.json() as { features?: PhotonFeature[] };
        if (requestId !== requestRef.current) return;
        const features = (data.features || []).filter((feature) => {
          const [lng, lat] = feature.geometry.coordinates || [];
          return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 6 && lat <= 37.5 && lng >= 68 && lng <= 97.5;
        });
        setSuggestions(features);
        if (!features.length) setSearchError('No matching Indian location found. Try a nearby landmark, town, or PIN code.');
      } catch {
        if (requestId === requestRef.current) {
          setSuggestions([]);
          setSearchError('Location search failed. Check your internet connection and try again.');
        }
      } finally {
        if (requestId === requestRef.current) setSearching(false);
      }
    }, 350);
  };

  const formatAddress = (feature: PhotonFeature) => {
    const p = feature.properties;
    const street = [p.housenumber, p.street].filter(Boolean).join(' ');
    return [p.name, street, p.city, p.state, p.postcode, p.country].filter((part, index, arr) => part && arr.indexOf(part) === index).join(', ');
  };

  const handleSelect = (feature: PhotonFeature) => {
    const address = formatAddress(feature);
    const [lng, lat] = feature.geometry.coordinates;
    setQuery(address);
    selectedAddressRef.current = address;
    onChange({ address, lat, lng, landmark: feature.properties.name || feature.properties.type || 'Selected location' });
    setIsOpen(false);
    setGeoError(null);
    setSearchError(null);
    setSuggestions([]);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Your browser does not support location detection. Search for an address instead.');
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      try {
        const response = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=en`);
        const data = response.ok ? await response.json() as { features?: PhotonFeature[] } : null;
        const address = data?.features?.[0] ? formatAddress(data.features[0]) : `Selected GPS location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
        setQuery(address);
        selectedAddressRef.current = address;
        onChange({ address, lat, lng, landmark: 'Current location' });
        setIsOpen(false);
      } catch {
        const address = `Selected GPS location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
        setQuery(address);
        selectedAddressRef.current = address;
        onChange({ address, lat, lng, landmark: 'Current location' });
        setIsOpen(false);
      } finally { setGeoLoading(false); }
    }, (err) => {
      setGeoLoading(false);
      setGeoError(err.code === err.PERMISSION_DENIED
        ? 'Location permission denied. You can still search and select any address manually.'
        : 'Could not detect your location. Search and select an address manually.');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };

  return (
    <div ref={wrapperRef} className={`relative flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <label className="form-label text-slate-700">{label} {required && <span className="text-rose-500">*</span>}</label>
        <button type="button" onClick={handleUseCurrentLocation} disabled={geoLoading}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#0798F2] hover:text-[#0570B5] disabled:opacity-60">
          <Navigation className={`w-3 h-3 ${geoLoading ? 'animate-spin' : ''}`} />
          <span>{geoLoading ? 'Locating...' : 'Use current location'}</span>
        </button>
      </div>
      <div className="relative flex items-center">
        <MapPin className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
        <input type="text" value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setIsOpen(true);
            setSearchError(null);
            // Mark typed text as unselected so it cannot accidentally reuse old coordinates.
            selectedAddressRef.current = '';
            onChange({ address: next, lat: Number.NaN, lng: Number.NaN, landmark: 'Unselected search text' });
            searchLocations(next);
          }}
          onFocus={() => { setIsOpen(true); if (query.trim().length >= 3) searchLocations(query); }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20 focus:border-[#0798F2] transition-all" />
        {query && <button type="button" aria-label={`Clear ${label}`} onClick={() => {
          setQuery(''); setSuggestions([]); setSearchError(null); setIsOpen(true); selectedAddressRef.current = '';
          onChange({ address: '', lat: Number.NaN, lng: Number.NaN, landmark: 'Unselected search text' });
        }} className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5"><X className="w-3.5 h-3.5" /></button>}
      </div>
      {geoError && <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200"><AlertCircle className="w-3.5 h-3.5 shrink-0" /><span>{geoError}</span></div>}
      {isOpen && (query.trim().length >= 3) && <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-100">
        <div className="px-3 py-2 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Search className="w-3 h-3" /> Search locations across India
        </div>
        {searching ? <div className="px-3.5 py-4 text-center text-xs text-slate-500 flex justify-center items-center gap-2"><LoaderCircle className="w-4 h-4 animate-spin" />Searching locations...</div>
          : suggestions.length > 0 ? suggestions.map((feature, idx) => {
            const address = formatAddress(feature);
            return <button key={`${feature.geometry.coordinates.join(',')}-${idx}`} type="button"
              onMouseDown={(event) => event.preventDefault()} onClick={() => handleSelect(feature)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-[#E5F4FF]/60 transition-colors flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#0798F2] shrink-0 mt-0.5" />
              <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-900">{feature.properties.name || feature.properties.street || 'Location'}</span>
                <span className="block text-[11px] text-slate-500">{address}</span></span>
            </button>;
          }) : <div className="px-3.5 py-4 text-center text-xs text-slate-500">{searchError || 'Type at least 3 characters to search.'}</div>}
      </div>}
      <p className="text-[10px] text-slate-400">Search and select a location in India. GPS is optional.</p>
    </div>
  );
};
