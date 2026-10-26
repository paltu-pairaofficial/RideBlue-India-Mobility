import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../supabase/client';

export const AdminSignIn: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Please provide your email and password.'); return; }
    setLoading(true); setError(null);
    try {
      const actualRole = await signIn(email, password);
      if (actualRole !== 'admin') {
        await Promise.resolve();
        setError('This account is not authorized for Admin access. Please use the correct sign-in page.');
        return;
      }
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect email or password. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#0798F2] flex items-center justify-center text-white font-bold text-lg shadow-md">RB</div>
            <span className="font-bold text-2xl tracking-tight text-slate-900">Ride<span className="text-[#0798F2]">Blue</span></span>
          </Link>
          <h1 className="page-heading text-slate-900">Administrator Login</h1>
          <p className="body-text text-slate-500">Secure sign-in for authorized RideBlue administrators.</p>
        </div>

        {!isSupabaseConfigured && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl helper-text text-amber-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Supabase Authentication Required</strong>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Administrator sign-in requires valid Supabase environment credentials (<code className="font-mono">VITE_SUPABASE_URL</code> and <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>).
              </p>
            </div>
          </div>
        )}
        <form onSubmit={handleSignIn} className="space-y-4">
          {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 helper-text text-rose-700 font-medium">{error}</div>}
          <div>
            <label className="form-label text-slate-700 block mb-1">Email Address</label>
            <div className="relative"><Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="username" required className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20 focus:border-[#0798F2]" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1"><label className="form-label text-slate-700">Password</label><Link to="/auth/forgot-password" className="helper-text text-[#0798F2] hover:underline font-medium">Forgot password?</Link></div>
            <div className="relative"><Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" autoComplete="current-password" required className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20 focus:border-[#0798F2]" />
              <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-[#FFE600] hover:bg-[#ebd300] active:scale-[0.99] text-slate-950 btn-text rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60">{loading ? 'Signing in...' : <><span>Sign In as Admin</span><ArrowRight className="w-4 h-4" /></>}</button>
        </form>
        <div className="text-center pt-2 border-t border-slate-100"><p className="helper-text text-slate-500">Administrator access only. Public admin registration is disabled.</p></div>
        <div className="text-center"><Link to="/auth/sign-in" className="helper-text text-[#0798F2] hover:underline">General sign-in</Link></div>
      </div>
    </div>
  );
};
