import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { requestPasswordReset } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setLoading(true);
    try { await requestPasswordReset(email); setSent(true); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not send recovery email.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        <div className="text-center space-y-2">
          <h1 className="page-heading text-slate-900">Forgot Password</h1>
          <p className="body-text text-slate-500">
            Enter your registered RideBlue email address to receive password recovery instructions.
          </p>
        </div>

        {sent ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="card-heading text-slate-900">Recovery Link Dispatched</h3>
            <p className="helper-text text-slate-600">
              If an account exists for <strong>{email}</strong>, Supabase will send password reset instructions. Open the link in that email to set a new password.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/auth/sign-in"
                className="helper-text text-slate-500 hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 helper-text text-rose-700 font-medium">{error}</div>}
            <div>
              <label className="form-label text-slate-700 block mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#FFE600] hover:bg-[#ebd300] text-slate-950 btn-text rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Sending...' : 'Send Recovery Link'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <Link
                to="/auth/sign-in"
                className="inline-flex items-center gap-1.5 helper-text text-slate-600 hover:text-slate-900 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
