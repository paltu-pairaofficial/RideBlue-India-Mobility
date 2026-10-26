import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Car, ArrowRight, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const PublicNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-[#102A43] whitespace-nowrap shrink-0 group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0798F2] flex items-center justify-center text-white shadow-md shadow-[#0798F2]/30 group-hover:scale-105 transition-transform">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 11 2 11.3V16c0 .6.4 1 1 1h2"></path>
              <circle cx="7" cy="17" r="2"></circle>
              <path d="M9 17h6"></path>
              <circle cx="17" cy="17" r="2"></circle>
            </svg>
          </div>
          <span className="font-bold text-2xl tracking-tight text-slate-900">
            Ride<span className="text-[#0798F2]">Blue</span>
          </span>
        </Link>

        {/* Zone 2: Navigation Links (Single-line, unboxed, hover underline) */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
          <Link to="/"  className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
            Home
          </Link>
          <Link to="/services" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
            Services
          </Link>
          <Link to="/how-it-works"  className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
            How It Works
          </Link>
          <Link to="/about"  className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
            About Us
          </Link>
          <Link to="/contact"  className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
            Contact
          </Link>
          <Link to="/faq" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
            FAQ
          </Link>
        </nav>

        {/* Zone 3: Actions (Sign In + Primary Yellow CTA) */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {currentUser ? (
            <Link
              to={`/${currentUser.role}/dashboard`}
              className="btn-text text-slate-700 hover:text-[#0798F2] px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              {currentUser.role === 'admin' ? 'Admin Portal' : currentUser.role === 'driver' ? 'Driver Console' : 'My Account'}
            </Link>
          ) : (
            <Link
              to="/auth/sign-in"
              className="btn-text text-slate-700 hover:text-[#0798F2] px-3.5 py-2 transition-colors whitespace-nowrap"
            >
              Sign In
            </Link>
          )}

          <Link
            to="/rider/book"
            className="px-5 py-2.5 btn-text text-slate-950 bg-[#FFE600] hover:bg-[#0798F2]  hover:text-white active:scale-95 transition-all rounded-xl shadow-sm hover:shadow whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <span>Book a Ride</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex sm:hidden items-center gap-2">
          <Link
            to="/rider/book"
            className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-[#FFE600] rounded-lg shadow-sm"
          >
            Book
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <div className="flex flex-col space-y-2 text-sm font-medium text-slate-700">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              Home
            </Link>
            <Link
              to="/services"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              Services
            </Link>
            <Link
              to="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              How It Works
            </Link>
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              About Us
            </Link>
            <Link
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              Contact
            </Link>
            <Link
              to="/faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              FAQ
            </Link>
            <Link
              to="/help-centre"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              Help Centre
            </Link>
          </div>

          <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
            <Link
              to="/auth/sign-in"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-xl"
            >
              Sign In
            </Link>
            <Link
              to="/rider/book"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-xs font-bold text-slate-950 bg-[#FFE600] rounded-xl"
            >
              Book a Ride
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
