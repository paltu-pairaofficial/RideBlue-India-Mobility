import React, { useState } from 'react';
import { ChevronDown, Search, HelpCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const FAQ_ITEMS = [
  {
    category: 'Booking & Trips',
    q: 'How do I book a cab across West Bengal on RideBlue?',
    a: 'You can book directly from the homepage or dedicated Book a Ride page. Enter your pickup address and destination, choose your vehicle class (Economy, Sedan, SUV, XL, or Airport Transfer), review the transparent fare estimate, and confirm your booking. No app installation is required.',
  },
  {
    category: 'Booking & Trips',
    q: 'Can I add intermediate stops for multiple passengers?',
    a: 'Yes! In the RideBlue booking screen, click "+ Add Stop" to specify intermediate waypoints. Fares and travel time update dynamically along the optimized road path.',
  },
  {
    category: 'Fares & Payments',
    q: 'How are fares calculated? Are there hidden toll charges?',
    a: 'RideBlue calculates fares using base fare + per-kilometer distance rate + per-minute duration rate + 5% GST. If your journey crosses toll roads (such as Vidyasagar Setu or airport toll booths), the charge is clearly itemized prior to trip confirmation. There are no sudden surge shocks.',
  },
  {
    category: 'Fares & Payments',
    q: 'Are cash and online payments treated equally?',
    a: 'Yes. Payment options and dispatch eligibility depend on the payment methods currently configured in RideBlue. Drivers cannot decline your ride based on payment method.',
  },
  {
    category: 'Cancellation & Safety',
    q: 'What is the RideBlue cancellation policy?',
    a: 'Cancellation eligibility is checked against the stored booking status. Production cancellation-fee rules are not configured, so no unapproved fee policy is represented here.',
  },
  {
    category: 'Cancellation & Safety',
    q: 'How does the Emergency SOS feature work?',
    a: 'Emergency dispatch is not currently integrated. If you are in immediate danger in India, call 112 directly; do not rely on RideBlue to contact responders.',
  },
  {
    category: 'Driver Partners',
    q: 'How do drivers get approved on RideBlue?',
    a: 'Driver partners must submit their valid West Bengal Commercial Driving License, Vehicle Registration Certificate (RC), commercial insurance, and Pollution Under Control (PUC) certificate. An administrator thoroughly verifies these documents before the driver is authorized to accept rides.',
  },
];

export const FAQ: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const categories = ['All', 'Booking & Trips', 'Fares & Payments', 'Cancellation & Safety', 'Driver Partners'];

  const filtered = FAQ_ITEMS.filter((item) => {
    const matchesSearch =
      item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col w-full py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0798F2]">
            Answers &amp; Clarity
          </span>
          <h1 className="page-heading text-[#102A43] tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="body-text text-slate-600">
            Find immediate answers regarding booking procedures, fare calculations, driver onboarding, and safety protocols.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative max-w-md mx-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions (e.g. airport toll, cancellation)..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20"
          />
        </div>

        {/* Filter categories */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#102A43] text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-colors"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
              >
                <span className="card-heading text-slate-900">{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
                    openIndex === idx ? 'rotate-180 text-[#0798F2]' : ''
                  }`}
                />
              </button>
              {openIndex === idx && (
                <div className="px-5 pb-4 pt-1 body-text text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                  {item.a}
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-8 text-center helper-text text-slate-500 bg-slate-50 rounded-2xl">
              No questions found matching your search. Try different keywords or submit a support ticket from your account.
            </div>
          )}
        </div>

        {/* Still have questions banner */}
        <div className="p-6 rounded-2xl bg-[#E5F4FF]/50 border border-[#0798F2]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="card-heading text-[#102A43]">Still have questions?</h3>
            <p className="helper-text text-slate-600">Support hours and response times have not been configured. Authenticated users can submit a support ticket.</p>
          </div>
          <Link
            to="/support"
            className="px-4 py-2.5 bg-[#0798F2] text-white btn-text rounded-xl hover:bg-[#0570B5] transition-colors whitespace-nowrap"
          >
            Open Support Ticket
          </Link>
        </div>
      </div>
    </div>
  );
};
