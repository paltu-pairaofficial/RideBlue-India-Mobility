import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../supabase/client';
import { UserRole } from '../../types';
import { AlertTriangle, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUser, isAuthenticated, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0798F2]" />
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 min-h-[50vh]">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-amber-200 shadow-lg text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="card-heading text-slate-900">Supabase Authentication Required</h2>
            <p className="helper-text text-slate-600 mt-2">
              This protected portal requires a live Supabase backend. Simulated in-memory authentication has been disabled for production security.
            </p>
            <div className="mt-4 p-3 bg-slate-50 rounded-xl text-left border border-slate-200 text-xs font-mono text-slate-700 space-y-1">
              <div>VITE_SUPABASE_URL=...</div>
              <div>VITE_SUPABASE_ANON_KEY=...</div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Set credentials in your environment variables to access this view.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/auth/sign-in" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 min-h-[50vh]">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-rose-200 shadow-lg text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="card-heading text-slate-900">Access Denied</h2>
            <p className="helper-text text-slate-600 mt-2">
              Your account (<span className="font-semibold text-slate-800">{currentUser.email}</span>) has role <span className="font-semibold uppercase text-slate-800">{currentUser.role}</span>. You do not have permission to access this section.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
