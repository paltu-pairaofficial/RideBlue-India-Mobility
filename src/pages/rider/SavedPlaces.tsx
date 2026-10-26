import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Plus, Trash2, Home, Briefcase, Plane, Navigation, ArrowRight } from 'lucide-react';
import { useRide } from '../../context/RideContext';

export const SavedPlaces: React.FC = () => {
  const { riderProfile } = useRide();
  const [isAdding, setIsAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (label.trim() && address.trim()) {
      // Address geocoding and persistent saved-place storage are not configured yet.
      window.alert('Saved places are unavailable until address geocoding and Supabase persistence are configured. No location was saved.');
    }
  };

  const getIcon = (lbl: string) => {
    const l = lbl.toLowerCase();
    if (l.includes('home')) return <Home className="w-4 h-4 text-[#0798F2]" />;
    if (l.includes('work') || l.includes('office')) return <Briefcase className="w-4 h-4 text-purple-600" />;
    if (l.includes('airport')) return <Plane className="w-4 h-4 text-amber-600" />;
    return <MapPin className="w-4 h-4 text-emerald-600" />;
  };

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-heading text-slate-900">Saved Places</h1>
            <p className="body-text text-slate-500 mt-0.5">
              Quick one-tap shortcuts for your frequent home, office, and airport routes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 bg-[#FFE600] text-slate-950 btn-text rounded-xl shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Place</span>
          </button>
        </div>

        {isAdding && (
          <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="card-heading text-slate-900">Add New Favorite Location</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label text-slate-700 block mb-1">Location Label</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Gym, Client Office, University"
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20"
                />
              </div>
              <div>
                <label className="form-label text-slate-700 block mb-1">Full Address / Landmark</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. South City Mall, Prince Anwar Shah Rd"
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 btn-text text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0798F2] text-white btn-text rounded-xl shadow-sm"
              >
                Save Location
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {riderProfile.savedPlaces.map((sp) => (
            <div
              key={sp.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-start justify-between gap-4 hover:border-[#0798F2] transition-colors"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  {getIcon(sp.label)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900">{sp.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{sp.address}</div>
                  <div className="mt-3">
                    <Link
                      to="/rider/book"
                      state={{ initialDestination: { address: sp.address, lat: sp.lat, lng: sp.lng } }}
                      className="text-xs font-bold text-[#0798F2] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Book ride here</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.alert('Removing saved places is unavailable until Supabase saved-place persistence is configured. No change was made.')}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
