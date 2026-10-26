import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../supabase/client';

export const DriverSignUp: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setMessage(null);
    if (!name.trim() || !email.trim() || !phone.trim() || !password) { setError('All fields are mandatory.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const result = await signUp(name, email, phone, password, 'driver');
      if (result.needsEmailConfirmation) {
        setMessage('Account created. If email confirmation is enabled, check your inbox before signing in.');
      } else {
        navigate('/driver/register');
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create your account.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 mb-2"><div className="w-10 h-10 rounded-xl bg-[#0798F2] flex items-center justify-center text-white font-bold text-lg shadow-md">RB</div><span className="font-bold text-2xl tracking-tight text-slate-900">Ride<span className="text-[#0798F2]">Blue</span></span></Link>
          <h1 className="page-heading text-slate-900">Register as a Driver Partner</h1><p className="body-text text-slate-500">Create your driver account to start the verification process.</p>
        </div>

        {!isSupabaseConfigured && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl helper-text text-amber-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Supabase Authentication Required</strong>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Driver registration requires active Supabase environment credentials (<code className="font-mono">VITE_SUPABASE_URL</code> and <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>).
              </p>
            </div>
          </div>
        )}
        <p className="helper-text text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">Driver accounts may require document verification and admin approval before accepting rides.</p>
        <form onSubmit={handleRegister} className="space-y-4">
          {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 helper-text text-rose-700">{error}</div>}
          {message && <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 helper-text text-emerald-800">{message}</div>}
          <div><label className="form-label text-slate-700 block mb-1">Full Name</label><div className="relative"><User className="w-4 h-4 text-slate-400 absolute left-3 top-3"/><input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" required placeholder="Your full name" className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20 focus:border-[#0798F2]"/></div></div>
          <div><label className="form-label text-slate-700 block mb-1">Email Address</label><div className="relative"><Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3"/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com" className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20 focus:border-[#0798F2]"/></div></div>
          <div><label className="form-label text-slate-700 block mb-1">Mobile Phone</label><div className="relative"><Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3"/><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel" required placeholder="+91 98300 00000" className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20 focus:border-[#0798F2]"/></div></div>
          <div><label className="form-label text-slate-700 block mb-1">Create Password</label><div className="relative"><Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3"/><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} minLength={6} autoComplete="new-password" required placeholder="At least 6 characters" className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20 focus:border-[#0798F2]"/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'} className="absolute right-3 top-3 text-slate-400">{showPassword?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button></div></div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-[#FFE600] hover:bg-[#ebd300] text-slate-950 btn-text rounded-xl shadow-md flex items-center justify-center gap-2 disabled:opacity-60">{loading?'Creating account...':<>Register as Driver Partner<ArrowRight className="w-4 h-4"/></>}</button>
        </form>
        <div className="text-center pt-2 border-t border-slate-100"><p className="helper-text text-slate-500">Already registered? <Link to="/driver/sign-in" className="font-bold text-[#0798F2] hover:underline">Sign in</Link></p><p className="helper-text mt-2"><Link to="/auth/forgot-password" className="text-[#0798F2] hover:underline">Forgot password?</Link></p></div>
      </div>
    </div>
  );
};
