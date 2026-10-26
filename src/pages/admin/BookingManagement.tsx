import React, { useState } from 'react';
import { Search, Filter, Eye, XCircle, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { useRide } from '../../context/RideContext';
import { RideBooking, RideStatus } from '../../types';
import { formatINR, formatDateTime, getRideStatusConfig } from '../../utils/formatters';
import { RideTollAdjustments } from '../../components/RideTollAdjustments';

export const BookingManagement: React.FC = () => {
  const { bookings, updateRideStatus, cancelBooking } = useRide();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<RideBooking | null>(null);

  const filtered = bookings.filter((b) => {
    const matchesSearch =
      b.bookingCode.toLowerCase().includes(search.toLowerCase()) ||
      b.riderName.toLowerCase().includes(search.toLowerCase()) ||
      b.pickup.address.toLowerCase().includes(search.toLowerCase()) ||
      b.destination.address.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="page-heading text-slate-900">Trip &amp; Booking Management</h1>
          <p className="body-text text-slate-500 mt-0.5">
            Filter, inspect, and manage passenger ride lifecycles across West Bengal.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ref, passenger, or address..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {['all', 'requested', 'accepted', 'driver_arriving', 'in_progress', 'completed', 'cancelled'].map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg btn-text whitespace-nowrap capitalize transition-colors ${
                    statusFilter === st
                      ? 'bg-[#102A43] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              )
            )}
          </div>
        </div>

        {/* Responsive Table */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full helper-text text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Ref Code</th>
                  <th className="py-3.5 px-4 font-semibold">Passenger</th>
                  <th className="py-3.5 px-4 font-semibold">Driver Partner</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Distance &amp; Fare</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((b) => {
                  const sCfg = getRideStatusConfig(b.status);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{b.bookingCode}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{b.riderName}</div>
                        <div className="helper-text text-slate-400">{b.riderPhone}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {b.driverName ? (
                          <div>
                            <div className="font-semibold text-slate-800">{b.driverName}</div>
                            <div className="helper-text text-slate-400">{b.vehiclePlate}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${sCfg.badgeClass}`}>
                          {sCfg.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 tabular-nums">
                          {formatINR(b.fareBreakdown.total)}
                        </div>
                        <div className="helper-text text-slate-400">{b.distanceKm} km · {b.paymentMethod}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedBooking(b)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-[#E5F4FF] hover:text-[#0798F2] text-slate-700 btn-text rounded-lg"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="p-8 text-center body-text text-slate-500">
              No bookings matching the active filter.
            </div>
          )}
        </div>

        {/* Detailed Inspection Drawer / Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Booking Inspection</span>
                <h2 className="card-heading text-slate-900 mt-0.5">
                  Trip Reference: {selectedBooking.bookingCode}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 helper-text bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400">Current Status:</span>
                  <div className="font-bold text-slate-900 capitalize mt-0.5">{selectedBooking.status}</div>
                </div>
                <div>
                  <span className="text-slate-400">Payment Status:</span>
                  <div className="font-bold text-slate-900 capitalize mt-0.5">{selectedBooking.paymentStatus} ({selectedBooking.paymentMethod})</div>
                </div>
              </div>

              <div className="space-y-3 helper-text">
                <div>
                  <span className="text-slate-400 font-semibold">Pickup:</span>
                  <div className="text-slate-900 font-medium">{selectedBooking.pickup.address}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Destination:</span>
                  <div className="text-slate-900 font-medium">{selectedBooking.destination.address}</div>
                </div>
              </div>

              {Number(selectedBooking.fareBreakdown.airportLevyAmount || 0) > 0 && <div className="rounded-xl bg-sky-50 p-3 text-xs text-sky-900">Approved airport levy included in quoted fare: <strong>{formatINR(Number(selectedBooking.fareBreakdown.airportLevyAmount))}</strong></div>}
              <RideTollAdjustments rideId={selectedBooking.id} role="admin" />

              {/* Administrative actions */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <span className="form-label text-slate-800 uppercase tracking-wider block">
                  Admin Overrides
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateRideStatus(selectedBooking.id, 'completed');
                      setSelectedBooking(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white btn-text rounded-xl"
                  >
                    Force Mark Completed
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      cancelBooking(selectedBooking.id, 'Administrative cancellation', 'admin');
                      setSelectedBooking(null);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white btn-text rounded-xl"
                  >
                    Force Cancel Booking
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
