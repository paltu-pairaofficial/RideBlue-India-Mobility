import React from 'react';

export const TermsConditions: React.FC = () => {
  return (
    <div className="flex flex-col w-full py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0798F2]">
            Terms of Service
          </span>
          <h1 className="page-heading text-[#102A43] tracking-tight mt-1 mb-2">
            Terms &amp; Conditions
          </h1>
          <p className="helper-text text-slate-500">Version 1.0 · Updated October 2026</p>
        </div>

        <div className="space-y-6">
          <section className="space-y-2">
            <h2 className="card-heading text-slate-900">1. Acceptance of Terms</h2>
            <p className="body-text text-slate-700 leading-relaxed">
              By accessing the RideBlue cab booking platform or registering as a rider or driver partner, you agree to comply with these terms, operating guidelines, and all applicable laws across West Bengal, India.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="card-heading text-slate-900">2. Fare Estimation &amp; Tolling</h2>
            <p className="body-text text-slate-700 leading-relaxed">
              Fare quotes are calculated from a server-validated route and the active, administrator-configured category fare rule. Toll and airport levies are not currently included because a trusted toll-pricing provider and approved toll policy have not been configured. They must not be assumed to be included in the quoted fare.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="card-heading text-slate-900">3. Cancellation Terms &amp; Refund Policy</h2>
            <p className="body-text text-slate-700 leading-relaxed">
              Cancellation charges, eligibility windows, and refund timelines are not yet configured as production policies. No cancellation fee or refund timeline is promised by this page; the applicable policy must be approved and implemented before live bookings are enabled.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="card-heading text-slate-900">4. Driver Partner Eligibility</h2>
            <p className="body-text text-slate-700 leading-relaxed">
              Drivers must hold a valid commercial transport license and undergo document verification by RideBlue administrators. Drivers with pending, rejected, or suspended statuses are strictly barred from accepting rides on the platform.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="card-heading text-slate-900">5. Governing Law &amp; Jurisdiction</h2>
            <p className="body-text text-slate-700 leading-relaxed">
              These terms are governed by the laws of India. Any disputes arising in connection with RideBlue operations shall be subject to the exclusive jurisdiction of the courts in Kolkata, West Bengal.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
