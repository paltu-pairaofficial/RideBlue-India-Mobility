
import React from "react";
import { ShieldCheck, UsersRound, MapPin } from "lucide-react";

const features = [
  {
    label: "Safe Rides",
    Icon: ShieldCheck,
    bg: "bg-[#BFE4FF]",
    color: "text-[#087CF0]",
  },
  {
    label: "Trusted Drivers",
    Icon: UsersRound,
    bg: "bg-[#FFE5A3]",
    color: "text-[#725326]",
  },
  {
    label: "Across India",
    Icon: MapPin,
    bg: "bg-[#BDF3DF]",
    color: "text-[#075B50]",
  },
];

const ContactHeroBanner: React.FC = () => {
  return (
    <section className="w-full px-4 py-8 sm:px-6 lg:px-10">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl shadow-xl">
        <img
          src="/rideblue_assets/rideblue-contact-banner.png"
          alt="RideBlue car beside a city waterfront at sunset"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#FFF8D9]/95 via-[#FFF8D9]/75 to-transparent" />

        <div className="relative z-10 flex min-h-[380px] items-center px-6 py-12 sm:min-h-[440px] sm:px-10 md:px-14 lg:min-h-[500px]">
          <div className="max-w-2xl">
            <p className="mb-5 flex items-center gap-3 text-sm font-bold uppercase tracking-[0.3em] text-[#0798F2]">
              <span className="h-1 w-12 rounded-full bg-[#0798F2]" />
              RideBlue
            </p>

            <h2 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-[#082B59] sm:text-5xl md:text-6xl lg:text-7xl">
              Journeys
              <br />
              That Keep
              <br />
              <span className="text-[#087CF0]">
                India Moving.
              </span>
            </h2>

            <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-700 sm:text-lg md:text-xl">
              Safe rides. Trusted drivers. Smarter journeys.
              <br className="hidden sm:block" />
              With you, every mile.
            </p>

            {/* Circular feature icons */}
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
              {features.map(({ label, Icon, bg, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-3"
                >
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${bg}`}
                  >
                    <Icon
                      className={`h-7 w-7 ${color}`}
                      strokeWidth={2.5}
                    />
                  </div>

                  <span className="max-w-24 text-sm font-semibold leading-snug text-[#082B59]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactHeroBanner;
