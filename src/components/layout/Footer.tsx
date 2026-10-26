import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Shield, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#605d65] text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Brand & Mission Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0798F2] flex items-center justify-center text-white font-bold text-lg shadow-md">
                RB
              </div>
              <span className="font-bold text-2xl tracking-tight text-white">
                Ride<span className="text-[#0798F2]">Blue</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed text-white">
              RideBlue is a premier cab booking and fleet management platform serving riders, drivers, and corporate commuters across India. Transparent fares, verified drivers, and reliable journeys.
            </p>
            <div className="pt-2 flex flex-col gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#0798F2] shrink-0" />
                <span>Salt Lake Sector V, Bidhannagar, Kolkata, WB 700091</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#0798F2] shrink-0" />
                <span>Support Helpline: +91 33 2980 1200</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#0798F2] shrink-0" />
                <div className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
                  <span>paltupaira@gmail.com</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Explore RideBlue</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Riders & Drivers Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Riders &amp; Drivers</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/rider/book" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
                  Book a Cab
                </Link>
              </li>
              <li>
                <Link to="/rider/dashboard" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
                  Rider Dashboard
                </Link>
              </li>
              <li>
                <Link to="/driver/register" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
                  Drive with RideBlue
                </Link>
              </li>
              <li>
                <Link to="/driver/dashboard" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
                  Driver Console
                </Link>
              </li>
              <li>
                <Link to="/driver/verification" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
                  Verification Status
                </Link>
              </li>
              <li>
                <Link to="/admin/dashboard" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
                  Admin Management
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Trust &amp; Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/help-centre" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
                  Help Centre
                </Link>
              </li>
              <li>
                <Link to="/support" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
                  Support Desk
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
                  Terms &amp; Conditions
                </Link>
              </li>

            </ul>
          </div>
        </div>

        {/* Bottom Bar with Notice */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1" >
            <p>© {new Date().getFullYear()} RideBlue Mobility Technologies Pvt. Ltd. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>All India Service Territory</span>

            <span>·</span>
            <Link to="/privacy" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
              Privacy
            </Link>
            <span>·</span>
            <Link to="/terms" className="hover:bg-[#0798F2] hover:text-white transition-colors rounded-md px-2 py-1">
              Terms
            </Link>

          </div>
        </div>
      </div>
    </footer>
  );
};
