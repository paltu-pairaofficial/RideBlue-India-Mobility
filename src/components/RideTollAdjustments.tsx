import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, ReceiptText } from 'lucide-react';
import { supabase } from '../supabase/client';

type TollRow = { id: string; ride_id: string; amount: number; details: string; recording_source: string; source_reference: string | null; verification_status: 'pending_verification' | 'verified' | 'settled' | 'rejected'; created_at: string; verified_at: string | null; settled_at: string | null };
type Props = { rideId: string; role: 'rider' | 'driver' | 'admin' };
const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
const apiBase = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const RideTollAdjustments: React.FC<Props> = ({ rideId, role }) => {
  const [rows, setRows] = useState<TollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [details, setDetails] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());

  const load = useCallback(async () => {
    if (!supabase) { setError('Supabase is not configured. Toll records are unavailable.'); setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data, error: queryError } = await supabase.from('ride_toll_adjustments').select('id,ride_id,amount,details,recording_source,source_reference,verification_status,created_at,verified_at,settled_at').eq('ride_id', rideId).order('created_at', { ascending: false });
    if (queryError) { setRows([]); setError(`Toll adjustments could not be loaded: ${queryError.message}. Confirm migration 06 has been applied.`); }
    else { setRows((data || []) as TollRow[]); setError(null); }
    setLoading(false);
  }, [rideId]);

  useEffect(() => { void load(); if (!supabase) return; const channel = supabase.channel(`ride-tolls-${rideId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'ride_toll_adjustments', filter: `ride_id=eq.${rideId}` }, () => { void load(); }).subscribe(); return () => { if (supabase) void supabase.removeChannel(channel); }; }, [load, rideId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || details.trim().length < 3) { setError('Enter a positive actual toll amount and a short description.'); return; }
    setSaving(true); setError(null);
    try {
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (sessionError || !token) throw new Error('Sign in again before recording a toll.');
      const response = await fetch(`${apiBase}/api/rides/${rideId}/tolls`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ amount: value, details: details.trim(), recordingSource: sourceReference.trim() ? 'verified_receipt' : 'driver_report', sourceReference: sourceReference.trim() || null, idempotencyKey: requestKey }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Toll adjustment could not be recorded.');
      setAmount(''); setDetails(''); setSourceReference(''); setRequestKey(crypto.randomUUID()); await load();
    } catch (e: any) { setError(e?.message || 'Toll adjustment could not be recorded.'); }
    finally { setSaving(false); }
  };

  const review = async (id: string, decision: 'verified' | 'rejected') => {
    if (!supabase) return;
    setSaving(true); setError(null);
    try {
      const { data: session, error: sessionError } = await supabase.auth.getSession(); const token = session.session?.access_token;
      if (sessionError || !token) throw new Error('Sign in again before reviewing toll adjustments.');
      const response = await fetch(`${apiBase}/api/tolls/${id}/verify`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ decision }) });
      const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || 'Toll review failed.'); await load();
    } catch (e: any) { setError(e?.message || 'Toll review failed.'); }
    finally { setSaving(false); }
  };

  const pending = rows.filter((row) => row.verification_status === 'pending_verification').reduce((sum, row) => sum + Number(row.amount), 0);
  const verified = rows.filter((row) => ['verified', 'settled'].includes(row.verification_status)).reduce((sum, row) => sum + Number(row.amount), 0);
  const settled = rows.filter((row) => row.verification_status === 'settled').reduce((sum, row) => sum + Number(row.amount), 0);
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3"><div className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-[#0798F2]"/><h3 className="font-bold text-sm text-slate-900">Actual toll adjustments</h3></div>
    <div className="grid grid-cols-3 gap-2 text-xs"><div className="rounded-xl bg-amber-50 p-2"><span className="block text-amber-800">Pending</span><strong className="text-amber-950">{money(pending)}</strong></div><div className="rounded-xl bg-sky-50 p-2"><span className="block text-sky-800">Verified</span><strong className="text-sky-950">{money(verified)}</strong></div><div className="rounded-xl bg-emerald-50 p-2"><span className="block text-emerald-800">Settled</span><strong className="text-emerald-950">{money(settled)}</strong></div></div>
    {loading && <p role="status" className="text-xs text-slate-500">Loading toll records…</p>}
    {error && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">{error}</p>}
    {!loading && !error && rows.length === 0 && <p className="text-xs text-slate-500">No toll adjustments have been recorded for this ride.</p>}
    {rows.map((row) => <div key={row.id} className="rounded-xl border border-slate-100 p-3 text-xs"><div className="flex items-start justify-between gap-3"><div><strong className="text-slate-900">{money(Number(row.amount))}</strong><p className="mt-1 text-slate-600">{row.details}</p><p className="mt-1 text-slate-400">{new Date(row.created_at).toLocaleString()} · {row.recording_source.replace('_', ' ')}</p>{row.source_reference && <p className="mt-1 text-slate-500">Reference: {row.source_reference}</p>}</div><span className={`shrink-0 rounded-full px-2 py-1 font-bold ${row.verification_status === 'pending_verification' ? 'bg-amber-50 text-amber-800' : row.verification_status === 'rejected' ? 'bg-rose-50 text-rose-800' : row.verification_status === 'settled' ? 'bg-emerald-50 text-emerald-800' : 'bg-sky-50 text-sky-800'}`}>{row.verification_status.replaceAll('_', ' ')}</span></div>
      {role === 'admin' && row.verification_status === 'pending_verification' && <div className="mt-3 flex gap-2"><button type="button" disabled={saving} onClick={() => void review(row.id, 'verified')} className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white disabled:opacity-50"><CheckCircle2 className="mr-1 inline h-3 w-3"/>Verify</button><button type="button" disabled={saving} onClick={() => void review(row.id, 'rejected')} className="rounded-lg border border-rose-200 px-3 py-1.5 font-bold text-rose-700 disabled:opacity-50">Reject</button></div>}
    </div>)}
    {role === 'driver' && <form onSubmit={submit} className="space-y-2 border-t border-slate-100 pt-3"><p className="flex items-start gap-1.5 text-xs text-slate-600"><CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0"/>Record the actual toll paid. It remains pending until an administrator verifies the receipt or details.</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><label className="text-xs font-semibold text-slate-700">Actual amount (₹)<input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"/></label><label className="text-xs font-semibold text-slate-700">Receipt/reference (optional)<input value={sourceReference} onChange={(e) => setSourceReference(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"/></label></div><label className="block text-xs font-semibold text-slate-700">Details<input required minLength={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Toll plaza / route details" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"/></label><button type="submit" disabled={saving} className="rounded-lg bg-[#0798F2] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Record actual toll'}</button></form>}
    <p className="text-[11px] text-slate-500">Tolls are separate from the quoted ride fare. Pending or verified tolls are not automatically collected and do not count as paid fare or settled earnings.</p>
  </section>;
};
