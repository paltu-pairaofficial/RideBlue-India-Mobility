import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, CheckCircle, Navigation, Shield, Award, ArrowRight, UserCheck, Car, HelpCircle } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rider' | 'driver'>('rider');

  return (
    <div className="flex flex-col w-full py-12 bg-[#DDF7E8]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0798F2]">
            Step by Step Guide
          </span>
          <h1 className="page-heading text-[#102A43] tracking-tight mt-2 mb-4">
            How RideBlue Operates
          </h1>
          <p className="body-text text-slate-600">
            A seamless experience engineered for passengers and driver partners.
          </p>

          {/* Role Tab Selector */}
          <div className="mt-8 inline-flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('rider')}
              className={`px-6 py-2 btn-text rounded-lg transition-all duration-300 ${activeTab === 'rider'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:bg-[#0798F2] hover:text-white'
                }`}
            >
              For Passengers
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('driver')}
              className={`px-6 py-2 btn-text rounded-lg transition-all duration-300 ${activeTab === 'driver'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:bg-[#0798F2] hover:text-white'
                }`}
            >
              For Driver Partners
            </button>
          </div>
        </div>

        {/* Tab 1: Rider Workflow */}
        {activeTab === 'rider' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#E5F4FF] text-[#0798F2] font-bold flex items-center justify-center">
                  1
                </div>
                <h3 className="card-heading text-slate-900">Enter Journey Details</h3>
                <p className="body-text text-slate-600 leading-relaxed">
                  Type your pickup address or use device GPS. Add intermediate stops if picking up friends along the route.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#E5F4FF] text-[#0798F2] font-bold flex items-center justify-center">
                  2
                </div>
                <h3 className="card-heading text-slate-900">Review Fare Itemization</h3>
                <p className="body-text text-slate-600 leading-relaxed">
                  Compare Economy, Sedan, SUV, or Airport Transfer. See transparent base rates, toll charges, taxes, and apply coupons.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#E5F4FF] text-[#0798F2] font-bold flex items-center justify-center">
                  3
                </div>
                <h3 className="card-heading text-slate-900">Choose Online or Cash Payment</h3>
                <p className="body-text text-slate-600 leading-relaxed">
                  Payment options and dispatch rules will be shown once the approved production booking and payment flow is configured.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#E5F4FF] text-[#0798F2] font-bold flex items-center justify-center">
                  4
                </div>
                <h3 className="card-heading text-slate-900">Track &amp; Rate Ride</h3>
                <p className="body-text text-slate-600 leading-relaxed">
                  View vehicle license plate, driver details, estimated arrival time, and download official tax receipts.
                </p>
              </div>
            </div>

            <div className="text-center pt-4">
              <Link
                to="/rider/book"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#FFE600] text-slate-950 btn-text rounded-xl shadow-md hover:bg-[#0798F2] hover:text-white hover:shadow-lg transition-all duration-300"
              >
                <span>Try Booking a Ride</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Tab 2: Driver Partner Workflow */}
        {activeTab === 'driver' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF8E7] text-amber-600 font-bold flex items-center justify-center">
                  1
                </div>
                <h3 className="card-heading text-slate-900">Submit Application &amp; Documents</h3>
                <p className="body-text text-slate-600 leading-relaxed">
                  Submit your West Bengal Commercial Driving License, Vehicle RC, Insurance certificate, and PUC.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF8E7] text-amber-600 font-bold flex items-center justify-center">
                  2
                </div>
                <h3 className="card-heading text-slate-900">Admin Document Verification</h3>
                <p className="body-text text-slate-600 leading-relaxed">
                  RideBlue administrators verify documents for safety compliance. Pending drivers cannot accept rides until approved.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF8E7] text-amber-600 font-bold flex items-center justify-center">
                  3
                </div>
                <h3 className="card-heading text-slate-900">Toggle Availability &amp; Accept Rides</h3>
                <p className="body-text text-slate-600 leading-relaxed">
                  Go online when you wish to drive. Inspect incoming trip requests with pickup distance and fare before accepting.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF8E7] text-amber-600 font-bold flex items-center justify-center">
                  4
                </div>
                <h3 className="card-heading text-slate-900">Transparent Weekly Payouts</h3>
                <p className="body-text text-slate-600 leading-relaxed">
                  Driver earnings and payout timing will be shown after an approved commission rule and verified earnings ledger are configured.
                </p>
              </div>
            </div>

            <div className="text-center pt-4">
              <Link
                to="/driver/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0798F2] text-white btn-text rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <span>Apply as Driver Partner</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
