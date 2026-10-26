import React from 'react';
import { ShieldCheck, MapPin, Users, Award, HeartHandshake, CheckCircle } from 'lucide-react';

export const AboutUs: React.FC = () => {
  return (
    <div className="flex flex-col w-full py-12 bg-[#FED8EC]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0798F2]">
            Our Story &amp; Philosophy
          </span>
          <h1 className="page-heading text-[#102A43] tracking-tight">
            About RideBlue Mobility
          </h1>
          <p className="body-text text-slate-600 leading-relaxed">
            RideBlue was founded to deliver dependable, safe, and transparent cab transportation across the cities, suburbs, and industrial corridors of West Bengal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#FFE0CC] border border-slate-200 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#E5F4FF] text-[#0798F2] flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="card-heading text-slate-900">Safety &amp; Verification First</h3>
            <p className="body-text text-slate-600 leading-relaxed">
              We do not compromise on security. Every driver undergoes document verification, commercial registration checks, and mandatory background reviews before receiving authorization to accept passenger rides.
            </p>
          </div>

          <div className="bg-[#E2F0CB] border border-slate-200 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF8E7] text-amber-600 flex items-center justify-center font-bold">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="card-heading text-slate-900">Driver Partner Respect</h3>
            <p className="body-text text-slate-600 leading-relaxed">
              We empower drivers with fair compensation, zero arbitrary cancellation penalties, transparent commission rates, and real-time earnings dashboards.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-8 space-y-4">
          <h2 className="card-heading text-[#102A43]">West Bengal Operations Hub</h2>
          <p className="body-text text-slate-600 leading-relaxed">
            Headquartered in Kolkata’s premier technology hub, Salt Lake Sector V, RideBlue is tuned specifically for the unique road conditions, toll plazas, and travel patterns accross India.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="p-4 bg-[#E5F4FF] border border-slate-200 rounded-xl text-center">
              <div className="text-lg font-bold text-[#102A43]">Kolkata</div>
              <div className="text-[11px] text-slate-500">Metro Hub</div>
            </div>
            <div className="p-4 bg-[#FFE8D6] border border-slate-200 rounded-xl text-center">
              <div className="text-lg font-bold text-[#102A43]">Howrah</div>
              <div className="text-[11px] text-slate-500">Central Terminus</div>
            </div>
            <div className="p-4 bg-[#DDF7E8] border border-slate-200 rounded-xl text-center">
              <div className="text-lg font-bold text-[#102A43]">Durgapur</div>
              <div className="text-[11px] text-slate-500">Industrial Belt</div>
            </div>
            <div className="p-4 bg-[#F3E8FF] border border-slate-200 rounded-xl text-center">
              <div className="text-lg font-bold text-[#102A43]">Siliguri</div>
              <div className="text-[11px] text-slate-500">Gateway to Hills</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
