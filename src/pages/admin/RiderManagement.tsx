import React, { useState, useEffect } from 'react';
import { Users, Search, Star, ShieldCheck, Mail, Phone, AlertCircle, RefreshCw } from 'lucide-react';
import { useRide } from '../../context/RideContext';
import { isSupabaseConfigured, supabase } from '../../supabase/client';

interface RiderAccount {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  rating?: number | null;
  totalTrips: number;
  status: string;
  joined: string;
}

export const RiderManagement: React.FC = () => {
  const { bookings } = useRide();
  const [riders, setRiders] = useState<RiderAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchRiders = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isSupabaseConfigured && supabase) {
        let token = '';
        const { data: sessionData } = await supabase.auth.getSession();
        token = sessionData.session?.access_token || '';

        // Query backend admin endpoint or profiles table
        const apiBase = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/+$/, '');
        const res = await fetch(`${apiBase}/api/admin/riders`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.riders)) {
            const mapped: RiderAccount[] = data.riders.map((r: any) => {
              const userTrips = bookings.filter((b) => (b.riderId === r.id || b.riderId === r.user_id) && b.status === 'completed').length;
              return {
                id: r.id,
                user_id: r.user_id,
                name: r.full_name || '',
                email: r.email || '',
                phone: r.phone || '',
                rating: r.rating == null ? null : Number(r.rating),
                totalTrips: userTrips,
                status: typeof r.status === 'string' ? r.status : 'Status unavailable',
                joined: r.created_at?.split('T')[0] || 'Unavailable',
              };
            });
            setRiders(mapped);
            setLoading(false);
            return;
          }
        }
      }

      setRiders([]);
      setError('Rider records could not be loaded from the authorized admin API. No local profile fallback is shown.');
    } catch (err: any) {
      console.warn('Could not fetch database riders:', err);
      setError(err?.message || 'Failed to load rider accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRiders();
  }, [bookings.length]);

  const filteredRiders = riders.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.phone.includes(search)
  );

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-heading text-slate-900">Passenger &amp; Account Management</h1>
            <p className="body-text text-slate-500 mt-0.5">
              Live audit of registered passenger accounts, verify safety standings, and inspect journey histories.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search passengers..."
                className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20"
              />
            </div>

            <button
              type="button"
              onClick={fetchRiders}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 shadow-sm"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full helper-text text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Passenger</th>
                  <th className="py-3.5 px-4 font-semibold">Contact Details</th>
                  <th className="py-3.5 px-4 font-semibold">Rating</th>
                  <th className="py-3.5 px-4 font-semibold">Completed Rides</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRiders.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{r.name}</td>
                    <td className="py-3.5 px-4">
                      <div>{r.email}</div>
                      <div className="text-slate-400">{r.phone || 'No phone recorded'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-amber-500 font-bold">{r.rating == null ? 'Not rated' : `★ ${r.rating}`}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{r.totalTrips} rides</td>
                    <td className="py-3.5 px-4">
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold text-[10px] border border-emerald-200">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-400">{r.joined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && filteredRiders.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              No registered passenger accounts found matching your query.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
