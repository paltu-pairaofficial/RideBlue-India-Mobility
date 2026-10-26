import React from 'react';
import { Link } from 'react-router-dom';
import {
  Car,
  Clock,
  MapPin,
  Calendar,
  Navigation,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  Plus,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { useRide } from '../../context/RideContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR, getRideStatusConfig } from '../../utils/formatters';

export const RiderDashboard: React.FC = () => {
  const { riderProfile, bookings, activeRiderBooking, dataLoading, dataError } = useRide();
  const { currentUser } = useAuth();

  const completedRides = bookings.filter((b) => b.status === 'completed');
  const upcomingRides = bookings.filter(
    (b) => b.status === 'accepted' && b.scheduledDate
  );

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {dataLoading && <div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading authorized Supabase data…</div>}
        {dataError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{dataError}</div>}
        {/* Welcome Header */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#E5F4FF] text-[#0798F2] flex items-center justify-center font-bold text-2xl shadow-inner">
              {riderProfile.name.charAt(0)}
            </div>
            <div>
              <h1 className="page-heading text-slate-900">
                Welcome back, {riderProfile.name}
              </h1>
              <p className="helper-text text-slate-500 mt-1">
                {riderProfile.phone} · {riderProfile.totalRides} Completed Journeys across West Bengal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/rider/book"
              className="px-6 py-3 bg-[#FFE600] hover:bg-[#ebd300] text-slate-950 btn-text rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Car className="w-4 h-4" />
              <span>Book a New Ride</span>
            </Link>
          </div>
        </div>

        {/* ACTIVE RIDE CARD BANNER (If any) */}
        {activeRiderBooking && (
          <div className="bg-gradient-to-r from-[#102A43] to-[#0798F2] rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#FFE600] animate-ping" />
                <span>Live Active Journey ({activeRiderBooking.bookingCode})</span>
              </div>
              <h2 className="card-heading">
                Driver {activeRiderBooking.driverName} is on the way!
              </h2>
              <p className="helper-text text-slate-200">
                {activeRiderBooking.vehicleModel} · {activeRiderBooking.vehiclePlate} · Destination: {activeRiderBooking.destination.address.slice(0, 32)}...
              </p>
            </div>

            <Link
              to={`/rider/tracking/${activeRiderBooking.id}`}
              className="px-6 py-3 bg-[#FFE600] hover:bg-[#ebd300] text-slate-950 btn-text rounded-xl shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Navigation className="w-4 h-4" />
              <span>Open Live Tracking &rarr;</span>
            </Link>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Total Rides</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {bookings.length}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">Across West Bengal</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Upcoming Scheduled</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {upcomingRides.length}
            </div>
            <Link to="/rider/upcoming" className="text-[11px] text-[#0798F2] hover:underline font-medium mt-1 block">
              View upcoming &rarr;
            </Link>
          </div>



          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Emergency Contact</div>
            <div className="text-sm font-bold text-slate-900 mt-1 truncate">
              {riderProfile.emergencyContact.name}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{riderProfile.emergencyContact.phone}</div>
          </div>
        </div>

        {/* 2-Column Split: Quick Shortcuts / Saved Places + Recent Bookings */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Recent Rides List */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="card-heading text-slate-900">Recent Journeys</h2>
              <Link to="/rider/history" className="helper-text font-semibold text-[#0798F2] hover:underline">
                View All History &rarr;
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {bookings.slice(0, 4).map((b) => {
                const sCfg = getRideStatusConfig(b.status);
                return (
                  <div key={b.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{b.bookingCode}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sCfg.badgeClass}`}>
                          {sCfg.label}
                        </span>
                        <span className="text-[11px] text-slate-400 capitalize">· {b.vehicleCategory.replace('_', ' ')}</span>
                      </div>
                      <div className="text-xs text-slate-600 line-clamp-1">
                        <strong>From:</strong> {b.pickup.address}
                      </div>
                      <div className="text-xs text-slate-600 line-clamp-1">
                        <strong>To:</strong> {b.destination.address}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900 tabular-nums">
                          {formatINR(b.fareBreakdown.total)}
                        </div>
                        <div className="text-[10px] text-slate-400 capitalize">{b.paymentMethod}</div>
                      </div>

                      <Link
                        to={b.status === 'completed' ? '/rider/history' : `/rider/tracking/${b.id}`}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-[#E5F4FF] hover:text-[#0798F2] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Shortcuts & Saved Places */}
          <div className="lg:col-span-4 space-y-6">
            {/* Saved Places Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Saved Places</h3>
                <Link to="/rider/saved-places" className="text-xs font-semibold text-[#0798F2] hover:underline">
                  Manage
                </Link>
              </div>

              <div className="space-y-2.5">
                {riderProfile.savedPlaces.map((sp) => (
                  <Link
                    key={sp.id}
                    to="/rider/book"
                    state={{ initialDestination: { address: sp.address, lat: sp.lat, lng: sp.lng } }}
                    className="p-3 rounded-xl border border-slate-100 hover:border-[#0798F2] hover:bg-slate-50 flex items-start gap-3 transition-colors group block"
                  >
                    <MapPin className="w-4 h-4 text-[#0798F2] shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900">{sp.label}</div>
                      <div className="text-[11px] text-slate-500 truncate">{sp.address}</div>
                    </div>
                  </Link>
                ))}
              </div>

              <Link
                to="/rider/saved-places"
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors block text-center"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add new saved place</span>
              </Link>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  to="/rider/payments"
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#0798F2]" />
                    <span>Payment Methods &amp; Receipts</span>
                  </span>
                  <span>&rarr;</span>
                </Link>

                <Link
                  to="/support"
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Support Tickets</span>
                  </span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
