import React from 'react';
import { useLocation } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { AuthenticatedNavbar } from './AuthenticatedNavbar';
import { Footer } from './Footer';
import { useAuth } from '../../context/AuthContext';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, currentRole } = useAuth();

  // Determine whether to use Authenticated or Public Navbar
  const isAuthRoute = location.pathname.startsWith('/auth/');
  const isDashboardRoute =
    location.pathname.startsWith('/rider') ||
    location.pathname.startsWith('/driver') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/notifications') ||
    location.pathname.startsWith('/support');

  const showAuthenticatedNav = isDashboardRoute;

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      {/* Header Selection */}
      {showAuthenticatedNav ? <AuthenticatedNavbar /> : <PublicNavbar />}

      {/* Main Page Content */}
      <main className="flex-1 flex flex-col">{children}</main>

      {/* Footer */}
      <Footer />
    </div>
  );
};
