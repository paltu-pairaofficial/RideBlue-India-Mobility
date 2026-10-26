import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle, Calendar, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import { useRide } from '../../context/RideContext';
import { formatINR, formatDateTime } from '../../utils/formatters';

export const CancelledRides: React.FC = () => {
  const { bookings } = useRide();
  const cancelled = bookings.filter((b) => b.status === 'cancelled');

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        <div>
          <h1 className="page-heading text-slate-900">Cancelled Rides &amp; Refunds</h1>
          <p className="body-text text-slate-500 mt-0.5">
            Audit log of cancelled journeys, cancellation fee rules, and refund status tracking.
          </p>
        </div>

        {cancelled.length > 0 ? (
          <div className="space-y-4">
            {cancelled.map((b) => (
              <div
                key={b.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{b.bookingCode}</span>
                    <span className="text-[10px] text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full font-bold border border-rose-200">
                      Cancelled
                    </span>
                    <span className="text-xs text-slate-400 capitalize">
                      · Cancelled by {b.cancelledBy || 'rider'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDateTime(b.cancelledAt || b.createdAt)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0 mt-1" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Pickup</div>
                        <div className="font-semibold text-slate-800">{b.pickup.address}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0 mt-1" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Destination</div>
                        <div className="font-semibold text-slate-800">{b.destination.address}</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cancellation Reason:</span>
                      <span className="font-bold text-slate-800">{b.cancellationReason || 'Standard cancellation'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cancellation Fee:</span>
                      <span className="font-bold text-slate-800">
                        {b.cancellationFee == null ? 'Unavailable' : formatINR(b.cancellationFee)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Refund Status:</span>
                      <span className="font-bold text-emerald-600 capitalize">
                        {b.refundStatus === 'requested'
                          ? 'Refund Initiated'
                          : b.refundStatus === 'processing'
                          ? 'In Process (Bank)'
                          : 'No Refund Applicable'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Link
                    to="/rider/book"
                    className="px-4 py-2 bg-[#FFE600] text-slate-950 btn-text rounded-xl shadow-sm flex items-center gap-1.5"
                  >
                    <span>Rebook Similar Trip</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4">
            <XCircle className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="card-heading text-slate-800">No Cancelled Rides</h3>
            <p className="body-text text-slate-500 max-w-sm mx-auto">
              You haven't cancelled any journeys. No reliability score is calculated because the policy and scoring rules are not configured.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
