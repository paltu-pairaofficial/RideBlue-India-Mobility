import React from 'react';
import { Link } from 'react-router-dom';
import { Plane, Building2, MapPin, ShieldCheck, Clock, ArrowRight } from 'lucide-react';
import { VEHICLE_CATEGORIES } from '../../data/vehicleCategories';
import { VehicleVisual } from '../../components/visuals/VehicleVisual';

export const Services: React.FC = () => {
  return (
    <div className="flex flex-col w-full py-12 bg-[#F3E8FF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="max-w-3xl">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0798F2]">
            Comprehensive Mobility Solutions
          </span>
          <h1 className="page-heading text-[#102A43] tracking-tight mt-2 mb-4">
            RideBlue Services Across India
          </h1>
          <p className="body-text text-slate-600 leading-relaxed">
            From convenient city rides and airport transfers to long-distance highway journeys connecting destinations across India.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* 1. City Commutes */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-[#0798F2] transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#E5F4FF] text-[#0798F2] flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6" />
            </div>

            <h3 className="card-heading text-slate-900 mb-2">
              City Commutes
            </h3>

            <p className="helper-text text-slate-600 leading-relaxed mb-4">
              Convenient point-to-point rides for daily commutes, shopping trips,
              business meetings, and everyday travel within your city.
            </p>

            <div className="text-xs font-semibold text-[#0798F2]">
              From ₹14/km
            </div>
          </div>

          {/* 2. Airport Transfers */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-[#0798F2] transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#FFF8E7] text-amber-600 flex items-center justify-center mb-4">
              <Plane className="w-6 h-6" />
            </div>

            <h3 className="card-heading text-slate-900 mb-2">
              Airport Transfers
            </h3>

            <p className="helper-text text-slate-600 leading-relaxed mb-4">
              Convenient airport pickups and drop-offs with advance booking
              options for smoother, more comfortable airport journeys.
            </p>

            <div className="text-xs font-semibold text-amber-600">
              Flexible Booking Options
            </div>
          </div>

          {/* 3. Intercity Highway Trips */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-[#0798F2] transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h3 className="card-heading text-slate-900 mb-2">
              Intercity Highway Trips
            </h3>

            <p className="helper-text text-slate-600 leading-relaxed mb-4">
              Comfortable long-distance journeys connecting cities and towns
              across India, with vehicle options suited to your travel needs.
            </p>

            <div className="text-xs font-semibold text-emerald-600">
              Sedan &amp; SUV Options
            </div>
          </div>

          {/* 4. Corporate Fleet */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-[#0798F2] transition-colors">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6" />
            </div>

            <h3 className="card-heading text-slate-900 mb-2">
              Corporate Fleet
            </h3>

            <p className="helper-text text-slate-600 leading-relaxed mb-4">
              Flexible business travel solutions for corporate teams, employee
              commutes, client meetings, and recurring transportation needs.
            </p>

            <div className="text-xs font-semibold text-purple-600">
              Business Travel Solutions
            </div>
          </div>

        </div>

        {/* Detailed Vehicle Category Breakdown */}
        <div className="space-y-6">
          <div>
            <h2 className="page-heading text-[#102A43]">Vehicle Class Specifications</h2>
            <p className="helper-text text-slate-500 mt-1">
              Authoritative parameters for all 5 RideBlue vehicle tiers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {VEHICLE_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <VehicleVisual category={cat.id} className="w-full h-28 mb-4" />
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="card-heading text-slate-900">{cat.name}</h3>
                    <span className="text-xs font-semibold text-[#0798F2] bg-[#E5F4FF] px-2.5 py-0.5 rounded-full">
                      Capacity set by active fare rules
                    </span>
                  </div>
                  <p className="helper-text text-slate-600 mb-4">{cat.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Base Fare:</span>
                    <span className="font-bold text-slate-900 tabular-nums">—</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Per Kilometer:</span>
                    <span className="font-bold text-slate-900 tabular-nums">—</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Per Minute:</span>
                    <span className="font-bold text-slate-900 tabular-nums">Unavailable</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Luggage Capacity:</span>
                    <span className="font-medium text-slate-800">{cat.luggage}</span>
                  </div>
                  <div className="pt-3">
                    <Link
                      to="/rider/book"
                      className="w-full py-2.5 bg-slate-900 hover:bg-[#0798F2] text-white btn-text rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Book {cat.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
