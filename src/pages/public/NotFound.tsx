import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center py-20 px-4 text-center bg-slate-50">
      <div className="max-w-md w-full bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-xl space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#E5F4FF] text-[#0798F2] flex items-center justify-center mx-auto">
          <Compass className="w-8 h-8" />
        </div>
        <h1 className="page-heading text-[#102A43]">404 — Route Not Found</h1>
        <p className="body-text text-slate-500 leading-relaxed">
          The requested page route doesn't exist on the RideBlue platform or may have moved.
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#FFE600] text-slate-950 btn-text rounded-xl shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to RideBlue Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
