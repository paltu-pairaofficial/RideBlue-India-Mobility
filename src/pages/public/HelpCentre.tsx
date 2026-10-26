import React from 'react';
import { Link } from 'react-router-dom';
import { LifeBuoy, FileText, Phone, MessageSquare, Shield, HelpCircle, ArrowRight } from 'lucide-react';

export const HelpCentre: React.FC = () => {
  return (
    <div className="flex flex-col w-full py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0798F2]">
            Assistance &amp; Knowledge Base
          </span>
          <h1 className="page-heading text-[#102A43] tracking-tight">
            RideBlue Help Centre
          </h1>
          <p className="body-text text-slate-600">
            Get instant guidance, raise support tickets, and resolve booking inquiries across West Bengal.
          </p>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-[#0798F2] transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#E5F4FF] text-[#0798F2] flex items-center justify-center mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="card-heading text-slate-900 mb-2">Trip Issues &amp; Refunds</h3>
            <p className="helper-text text-slate-600 leading-relaxed mb-4">
              Query airport tolls, dispute double debits, or submit refund requests for cancelled journeys.
            </p>
            <Link to="/support" className="helper-text font-bold text-[#0798F2] hover:underline flex items-center gap-1">
              <span>Raise Ticket</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-[#0798F2] transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#FFF8E7] text-amber-600 flex items-center justify-center mb-4">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <h3 className="card-heading text-slate-900 mb-2">Lost &amp; Found</h3>
            <p className="helper-text text-slate-600 leading-relaxed mb-4">
              Left a laptop, phone, or luggage in a RideBlue cab? We connect you immediately to your driver partner.
            </p>
            <Link to="/support" className="helper-text font-bold text-amber-600 hover:underline flex items-center gap-1">
              <span>Report Item</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-[#0798F2] transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="card-heading text-slate-900 mb-2">Driver Partner Support</h3>
            <p className="helper-text text-slate-600 leading-relaxed mb-4">
              Check document verification status, payout schedules, or update vehicle registration details.
            </p>
            <Link to="/driver/verification" className="helper-text font-bold text-purple-600 hover:underline flex items-center gap-1">
              <span>Check Verification</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Quick action card */}
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="card-heading">Have an ongoing ticket?</h3>
            <p className="helper-text text-slate-300 max-w-md">
              Track resolution progress or reply to support representatives on our integrated Help Desk.
            </p>
          </div>
          <Link
            to="/support"
            className="px-6 py-3 bg-[#FFE600] text-slate-950 font-bold text-xs rounded-xl shadow-md hover:bg-[#ebd300] transition-colors shrink-0"
          >
            Go to Support Desk
          </Link>
        </div>
      </div>
    </div>
  );
};
