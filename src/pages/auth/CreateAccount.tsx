import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../supabase/client';

export const CreateAccount: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'rider' | 'driver'>('rider');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setError('All fields are mandatory.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await signUp(name, email, phone, password, role);
      if (result.needsEmailConfirmation) {
        setError('Account created. Check your email and confirm your address before signing in.');
      } else if (result.role === 'driver') {
        navigate('/driver/register');
      } else {
        navigate('/rider/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account.');
    } finally { setLoading(false); }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#0798F2] flex items-center justify-center text-white font-bold text-lg shadow-md">
              RB
            </div>
            <span className="font-bold text-2xl tracking-tight text-slate-900">
              Ride<span className="text-[#0798F2]">Blue</span>
            </span>
          </Link>
          <h1 className="page-heading text-slate-900">Create an Account</h1>
          <p className="body-text text-slate-500">
            Sign up for effortless cab bookings or register as a driver partner.
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl helper-text text-amber-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Supabase Authentication Required</strong>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Registration requires active Supabase environment credentials (<code className="font-mono">VITE_SUPABASE_URL</code> and <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>).
              </p>
            </div>
          </div>
        )}

        {/* Account Role Selector (Admin is strictly barred from public creation) */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setRole('rider')}
            className={`py-2 btn-text rounded-lg transition-colors ${
              role === 'rider'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Passenger Account
          </button>
          <button
            type="button"
            onClick={() => setRole('driver')}
            className={`py-2 btn-text rounded-lg transition-colors ${
              role === 'driver'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Driver Partner
          </button>
        </div>

        {role === 'driver' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl helper-text text-amber-800 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Driver partners require Admin document verification (Commercial DL &amp; RC) prior to accepting rides.
            </span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 helper-text text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="form-label text-slate-700 block mb-1">
              Full Legal Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sourav Mondal"
                required
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20 focus:border-[#0798F2]"
              />
            </div>
          </div>

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
                placeholder="sourav@example.com"
                required
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20 focus:border-[#0798F2]"
              />
            </div>
          </div>

          <div>
            <label className="form-label text-slate-700 block mb-1">
              Mobile Phone
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98300 00000"
                required
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20 focus:border-[#0798F2]"
              />
            </div>
          </div>

          <div>
            <label className="form-label text-slate-700 block mb-1">
              Create Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20 focus:border-[#0798F2]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#FFE600] hover:bg-[#ebd300] text-slate-950 btn-text rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <span>Creating account...</span>
            ) : (
              <>
                <span>Register with RideBlue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <p className="helper-text text-slate-500">
            Already registered?{' '}
            <Link to="/auth/sign-in" className="font-bold text-[#0798F2] hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
