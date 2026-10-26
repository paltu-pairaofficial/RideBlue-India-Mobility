import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  User,
  LogOut,
  ChevronDown,
  Car,
  Shield,
  LifeBuoy,
  CheckCircle,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { UserRole } from '../../types';

export const AuthenticatedNavbar: React.FC = () => {
  const { currentUser, currentRole, signOut } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">

      {/* Main Top Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-8 h-8 rounded-lg bg-[#0798F2] flex items-center justify-center text-white font-bold text-base shadow group-hover:scale-105 transition-transform">
            RB
          </div>
          <span className="font-bold text-xl text-slate-900 tracking-tight">
            Ride<span className="text-[#0798F2]">Blue</span>
          </span>
          <span className="ml-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            {currentRole}
          </span>
        </Link>

        {/* Role Specific Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
          {currentRole === 'rider' && (
            <>
              <Link
                to="/rider/dashboard"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/rider/dashboard')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Overview
              </Link>
              <Link
                to="/rider/book"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/rider/book')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Book a Ride
              </Link>
              <Link
                to="/rider/active"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/rider/active')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Active Rides
              </Link>
              <Link
                to="/rider/upcoming"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/rider/upcoming')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Upcoming
              </Link>
              <Link
                to="/rider/history"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/rider/history')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                History
              </Link>
              <Link
                to="/rider/saved-places"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/rider/saved-places')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Saved Places
              </Link>
              <Link
                to="/rider/payments"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/rider/payments')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Payments
              </Link>
            </>
          )}

          {currentRole === 'driver' && (
            <>
              <Link
                to="/driver/dashboard"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/driver/dashboard')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Overview
              </Link>
              <Link
                to="/driver/requests"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/driver/requests')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Requests &amp; Live Feed
              </Link>
              <Link
                to="/driver/active-trip"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/driver/active-trip')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Active Trip
              </Link>
              <Link
                to="/driver/completed-trips"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/driver/completed-trips')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Completed Trips
              </Link>
              <Link
                to="/driver/earnings"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/driver/earnings')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Earnings &amp; Ratings
              </Link>
              <Link
                to="/driver/documents"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/driver/documents')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Vehicle Documents
              </Link>
              <Link
                to="/driver/verification"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/driver/verification')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Verification Status
              </Link>
            </>
          )}

          {currentRole === 'admin' && (
            <>
              <Link
                to="/admin/dashboard"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/admin/dashboard')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Overview
              </Link>
              <Link
                to="/admin/bookings"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/admin/bookings')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Bookings
              </Link>
              <Link
                to="/admin/driver-approvals"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/admin/driver-approvals')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Driver Approvals
              </Link>
              <Link
                to="/admin/riders"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/admin/riders')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Riders
              </Link>
              <Link
                to="/admin/fares"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/admin/fares')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Vehicles &amp; Fares
              </Link>
              <Link
                to="/admin/promotions"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/admin/promotions')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Promos
              </Link>
              <Link
                to="/admin/tickets"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/admin/tickets')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Support Tickets
              </Link>
              <Link
                to="/admin/reports"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/admin/reports')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Reports
              </Link>
              <Link
                to="/admin/settings"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive('/admin/settings')
                    ? 'bg-[#E5F4FF] text-[#0798F2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Settings
              </Link>
            </>
          )}
        </nav>

        {/* Right Action Icons: Notification Bell + Profile Menu */}
        <div className="flex items-center gap-3">
          {/* Support quick link */}
          <Link
            to="/support"
            className="p-2 text-slate-600 hover:text-[#0798F2] hover:bg-slate-100 rounded-lg transition-colors"
            title="Help & Support Desk"
          >
            <LifeBuoy className="w-5 h-5" />
          </Link>

          {/* Notification Bell with Badge */}
          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              className="relative p-2 text-slate-600 hover:text-[#0798F2] hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notifDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900">
                    Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-[11px] text-[#0798F2] hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                    <Link
                      to="/notifications"
                      onClick={() => setNotifDropdownOpen(false)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 font-medium"
                    >
                      View all
                    </Link>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        markAsRead(item.id);
                        if (item.link) {
                          navigate(item.link);
                          setNotifDropdownOpen(false);
                        }
                      }}
                      className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                        !item.read ? 'bg-[#E5F4FF]/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-semibold text-slate-900">{item.title}</div>
                        {!item.read && <span className="w-2 h-2 rounded-full bg-[#0798F2] shrink-0 mt-1" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{item.message}</p>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No notifications yet
                    </div>
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                  <Link
                    to="/notifications"
                    onClick={() => setNotifDropdownOpen(false)}
                    className="text-xs font-semibold text-[#0798F2] hover:underline"
                  >
                    Open Notifications Centre &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Account Menu */}
          <div ref={userRef} className="relative">
            <button
              type="button"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 p-1.5 pl-2 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            >
              <div className="w-7 h-7 rounded-lg bg-[#E5F4FF] text-[#0798F2] flex items-center justify-center font-bold text-xs">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <span className="text-xs font-semibold text-slate-800 hidden sm:inline max-w-[100px] truncate">
                {currentUser?.name?.split(' ')[0]}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 divide-y divide-slate-100">
                <div className="px-3 py-2">
                  <div className="text-xs font-bold text-slate-900">{currentUser?.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{currentUser?.email}</div>
                  <div className="text-[10px] text-[#0798F2] font-semibold mt-0.5 uppercase tracking-wide">
                    Role: {currentRole}
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    to={currentRole === 'rider' ? '/rider/profile' : currentRole === 'driver' ? '/driver/profile' : '/admin/settings'}
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    to="/support"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    <LifeBuoy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Help &amp; Support</span>
                  </Link>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      setUserDropdownOpen(false);
                      navigate('/');
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
