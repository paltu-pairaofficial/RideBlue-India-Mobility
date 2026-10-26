import React, { useMemo } from 'react';
import { Wallet, Star, AlertCircle } from 'lucide-react';
import { useRide } from '../../context/RideContext';
import { useAuth } from '../../context/AuthContext';

export const EarningsRatings: React.FC = () => {
  const { drivers, bookings, dataLoading, dataError } = useRide();
  const { currentUser } = useAuth();
  const driver = drivers.find((d) => d.userId === currentUser?.id || d.id === currentUser?.id);
  const completedTrips = useMemo(() => bookings.filter((b) => driver && b.driverId === driver.id && b.status === 'completed'), [bookings, driver]);

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
        <div>
          <h1 className="page-heading text-slate-900">Earnings &amp; Ratings Analytics</h1>
          <p className="body-text text-slate-500 mt-0.5">Only verified financial ledger and persisted rating records can be shown here.</p>
        </div>
        {dataLoading && <div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading authorized Supabase data…</div>}
        {dataError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{dataError}</div>}
        {!driver && !dataLoading && <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center"><AlertCircle className="w-8 h-8 mx-auto text-slate-400"/><h2 className="mt-3 font-bold text-slate-900">Driver profile unavailable</h2><p className="mt-2 text-sm text-slate-600">No driver profile is associated with the signed-in account. No other driver's data is displayed.</p></div>}
        {driver && <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"><div className="text-xs font-semibold text-slate-400 uppercase">Driver earnings</div><div className="text-2xl font-bold text-[#102A43] mt-1">Unavailable</div><p className="text-xs text-slate-500 mt-1">A verified earnings ledger and approved commission rule are not configured.</p></div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"><div className="text-xs font-semibold text-slate-400 uppercase">Completed trips</div><div className="text-2xl font-bold text-[#102A43] mt-1">{completedTrips.length}</div><p className="text-xs text-slate-500 mt-1">Completed records assigned to this driver.</p></div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"><div className="text-xs font-semibold text-slate-400 uppercase">Driver rating</div><div className="text-2xl font-bold text-amber-500 mt-1">{driver.rating > 0 ? `★ ${driver.rating}` : 'Not rated'}</div><p className="text-xs text-slate-500 mt-1">Only persisted ratings are shown.</p></div>
          </div>
          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Completed trips</h2>
            {completedTrips.length === 0 ? <p className="mt-4 text-sm text-slate-500">No completed trips are available for this driver yet.</p> : <div className="mt-4 divide-y divide-slate-100">{completedTrips.map((trip) => <div key={trip.id} className="py-3 flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-semibold text-slate-900">{trip.bookingCode}</div><div className="text-xs text-slate-500">{trip.pickup.address} → {trip.destination.address}</div></div><div className="text-sm font-semibold text-slate-700">Earnings unavailable</div></div>)}</div>}
          </section>
        </>}
      </div>
    </div>
  );
};
