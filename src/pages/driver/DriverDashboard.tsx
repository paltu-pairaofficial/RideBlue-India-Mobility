
import React from 'react';
import { Link } from 'react-router-dom';
import { Power, AlertCircle, Clock } from 'lucide-react';

import { useRide } from '../../context/RideContext';
import { useAuth } from '../../context/AuthContext';
import {
  formatINR,
  getDriverApprovalConfig,
} from '../../utils/formatters';

export const DriverDashboard: React.FC = () => {
  const {
    drivers,
    toggleDriverOnline,
    activeDriverTrip,
    bookings,
    dataLoading,
    dataError,
  } = useRide();

  const { currentUser } = useAuth();

  // Find only the signed-in driver's profile.
  const driver = drivers.find(
    (d) =>
      d.userId === currentUser?.id ||
      d.id === currentUser?.id
  );

  // Never display another driver's profile as a fallback.
  if (!driver) {
    return (
      <div className="flex-1 bg-slate-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <h1 className="text-xl font-bold text-slate-900">
              Driver Profile Not Found
            </h1>
            <p className="mt-3 text-slate-600">
              No driver profile matches your signed-in account.
              Please sign in with your registered driver account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const approvalCfg = getDriverApprovalConfig(
    driver.approvalStatus
  );

  // Use real booking data already loaded by RideContext.
  const pendingRequests = bookings.filter(
    (booking) => booking.status === 'requested'
  );

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {dataLoading && <div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading authorized Supabase data…</div>}
        {dataError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{dataError}</div>}

        {/* Driver profile and availability */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#E5F4FF] text-[#0798F2] flex items-center justify-center font-bold text-2xl shadow-inner">
              {driver.name.charAt(0)}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="page-heading text-slate-900">
                  {driver.name}
                </h1>

                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${approvalCfg.badgeClass}`}
                >
                  {approvalCfg.label}
                </span>
              </div>

              <p className="text-sm text-slate-500 mt-1">
                {driver.vehicleModel} ·{' '}
                <span className="font-bold">
                  {driver.vehicleNumber}
                </span>{' '}
                · {driver.vehicleCategory.toUpperCase()}
              </p>
            </div>
          </div>

          <div>
            {driver.approvalStatus === 'approved' ? (
              <button
                type="button"
                onClick={() => toggleDriverOnline(driver.id)}
                className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-md transition-all ${driver.isOnline
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
              >
                <Power className="w-4 h-4" />
                {driver.isOnline
                  ? 'Online & Receiving Rides'
                  : 'Offline (Tap to Go Online)'}
              </button>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Approval required to go online
              </div>
            )}
          </div>
        </div>

        {/* Active trip */}
        {activeDriverTrip && (
          <div className="bg-gradient-to-r from-[#102A43] to-[#0798F2] rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-[#FFE600]">
                Active Trip ({activeDriverTrip.bookingCode})
              </div>

              <h2 className="text-lg font-bold">
                Passenger: {activeDriverTrip.riderName}
              </h2>

              <p className="text-sm text-slate-200">
                Pickup: {activeDriverTrip.pickup.address}
                {' → '}
                Destination: {activeDriverTrip.destination.address}
              </p>
            </div>

            <Link
              to="/driver/active-trip"
              className="px-6 py-3 bg-[#FFE600] text-slate-950 font-semibold rounded-xl shadow-md text-center whitespace-nowrap"
            >
              Open Trip Navigation →
            </Link>
          </div>
        )}

        {/* Driver metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase">
              Today's Earnings
            </div>
            <div className="text-2xl font-bold text-[#102A43] mt-1">
              {driver.earningsToday == null ? 'Unavailable' : formatINR(driver.earningsToday)}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase">
              Week's Earnings
            </div>
            <div className="text-2xl font-bold text-[#102A43] mt-1">
              {driver.earningsWeek == null ? 'Unavailable' : formatINR(driver.earningsWeek)}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase">
              Driver Rating
            </div>
            <div className="text-2xl font-bold text-amber-500 mt-1">
              {driver.ratingCount > 0
                ? `★ ${driver.rating.toFixed(2)}`
                : 'Not rated yet'}
            </div>

            <div className="text-xs text-slate-500 mt-1">
              {driver.ratingCount === 0
                ? 'No passenger reviews yet'
                : `${driver.ratingCount} ${driver.ratingCount === 1 ? 'review' : 'reviews'
                }`}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase">
              Acceptance Rate
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {driver.acceptanceRate == null ? 'Unavailable' : `${driver.acceptanceRate}%`}
            </div>
          </div>
        </div>

        {/* REAL incoming booking requests */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                Live Incoming Requests
              </h2>

              <Link
                to="/driver/requests"
                className="text-sm font-semibold text-[#0798F2] hover:underline"
              >
                View All →
              </Link>
            </div>

            {!driver.isOnline ? (
              <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl space-y-2">
                <Power className="w-8 h-8 text-slate-300 mx-auto" />
                <p>
                  You are offline. Go online to become available
                  for passenger requests.
                </p>
              </div>
            ) : driver.approvalStatus !== 'approved' ? (
              <div className="p-8 text-center text-amber-800 bg-amber-50 rounded-2xl">
                Your driver account must be approved before
                receiving and accepting rides.
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl space-y-3">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <h3 className="font-semibold text-slate-800">
                  No Pending Ride Requests
                </h3>
                <p className="text-sm">
                  No pending bookings are currently available
                  in the booking data visible to this account.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <span className="text-xs text-emerald-700 bg-emerald-100 font-bold px-2 py-1 rounded">
                          Pending Passenger Request
                        </span>

                        <h3 className="font-bold text-slate-900 mt-3">
                          {booking.riderName}
                        </h3>
                      </div>

                      <div className="text-lg font-bold text-[#102A43]">
                        {formatINR(booking.fareBreakdown.total)}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-800">
                          Pickup:
                        </span>{' '}
                        {booking.pickup.address}
                      </p>

                      <p>
                        <span className="font-semibold text-slate-800">
                          Destination:
                        </span>{' '}
                        {booking.destination.address}
                      </p>

                      <p>
                        <span className="font-semibold text-slate-800">
                          Trip distance:
                        </span>{' '}
                        {booking.distanceKm} km
                      </p>

                      <p>
                        <span className="font-semibold text-slate-800">
                          Payment:
                        </span>{' '}
                        {booking.paymentMethod}
                      </p>
                    </div>

                    <Link
                      to="/driver/requests"
                      className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
                    >
                      Review Ride Requests →
                    </Link>
                  </div>
                ))}

                {pendingRequests.length > 5 && (
                  <p className="text-sm text-slate-500">
                    Showing 5 of {pendingRequests.length} pending
                    requests.
                    {' '}
                    <Link
                      to="/driver/requests"
                      className="text-[#0798F2] font-semibold hover:underline"
                    >
                      View all
                    </Link>
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Driver documents */}
          <aside className="lg:col-span-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900">
                Vehicle Documents
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3 p-2 rounded-lg bg-slate-50">
                  <span className="text-slate-500">Commercial DL:</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {driver.documents.licenseNumber}
                  </span>
                </div>

                <div className="flex justify-between gap-3 p-2 rounded-lg bg-slate-50">
                  <span className="text-slate-500">RC Permit:</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {driver.documents.rcNumber}
                  </span>
                </div>

                <div className="flex justify-between gap-3 p-2 rounded-lg bg-slate-50">
                  <span className="text-slate-500">Insurance Expiry:</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {driver.documents.insuranceValidUntil}
                  </span>
                </div>
              </div>

              <Link
                to="/driver/documents"
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl block text-center transition-colors"
              >
                Manage Documents
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
