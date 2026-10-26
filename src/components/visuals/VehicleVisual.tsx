import React from 'react';
import { VehicleCategoryType } from '../../types';

interface VehicleVisualProps {
  category: VehicleCategoryType;
  className?: string;
}

export const VehicleVisual: React.FC<VehicleVisualProps> = ({ category, className = 'w-full h-32' }) => {
  switch (category) {
    case 'economy':
      return (
        <div className={`relative flex items-center justify-center p-2 rounded-xl bg-gradient-to-br from-[#E5F4FF]/50 to-white ${className}`}>
          <svg viewBox="0 0 280 140" className="w-full h-full max-h-28" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="140" cy="120" rx="100" ry="12" fill="#000000" fillOpacity="0.12" />
            {/* Compact Hatchback */}
            <path
              d="M 50 100 L 230 100 C 238 100 245 92 242 80 L 235 68 C 230 58 220 55 200 55 L 140 45 C 105 45 85 65 65 72 L 45 78 C 38 82 38 92 45 98 Z"
              fill="#0798F2"
            />
            {/* Windows */}
            <path d="M 100 68 L 138 52 L 138 72 L 90 74 Z" fill="#E0F2FE" />
            <path d="M 144 52 L 195 58 L 190 74 L 144 74 Z" fill="#E0F2FE" />
            {/* Wheels */}
            <circle cx="85" cy="100" r="18" fill="#1E293B" />
            <circle cx="85" cy="100" r="10" fill="#94A3B8" />
            <circle cx="195" cy="100" r="18" fill="#1E293B" />
            <circle cx="195" cy="100" r="10" fill="#94A3B8" />
            {/* Headlight & Door */}
            <rect x="42" y="80" width="8" height="6" rx="2" fill="#FFE600" />
            <line x1="140" y1="52" x2="140" y2="98" stroke="#0570B5" strokeWidth="1.5" />
          </svg>
        </div>
      );

    case 'sedan':
      return (
        <div className={`relative flex items-center justify-center p-2 rounded-xl bg-gradient-to-br from-[#E5F4FF]/50 to-white ${className}`}>
          <svg viewBox="0 0 280 140" className="w-full h-full max-h-28" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="140" cy="120" rx="110" ry="12" fill="#000000" fillOpacity="0.12" />
            {/* Executive Sedan */}
            <path
              d="M 40 100 L 240 100 C 248 100 252 92 246 82 L 230 72 C 220 65 210 65 195 65 L 175 48 C 165 42 145 42 110 44 L 85 58 C 70 65 55 75 42 80 C 35 84 35 95 40 100 Z"
              fill="#0798F2"
            />
            {/* Roof styling */}
            <path d="M 90 58 L 115 46 L 170 48 L 190 65 Z" fill="#0B3C68" />
            {/* Windows */}
            <path d="M 95 62 L 128 50 L 128 68 L 88 70 Z" fill="#BAE6FD" />
            <path d="M 134 50 L 168 50 L 182 66 L 134 68 Z" fill="#BAE6FD" />
            {/* Wheels */}
            <circle cx="78" cy="100" r="19" fill="#1E293B" />
            <circle cx="78" cy="100" r="11" fill="#E2E8F0" stroke="#0798F2" strokeWidth="2" />
            <circle cx="205" cy="100" r="19" fill="#1E293B" />
            <circle cx="205" cy="100" r="11" fill="#E2E8F0" stroke="#0798F2" strokeWidth="2" />
            {/* Headlight & Taillight */}
            <rect x="36" y="82" width="9" height="6" rx="2" fill="#FFE600" />
            <rect x="242" y="80" width="6" height="6" rx="1" fill="#EF4444" />
          </svg>
        </div>
      );

    case 'suv':
      return (
        <div className={`relative flex items-center justify-center p-2 rounded-xl bg-gradient-to-br from-[#E5F4FF]/50 to-white ${className}`}>
          <svg viewBox="0 0 280 140" className="w-full h-full max-h-28" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="140" cy="122" rx="115" ry="13" fill="#000000" fillOpacity="0.14" />
            {/* Roof rail */}
            <line x1="95" y1="36" x2="200" y2="36" stroke="#475569" strokeWidth="3" />
            <line x1="110" y1="36" x2="110" y2="40" stroke="#475569" strokeWidth="2" />
            <line x1="185" y1="36" x2="185" y2="40" stroke="#475569" strokeWidth="2" />
            {/* Tall SUV Body */}
            <path
              d="M 40 100 L 245 100 C 252 100 255 90 248 80 L 235 60 C 230 50 220 42 205 40 L 110 40 C 95 40 85 52 70 65 L 45 74 C 36 78 35 90 40 100 Z"
              fill="#102A43"
            />
            {/* Side Accent */}
            <path d="M 50 78 L 240 76 L 235 80 L 52 82 Z" fill="#0798F2" />
            {/* Windows */}
            <path d="M 80 62 L 108 45 L 140 45 L 140 66 L 75 66 Z" fill="#BAE6FD" />
            <path d="M 146 45 L 195 45 L 210 66 L 146 66 Z" fill="#BAE6FD" />
            {/* Heavy-duty wheels */}
            <circle cx="82" cy="100" r="22" fill="#0F172A" />
            <circle cx="82" cy="100" r="13" fill="#64748B" />
            <circle cx="205" cy="100" r="22" fill="#0F172A" />
            <circle cx="205" cy="100" r="13" fill="#64748B" />
            {/* Headlight */}
            <rect x="36" y="78" width="10" height="7" rx="2" fill="#38BDF8" />
          </svg>
        </div>
      );

    case 'xl':
      return (
        <div className={`relative flex items-center justify-center p-2 rounded-xl bg-gradient-to-br from-[#E5F4FF]/50 to-white ${className}`}>
          <svg viewBox="0 0 280 140" className="w-full h-full max-h-28" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="140" cy="122" rx="120" ry="13" fill="#000000" fillOpacity="0.14" />
            {/* Long MPV / XL Van Silhouette */}
            <path
              d="M 35 102 L 255 102 C 262 102 265 92 258 78 L 246 52 C 240 42 225 38 210 38 L 105 38 C 92 38 80 50 68 62 L 40 72 C 32 76 30 90 35 102 Z"
              fill="#0F172A"
            />
            {/* Body stripe */}
            <line x1="42" y1="78" x2="252" y2="78" stroke="#FFE600" strokeWidth="2.5" />
            {/* 3 Window segments */}
            <rect x="75" y="44" width="48" height="22" rx="3" fill="#93C5FD" />
            <rect x="130" y="44" width="50" height="22" rx="3" fill="#93C5FD" />
            <path d="M 186 44 L 225 44 L 235 66 L 186 66 Z" fill="#93C5FD" />
            {/* Wheels */}
            <circle cx="75" cy="102" r="21" fill="#1E293B" />
            <circle cx="75" cy="102" r="12" fill="#94A3B8" />
            <circle cx="215" cy="102" r="21" fill="#1E293B" />
            <circle cx="215" cy="102" r="12" fill="#94A3B8" />
          </svg>
        </div>
      );

    case 'airport_transfer':
    default:
      return (
        <div className={`relative flex items-center justify-center p-2 rounded-xl bg-gradient-to-br from-[#E5F4FF]/50 to-white ${className}`}>
          <svg viewBox="0 0 280 140" className="w-full h-full max-h-28" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="140" cy="120" rx="110" ry="12" fill="#000000" fillOpacity="0.12" />
            {/* Airport Transfer Sedan with Luggage & Plane Silhouette Emblem */}
            <path
              d="M 40 100 L 240 100 C 248 100 252 92 246 82 L 230 72 C 220 65 210 65 195 65 L 175 48 C 165 42 145 42 110 44 L 85 58 C 70 65 55 75 42 80 C 35 84 35 95 40 100 Z"
              fill="#0798F2"
            />
            {/* Windows */}
            <path d="M 95 62 L 128 50 L 128 68 L 88 70 Z" fill="#BAE6FD" />
            <path d="M 134 50 L 168 50 L 182 66 L 134 68 Z" fill="#BAE6FD" />
            {/* Airplane icon on door */}
            <g transform="translate(136, 76) scale(0.65)">
              <path d="M 2 12 L 22 2 L 18 14 L 26 17 L 24 22 L 16 19 L 10 26 L 8 24 L 11 17 Z" fill="#FFFFFF" />
            </g>
            {/* Wheels */}
            <circle cx="78" cy="100" r="19" fill="#1E293B" />
            <circle cx="78" cy="100" r="11" fill="#E2E8F0" />
            <circle cx="205" cy="100" r="19" fill="#1E293B" />
            <circle cx="205" cy="100" r="11" fill="#E2E8F0" />
            {/* Airport Transfer Yellow Badge on roof */}
            <polygon points="120,44 160,44 155,38 125,38" fill="#FFE600" />
          </svg>
        </div>
      );
  }
};
