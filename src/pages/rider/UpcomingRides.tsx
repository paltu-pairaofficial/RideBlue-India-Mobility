import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Navigation, X, ShieldCheck } from 'lucide-react';
import { useRide } from '../../context/RideContext';
import { formatINR, formatDateTime } from '../../utils/formatters';

export const UpcomingRides: React.FC = () => {
  const { bookings, cancelBooking } = useRide();
  const upcoming = bookings.filter((b) => b.status === 'accepted' || (b.scheduledDate && b.status !== 'cancelled' && b.status !== 'completed'));

  const [cancelModalId, setCancelModalId] = useState<string | null>(null);

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-heading text-slate-900">Upcoming &amp; Scheduled Rides</h1>
            <p className="body-text text-slate-500 mt-0.5">
              Airport transfers and advance booked journeys across India.
            </p>
          </div>
          <Link
            to="/rider/book"
            className="px-4 py-2 bg-[#FFE600] text-slate-950 btn-text rounded-xl shadow-sm"
          >
            + Schedule Ride
          </Link>
        </div>

        {upcoming.length > 0 ? (
          <div className="space-y-4">
            {upcoming.map((b) => (
              <div
                key={b.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm text-slate-900">{b.bookingCode}</span>
                    <span className="text-xs text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full font-bold border border-indigo-200">
                      Scheduled
                    </span>
                    <span className="text-xs text-slate-500 capitalize">
                      · RideBlue {b.vehicleCategory.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#0798F2]" />
                    <span>{b.scheduledDate || 'Today'} · {b.scheduledTime || 'Instant'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Pickup</div>
                        <div className="font-semibold text-slate-800">{b.pickup.address}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 mt-1" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Destination</div>
                        <div className="font-semibold text-slate-800">{b.destination.address}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Distance &amp; ETA:</span>
                      <span className="font-bold text-slate-800">{b.distanceKm} km · ~{b.estimatedDurationMin} mins</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Confirmed Fare:</span>
                      <span className="font-bold text-slate-800">{formatINR(b.fareBreakdown.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment:</span>
                      <span className="font-semibold text-slate-800 capitalize">{b.paymentMethod} ({b.paymentStatus})</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCancelModalId(b.id)}
                    className="px-4 py-2 btn-text text-rose-600 hover:bg-rose-50 rounded-xl"
                  >
                    Cancel Booking
                  </button>
                  <Link
                    to={`/rider/tracking/${b.id}`}
                    className="px-5 py-2 bg-[#0798F2] hover:bg-[#0570B5] text-white btn-text rounded-xl shadow-sm"
                  >
                    Track Driver &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4">
            <Clock className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="card-heading text-slate-800">No Upcoming Rides Scheduled</h3>
            <p className="body-text text-slate-500 max-w-sm mx-auto">
              You do not have any future scheduled cab bookings. Schedule an airport transfer or early morning highway commute.
            </p>
            <Link
              to="/rider/book"
              className="inline-block px-6 py-2.5 bg-[#FFE600] text-slate-950 btn-text rounded-xl shadow-sm"
            >
              Book a Ride
            </Link>
          </div>
        )}

        {/* Cancellation confirmation modal */}
        {cancelModalId && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4">
              <h3 className="card-heading text-slate-900">Cancel this upcoming ride?</h3>
              <p className="helper-text text-slate-600">
                Are you sure you want to cancel this booking? Free cancellation is applicable for advance bookings.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalId(null)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 btn-text rounded-xl"
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  onClick={() => {
                    cancelBooking(cancelModalId, 'User cancelled upcoming ride', 'rider');
                    setCancelModalId(null);
                  }}
                  className="flex-1 py-2 bg-rose-600 text-white btn-text rounded-xl shadow-sm"
                >
                  Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
