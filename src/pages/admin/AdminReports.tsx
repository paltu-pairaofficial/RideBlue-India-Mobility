import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, MapPin, AlertCircle } from 'lucide-react';
import { useRide } from '../../context/RideContext';
import { formatINR } from '../../utils/formatters';

export const AdminReports: React.FC = () => {
  const { bookings } = useRide();

  // Compute category statistics from actual database bookings
  const { categoryStats, totalRevenue, totalCompletedTrips } = useMemo(() => {
    const completedRides = bookings.filter((b) => b.status === 'completed' && b.paymentStatus === 'paid');
    const total = completedRides.reduce((sum, b) => sum + b.fareBreakdown.total, 0);

    const categories = [
      { id: 'economy', label: 'Economy' },
      { id: 'sedan', label: 'Sedan' },
      { id: 'suv', label: 'SUV' },
      { id: 'airport_transfer', label: 'Airport Transfer' },
      { id: 'xl', label: 'XL Intercity' },
    ];

    const stats = categories.map((cat) => {
      const catRides = completedRides.filter((b) => b.vehicleCategory === cat.id);
      const rev = catRides.reduce((sum, b) => sum + b.fareBreakdown.total, 0);
      const share = completedRides.length > 0 ? Math.round((catRides.length / completedRides.length) * 100) : 0;
      return {
        category: cat.label,
        rides: catRides.length,
        sharePct: share,
        revenue: rev,
      };
    });

    return {
      categoryStats: stats,
      totalRevenue: total,
      totalCompletedTrips: completedRides.length,
    };
  }, [bookings]);

  // Compute top regional destinations from real bookings
  const regionalDemand = useMemo(() => {
    if (bookings.length === 0) {
      return [];
    }

    const hubs = [
      { name: 'Kolkata Central & Esplanade', filter: (addr: string) => /kolkata|park st|esplanade/i.test(addr) },
      { name: 'Salt Lake & New Town', filter: (addr: string) => /salt lake|bidhannagar|new town|sector v/i.test(addr) },
      { name: 'Airport (CCU)', filter: (addr: string) => /airport|ccu|dum dum/i.test(addr) },
      { name: 'Howrah Station & Suburban', filter: (addr: string) => /howrah|station/i.test(addr) },
    ];

    return hubs.map((h) => {
      const count = bookings.filter((b) => h.filter(b.pickup.address) || h.filter(b.destination.address)).length;
      const sharePct = bookings.length > 0 ? Math.round((count / bookings.length) * 100) : 0;
      return {
        region: h.name,
        count,
        share: `${sharePct}%`,
        status: count > 0 ? 'Observed in bookings' : 'No matching booking records',
      };
    });
  }, [bookings]);

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operational &amp; Financial Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time fleet category revenue, dispatch volume, and ride completion metrics from database.
          </p>
        </div>

        {/* Operational Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Gross Fares on Paid Completed Rides</span>
            <div className="text-3xl font-extrabold text-emerald-700 mt-1 tabular-nums">
              {formatINR(totalRevenue)}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">From {totalCompletedTrips} completed trips</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Platform Commission</span>
            <div className="text-2xl font-extrabold text-[#102A43] mt-1">Unavailable</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">No approved commission rule is configured.</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Total System Bookings</span>
            <div className="text-3xl font-extrabold text-[#0798F2] mt-1 tabular-nums">
              {bookings.length}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Across all statuses</span>
          </div>
        </div>

        {/* Category Revenue Breakdown */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Fleet Category Performance (Real Data)</h2>
            <span className="text-xs text-slate-400">Database-derived totals</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Vehicle Category</th>
                  <th className="py-3 px-4 font-semibold">Completed Rides</th>
                  <th className="py-3 px-4 font-semibold">Volume Share</th>
                  <th className="py-3 px-4 font-semibold text-right">Gross Passenger Fares</th>
                  <th className="py-3 px-4 font-semibold text-right">Platform Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categoryStats.map((row) => (
                  <tr key={row.category} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{row.category}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700 tabular-nums">{row.rides}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-[#0798F2] h-full rounded-full"
                            style={{ width: `${row.sharePct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">{row.sharePct}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-700 tabular-nums">
                      {formatINR(row.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-700 tabular-nums">
                      Unavailable
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalCompletedTrips === 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <span>No completed, verified-paid ride records are available yet.</span>
            </div>
          )}
        </div>

        {/* Regional Distribution */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Regional Booking Distribution</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {regionalDemand.length === 0 ? <p className="text-sm text-slate-500">No regional booking records are available yet.</p> : regionalDemand.map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#0798F2]">{item.status}</span>
                <div className="text-sm font-bold text-slate-900">{item.region}</div>
                <div className="text-xs text-slate-500 font-medium">
                  {item.count} rides ({item.share} share)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
