
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Car,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Clock,
  ArrowRight,
  FileCheck,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import { useRide } from '../../context/RideContext';
import {
  formatINR,
  getRideStatusConfig,
  getDriverApprovalConfig,
} from '../../utils/formatters';

export const AdminDashboard: React.FC = () => {
  const { bookings, drivers, supportTickets, dataLoading, dataError } = useRide();

  const pendingApprovals = drivers.filter(
    (d) => d.approvalStatus === 'pending'
  );

  const activeBookings = bookings.filter((b) =>
    ['accepted', 'driver_arriving', 'in_progress'].includes(b.status)
  );

  const openTickets = supportTickets.filter(
    (t) => t.status === 'open' || t.status === 'in_progress'
  );

  const totalGrossRevenue = bookings
    .filter((b) => b.status === 'completed' && b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + b.fareBreakdown.total, 0);

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {dataLoading && <div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading authorized Supabase data…</div>}
        {dataError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{dataError}</div>}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-heading text-slate-900">
              Administrator Command Console
            </h1>
            <p className="body-text text-slate-500 mt-0.5">
              West Bengal fleet operations, booking monitor, and driver verifications.
            </p>
          </div>
        </div>

        {/* Operational KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Active Trips Live
            </span>
            <div className="text-3xl font-extrabold text-[#102A43] mt-1 tabular-nums">
              {activeBookings.length}
            </div>
            <Link
              to="/admin/bookings"
              className="text-[11px] text-[#0798F2] hover:underline font-semibold mt-1 block"
            >
              Inspect active rides &rarr;
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Pending Driver Approvals
            </span>
            <div className="text-3xl font-extrabold text-amber-600 mt-1 tabular-nums">
              {pendingApprovals.length}
            </div>
            <Link
              to="/admin/driver-approvals"
              className="text-[11px] text-amber-700 hover:underline font-semibold mt-1 block"
            >
              Review applications ({pendingApprovals.length}) &rarr;
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Gross Fares on Paid Completed Rides
            </span>
            <div className="text-3xl font-extrabold text-emerald-700 mt-1 tabular-nums">
              {formatINR(totalGrossRevenue)}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Only completed rides with verified paid status
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">
              Open Support Tickets
            </span>
            <div className="text-3xl font-extrabold text-indigo-700 mt-1 tabular-nums">
              {openTickets.length}
            </div>
            <Link
              to="/admin/tickets"
              className="text-[11px] text-indigo-700 hover:underline font-semibold mt-1 block"
            >
              Resolve tickets &rarr;
            </Link>
          </div>
        </div>

        {/* Pending Approvals Queue + Recent Bookings */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Pending Drivers Verification Queue */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="card-heading text-slate-900">
                Driver Verification Queue
              </h2>
              <Link
                to="/admin/driver-approvals"
                className="helper-text font-semibold text-[#0798F2] hover:underline"
              >
                View All &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {pendingApprovals.length > 0 ? (
                pendingApprovals.map((drv) => {
                  const cfg = getDriverApprovalConfig(drv.approvalStatus);

                  return (
                    <div
                      key={drv.id}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {drv.name}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badgeClass}`}
                          >
                            {cfg.label}
                          </span>
                        </div>

                        <div className="helper-text text-slate-500 mt-0.5">
                          {drv.vehicleModel} · {drv.vehicleNumber}
                        </div>
                      </div>

                      <Link
                        to="/admin/driver-approvals"
                        className="px-3 py-1.5 bg-slate-100 hover:bg-[#E5F4FF] hover:text-[#0798F2] btn-text rounded-lg"
                      >
                        Audit
                      </Link>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center">
                  <CheckCircle2
                    className="mx-auto mb-2 text-emerald-500"
                    size={28}
                  />
                  <p className="text-sm font-semibold text-slate-700">
                    No pending driver approvals
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    New driver applications will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bookings Activity Log */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="card-heading text-slate-900">
                Live Booking Monitor
              </h2>
              <Link
                to="/admin/bookings"
                className="helper-text font-semibold text-[#0798F2] hover:underline"
              >
                Manage All Bookings &rarr;
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {bookings.slice(0, 5).map((b) => {
                const sCfg = getRideStatusConfig(b.status);

                return (
                  <div
                    key={b.id}
                    className="py-3 flex items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {b.bookingCode}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sCfg.badgeClass}`}
                        >
                          {sCfg.label}
                        </span>
                        <span className="text-slate-500">{b.riderName}</span>
                      </div>

                      <div className="text-slate-500 text-[11px] mt-0.5 truncate max-w-sm">
                        {b.pickup.address} &rarr; {b.destination.address}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold text-slate-900 tabular-nums">
                        {formatINR(b.fareBreakdown.total)}
                      </div>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {b.paymentMethod}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
