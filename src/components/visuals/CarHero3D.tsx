import React from 'react';
import { Shield, Sparkles, Navigation, Clock } from 'lucide-react';

export const CarHero3D: React.FC = () => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 lg:p-6 select-none">
      {/* Background radial atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#E5F4FF] via-[#FFF8E7]/40 to-[#E5F4FF]/30 rounded-3xl -z-10" />

      {/* Decorative subtle speed / road lines */}
      <div className="absolute bottom-12 left-6 right-6 h-1 bg-gradient-to-r from-transparent via-[#0798F2]/20 to-transparent rounded-full" />
      <div className="absolute bottom-10 left-16 right-16 h-0.5 bg-gradient-to-r from-transparent via-[#FFE600]/40 to-transparent rounded-full" />

      {/* Main 3D Styled Vehicle Illustration */}
      <div className="relative w-full max-w-lg lg:max-w-xl transition-transform duration-300 hover:scale-[1.02]">
        <svg
          viewBox="0 0 900 480"
          className="w-full h-auto drop-shadow-2xl"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Metallic body gradient */}
            <linearGradient id="bodyBlueGrad" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#2BB0FF" />
              <stop offset="35%" stopColor="#0798F2" />
              <stop offset="70%" stopColor="#0570B5" />
              <stop offset="100%" stopColor="#0B3C68" />
            </linearGradient>

            {/* Roof / Glass gradient */}
            <linearGradient id="glassGrad" x1="0%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#E2F2FF" stopOpacity="0.85" />
              <stop offset="40%" stopColor="#8CCBFA" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#1B3854" stopOpacity="0.9" />
            </linearGradient>

            {/* Chrome reflection gradient */}
            <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="50%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#FFFFFF" />
            </linearGradient>

            {/* Rim gradient */}
            <radialGradient id="rimGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="45%" stopColor="#94A3B8" />
              <stop offset="85%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0F172A" />
            </radialGradient>

            {/* Shadow under car */}
            <radialGradient id="carShadow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#000000" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ground contact shadow */}
          <ellipse cx="450" cy="420" rx="380" ry="38" fill="url(#carShadow)" />

          {/* Car Main Body Group */}
          <g transform="translate(40, 40)">
            {/* Aerodynamic Sedan Silhouette */}
            {/* Lower chassis / skirt */}
            <path
              d="M 120 330 L 710 330 C 730 330 750 315 765 290 L 780 260 C 790 240 780 230 760 230 L 700 230 C 685 185 640 140 540 130 L 330 130 C 230 140 170 200 130 240 L 70 250 C 50 255 45 280 60 295 L 90 325 Z"
              fill="url(#bodyBlueGrad)"
            />

            {/* Upper Cabin & Roofline */}
            <path
              d="M 235 220 L 330 140 C 350 125 400 120 520 120 C 600 120 630 135 660 175 L 705 220 Z"
              fill="#0F172A"
            />

            {/* Glass Greenhouse (Front & Rear Windows) */}
            {/* Front windshield */}
            <path
              d="M 245 215 L 335 145 C 345 138 380 132 460 132 L 460 215 Z"
              fill="url(#glassGrad)"
            />
            {/* Rear passenger window */}
            <path
              d="M 470 132 C 550 132 595 140 645 185 L 685 215 L 470 215 Z"
              fill="url(#glassGrad)"
            />

            {/* B-pillar & C-pillar accents */}
            <line x1="465" y1="130" x2="465" y2="218" stroke="#102A43" strokeWidth="12" />
            <line x1="335" y1="140" x2="245" y2="215" stroke="#FFFFFF" strokeWidth="3" opacity="0.4" />

            {/* Characteristic Dynamic Side Swage Line (Upper shoulder) */}
            <path
              d="M 80 250 Q 400 210 770 235"
              fill="none"
              stroke="#80CAFF"
              strokeWidth="5"
              opacity="0.85"
            />

            {/* RideBlue Brand Deco Stripe on Body (Crisp White + Accent Yellow) */}
            <path
              d="M 170 265 L 630 265 L 610 273 L 180 273 Z"
              fill="#FFFFFF"
              opacity="0.95"
            />
            <path
              d="M 635 265 L 690 265 L 670 273 L 625 273 Z"
              fill="#FFE600"
            />

            {/* Headlights (Modern Dual LED matrix projector) */}
            <path
              d="M 68 255 L 115 250 C 120 265 110 280 85 285 Z"
              fill="#E0F2FE"
              stroke="#38BDF8"
              strokeWidth="2"
            />
            {/* Headlight beam glow */}
            <polygon points="68,255 10,230 10,310 85,285" fill="#38BDF8" opacity="0.12" />

            {/* Tail lights */}
            <path
              d="M 760 240 L 780 245 C 785 258 775 270 755 270 Z"
              fill="#EF4444"
              stroke="#B91C1C"
              strokeWidth="2"
            />

            {/* Front Wheel Arch & Wheel */}
            <g transform="translate(200, 310)">
              {/* Fender cutout */}
              <circle cx="0" cy="0" r="76" fill="#0B132B" />
              {/* Outer Tire */}
              <circle cx="0" cy="0" r="72" fill="#1E293B" stroke="#0F172A" strokeWidth="8" />
              {/* Alloy Rim */}
              <circle cx="0" cy="0" r="50" fill="url(#rimGrad)" />
              {/* Rim spokes (Diamond Cut) */}
              <line x1="-42" y1="0" x2="42" y2="0" stroke="url(#chromeGrad)" strokeWidth="8" />
              <line x1="0" y1="-42" x2="0" y2="42" stroke="url(#chromeGrad)" strokeWidth="8" />
              <line x1="-30" y1="-30" x2="30" y2="30" stroke="url(#chromeGrad)" strokeWidth="6" />
              <line x1="-30" y1="30" x2="30" y2="-30" stroke="url(#chromeGrad)" strokeWidth="6" />
              {/* Center Cap with Blue Hub */}
              <circle cx="0" cy="0" r="16" fill="#0798F2" stroke="#FFFFFF" strokeWidth="3" />
            </g>

            {/* Rear Wheel Arch & Wheel */}
            <g transform="translate(620, 310)">
              {/* Fender cutout */}
              <circle cx="0" cy="0" r="76" fill="#0B132B" />
              {/* Outer Tire */}
              <circle cx="0" cy="0" r="72" fill="#1E293B" stroke="#0F172A" strokeWidth="8" />
              {/* Alloy Rim */}
              <circle cx="0" cy="0" r="50" fill="url(#rimGrad)" />
              {/* Rim spokes (Diamond Cut) */}
              <line x1="-42" y1="0" x2="42" y2="0" stroke="url(#chromeGrad)" strokeWidth="8" />
              <line x1="0" y1="-42" x2="0" y2="42" stroke="url(#chromeGrad)" strokeWidth="8" />
              <line x1="-30" y1="-30" x2="30" y2="30" stroke="url(#chromeGrad)" strokeWidth="6" />
              <line x1="-30" y1="30" x2="30" y2="-30" stroke="url(#chromeGrad)" strokeWidth="6" />
              {/* Center Cap with Blue Hub */}
              <circle cx="0" cy="0" r="16" fill="#0798F2" stroke="#FFFFFF" strokeWidth="3" />
            </g>

            {/* Door handle details */}
            <rect x="350" y="235" width="36" height="7" rx="3.5" fill="#E2E8F0" stroke="#0798F2" strokeWidth="1" />
            <rect x="520" y="235" width="36" height="7" rx="3.5" fill="#E2E8F0" stroke="#0798F2" strokeWidth="1" />

            {/* Aerodynamic Side mirror */}
            <path
              d="M 275 210 L 250 205 C 240 205 235 215 245 222 L 270 222 Z"
              fill="#0798F2"
              stroke="#0570B5"
              strokeWidth="2"
            />
            {/* Mirror glass reflection */}
            <ellipse cx="255" cy="214" rx="10" ry="5" fill="#BAE6FD" />

            {/* Roof Mount Modern Smart Cab Beacon (Sleek low-profile) */}
            <path
              d="M 430 116 L 490 116 C 495 116 498 122 492 125 L 434 125 C 428 122 430 116 430 116 Z"
              fill="#FFE600"
              stroke="#0B3C68"
              strokeWidth="2"
            />
            {/* RideBlue text on beacon */}
            <text x="444" y="123" fill="#111111" fontSize="7" fontWeight="bold" fontFamily="sans-serif">
              BLUE
            </text>
          </g>
        </svg>

        {/* Floating Trust Information Card (as allowed by the spec) */}
        <div className="absolute -bottom-2 -left-2 sm:bottom-4 sm:left-4 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3.5 shadow-xl flex items-center gap-3 max-w-xs transition-transform duration-200 hover:-translate-y-0.5">
          <div className="w-10 h-10 rounded-xl bg-[#E5F4FF] text-[#0798F2] flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>Verified RideBlue Fleet</span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">WB Approved</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
              Driver approval is required before accepting ride requests
            </p>
          </div>
        </div>

        {/* Floating Average Pickup Time Card */}
        <div className="absolute -top-2 -right-2 sm:top-4 sm:right-4 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3 shadow-lg flex items-center gap-2.5 transition-transform duration-200 hover:-translate-y-0.5">
          <div className="w-8 h-8 rounded-lg bg-[#FFF8E7] text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Avg Pickup</div>
            <div className="text-xs font-bold text-slate-900 tabular-nums">4 – 7 Mins</div>
          </div>
        </div>
      </div>
    </div>
  );
};
