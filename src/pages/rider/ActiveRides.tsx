import React from 'react';
import { Link } from 'react-router-dom';
import { Navigation, Clock, MapPin, Phone, ShieldAlert, ArrowRight } from 'lucide-react';
import { useRide } from '../../context/RideContext';
import { formatINR, getRideStatusConfig } from '../../utils/formatters';
import { RideTollAdjustments } from '../../components/RideTollAdjustments';

export const ActiveRides: React.FC = () => {
  const { bookings } = useRide();
  const activeRides = bookings.filter((b) =>
    ['requested', 'accepted', 'driver_arriving', 'in_progress'].includes(b.status)
  );

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        <div>
          <h1 className="page-heading text-slate-900">Active Rides</h1>
          <p className="body-text text-slate-500 mt-0.5">
            Monitor trips currently dispatched, driver arriving, or in transit.
          </p>
        </div>

        {activeRides.length > 0 ? (
          <div className="space-y-4">
            {activeRides.map((b) => {
              const statusCfg = getRideStatusConfig(b.status);
              return (
                <div
                  key={b.id}
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4 relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{b.bookingCode}</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${statusCfg.badgeClass}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-600">
                      Vehicle: <span className="text-slate-900 font-bold">{b.vehicleModel} ({b.vehiclePlate})</span>
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
                        <span className="text-slate-500">Driver Partner:</span>
                        <span className="font-bold text-slate-800">{b.driverName || 'Driver details unavailable'}{b.driverRating == null ? '' : ` (★ ${b.driverRating})`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Distance &amp; Fare:</span>
                        <span className="font-bold text-slate-800">{b.distanceKm} km · {formatINR(b.fareBreakdown.total)}</span>
                      </div>
                      {Number(b.fareBreakdown.airportLevyAmount || 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">Airport levy (included separately):</span><span className="font-semibold text-slate-800">{formatINR(Number(b.fareBreakdown.airportLevyAmount))}</span></div>}
                      <div className="flex justify-between">
                        <span className="text-slate-500">Payment:</span>
                        <span className="font-semibold text-slate-800 capitalize">{b.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  <RideTollAdjustments rideId={b.id} role="rider" />

                  <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                    <Link
                      to={`/rider/tracking/${b.id}`}
                      className="px-6 py-2.5 bg-[#0798F2] hover:bg-[#0570B5] text-white btn-text rounded-xl shadow-md transition-colors flex items-center gap-1.5"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Open Live GPS Tracking &rarr;</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4">
            <Navigation className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="card-heading text-slate-800">No Active Trips at this Moment</h3>
            <p className="body-text text-slate-500 max-w-sm mx-auto">
              You do not have any journeys in progress right now. Book an instant cab across India.
            </p>
            <Link
              to="/rider/book"
              className="inline-block px-6 py-2.5 bg-[#FFE600] text-slate-950 btn-text rounded-xl shadow-sm"
            >
              Book a Ride
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
