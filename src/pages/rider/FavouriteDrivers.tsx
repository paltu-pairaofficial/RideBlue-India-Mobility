import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, ShieldCheck, Phone, Car, ArrowRight, Heart } from 'lucide-react';
import { useRide } from '../../context/RideContext';

export const FavouriteDrivers: React.FC = () => {
  const { drivers, riderProfile, toggleFavouriteDriver } = useRide();
  const [actionError, setActionError] = useState<string | null>(null);
  const favourites = drivers.filter((d) => riderProfile.favouriteDrivers.includes(d.id));

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div>
          <h1 className="page-heading text-slate-900">Favourite Drivers</h1>
          <p className="body-text text-slate-500 mt-0.5">
            Favourite-driver storage is not connected to Supabase yet. No local-only favourites are shown.
          </p>
        </div>

        {actionError && <div role="alert" className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-900">{actionError}</div>}

        {favourites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {favourites.map((drv) => (
              <div
                key={drv.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#E5F4FF] text-[#0798F2] font-bold text-xl flex items-center justify-center">
                      {drv.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="card-heading text-slate-900">{drv.name}</h3>
                      <div className="helper-text text-slate-500">{drv.vehicleModel}</div>
                      <div className="text-[11px] font-bold text-slate-700 mt-0.5">{drv.vehicleNumber}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { try { toggleFavouriteDriver(drv.id); } catch (error) { setActionError(error instanceof Error ? error.message : 'Favourite driver changes are unavailable.'); } }}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                    title="Remove from favorites"
                  >
                    <Heart className="w-5 h-5 fill-rose-500" />
                  </button>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl helper-text flex justify-between items-center">
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{drv.rating} Rating</span>
                  </div>
                  <span className="text-slate-500">{drv.totalTrips} Trips Completed</span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {drv.isOnline ? 'Online in Kolkata' : 'Offline'}
                  </span>
                  <Link
                    to="/rider/book"
                    className="btn-text text-[#0798F2] hover:underline flex items-center gap-1"
                  >
                    <span>Request Trip</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4">
            <Heart className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="card-heading text-slate-800">No Favourite Drivers Saved</h3>
            <p className="body-text text-slate-500 max-w-sm mx-auto">
              After enjoying a ride, star your driver to save them to your preferred dispatch pool.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
