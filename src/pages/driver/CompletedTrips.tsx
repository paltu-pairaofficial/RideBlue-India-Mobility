import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, MapPin, Star, Banknote } from 'lucide-react';
import { useRide } from '../../context/RideContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR, formatDateTime } from '../../utils/formatters';
import { RideTollAdjustments } from '../../components/RideTollAdjustments';

export const CompletedTrips: React.FC = () => {
  const { bookings, drivers } = useRide();
  const { currentUser } = useAuth();
  const driver = drivers.find((d) => d.userId === currentUser?.id || d.id === currentUser?.id);
  const completed = bookings.filter((b) => driver && b.driverId === driver.id && b.status === 'completed');

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        <div>
          <h1 className="page-heading text-slate-900">Driver Completed Trips</h1>
          <p className="body-text text-slate-500 mt-0.5">
            Log of completed passenger journeys and individual trip earnings.
          </p>
        </div>

        {completed.length > 0 ? (
          <div className="space-y-4">
            {completed.map((b) => (
              <div
                key={b.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{b.bookingCode}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${b.paymentStatus === 'paid' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-600 bg-slate-100'}`}>
                      {b.paymentStatus === 'paid' ? 'Payment verified' : 'Payment not verified as paid'}
                    </span>
                    <span className="text-xs text-slate-500">Passenger: {b.riderName}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatDateTime(b.completedAt || b.createdAt)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                      <div className="font-semibold text-slate-800">{b.pickup.address}</div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 mt-1" />
                      <div className="font-semibold text-slate-800">{b.destination.address}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Trip Distance:</span>
                      <span className="font-bold text-slate-800">{b.distanceKm} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Recorded Fare:</span>
                      <span className="font-bold text-slate-800">{formatINR(b.fareBreakdown.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Driver earnings:</span>
                      <span className="font-black text-slate-700 tabular-nums">Unavailable until verified earnings ledger is configured</span>
                    </div>
                  </div>
                </div>

                {Number(b.fareBreakdown.airportLevyAmount || 0) > 0 && <div className="text-xs text-slate-600">Included airport levy: <strong>{formatINR(Number(b.fareBreakdown.airportLevyAmount))}</strong></div>}
                <RideTollAdjustments rideId={b.id} role="driver" />

                {b.review && (
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/50 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-600 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>Passenger Rating: {b.review.rating} / 5</span>
                      {b.review.comment && (
                        <span className="text-slate-600 italic font-normal ml-2">"{b.review.comment}"</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="card-heading text-slate-800">No Completed Trips Logged</h3>
            <p className="body-text text-slate-500 max-w-sm mx-auto">
              Completed trips will appear here with earnings calculations and passenger review feedback.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
