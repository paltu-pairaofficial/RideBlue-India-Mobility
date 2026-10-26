import React from 'react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="flex flex-col w-full py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0798F2]">
            Legal &amp; Privacy
          </span>
          <h1 className="page-heading text-[#102A43] tracking-tight mt-1 mb-2">
            RideBlue Privacy Policy
          </h1>
          <p className="helper-text text-slate-500">Effective Date: 9 October 2026</p>
        </div>

        <div className="space-y-6">
          <section className="space-y-2">
            <h2 className="card-heading text-slate-900">1. Information We Collect</h2>
            <p className="body-text text-slate-700 leading-relaxed">
              RideBlue collects user profile information (name, email address, phone number), journey telemetry (pickup and destination coordinates, timestamps, distance traveled), and payment transaction references. We never store raw debit or credit card CVV numbers on our servers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="card-heading text-slate-900">2. Real-Time Geolocation Usage</h2>
            <p className="body-text text-slate-700 leading-relaxed">
              When tracking active journeys or locating nearest available vehicles, RideBlue accesses device GPS coordinates strictly with your consent. Location data is shared only between the passenger and the dispatched driver partner for the duration of the trip.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="card-heading text-slate-900">3. Driver Document Verification</h2>
            <p className="body-text text-slate-700 leading-relaxed">
              Driver partners submit Commercial Driving Licenses, Vehicle Registration Certificates (RC), and insurance details. These records are retained strictly for administrative compliance under West Bengal Motor Vehicles Department guidelines and are never sold to third parties.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="card-heading text-slate-900">4. Emergency SOS Data Sharing</h2>
            <p className="body-text text-slate-700 leading-relaxed">
              Emergency dispatch integration is not currently configured. RideBlue does not claim to transmit SOS alerts or GPS data to emergency services. If you need immediate help in India, call 112 directly.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="card-heading text-slate-900">5. Contact Our Data Protection Officer</h2>
            <p className="body-text text-slate-700 leading-relaxed">
              Data-protection contact details and a verified office address have not been configured. Do not treat the sample contact information from earlier versions as operational.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
