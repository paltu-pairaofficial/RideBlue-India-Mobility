import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Edit3, Plus, Plane } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../supabase/client';

type LevyRule = {
  id: string; airport_code: string; airport_name: string; match_terms: string[]; journey_type: 'pickup' | 'dropoff' | 'either';
  vehicle_category: string | null; levy_amount: number; taxable: boolean; active: boolean; version: number;
  effective_from: string; effective_until: string | null; updated_at: string;
};
type Draft = {
  id?: string; airport_code: string; airport_name: string; match_terms: string; journey_type: 'pickup' | 'dropoff' | 'either';
  vehicle_category: string; levy_amount: string; taxable: boolean; active: boolean; effective_from: string; effective_until: string;
};
const categories = ['', 'economy', 'sedan', 'suv', 'xl', 'airport_transfer'];
const blank = (): Draft => ({ airport_code: '', airport_name: '', match_terms: '', journey_type: 'either', vehicle_category: '', levy_amount: '', taxable: false, active: false, effective_from: new Date().toISOString().slice(0, 16), effective_until: '' });
const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

export const AirportLevyConfiguration: React.FC = () => {
  const [rules, setRules] = useState<LevyRule[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) { setError('Supabase is not configured. Airport levy rules cannot be loaded.'); setLoading(false); return; }
    setLoading(true);
    const { data, error: queryError } = await supabase.from('airport_levy_rules').select('*').order('airport_name');
    if (queryError) { setRules([]); setError(`Airport levy rules could not be loaded: ${queryError.message}. Apply migration 06 after reviewing it.`); }
    else { setRules((data || []) as LevyRule[]); setError(null); }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const edit = (rule?: LevyRule) => {
    setError(null); setSuccess(null);
    if (!rule) { setDraft(blank()); return; }
    setDraft({ id: rule.id, airport_code: rule.airport_code, airport_name: rule.airport_name, match_terms: rule.match_terms.join(', '), journey_type: rule.journey_type, vehicle_category: rule.vehicle_category || '', levy_amount: String(rule.levy_amount), taxable: rule.taxable, active: rule.active, effective_from: rule.effective_from.slice(0, 16), effective_until: rule.effective_until ? rule.effective_until.slice(0, 16) : '' });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft || !supabase) return;
    setError(null); setSuccess(null);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) { setError('Sign in again before saving airport levy rules.'); return; }
    const terms = [...new Set(draft.match_terms.split(',').map((term) => term.trim().toLowerCase()).filter((term) => term.length >= 3))];
    const amount = Number(draft.levy_amount);
    const start = new Date(draft.effective_from);
    const end = draft.effective_until ? new Date(draft.effective_until) : null;
    if (!draft.airport_code.trim() || !draft.airport_name.trim() || terms.length === 0 || !Number.isFinite(amount) || amount < 0 || !Number.isFinite(start.getTime()) || (end && (!Number.isFinite(end.getTime()) || end <= start))) {
      setError('Enter an airport code and name, at least one matching address term (3+ characters), an approved non-negative levy, and valid effective dates.'); return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = { airport_code: draft.airport_code.trim().toUpperCase(), airport_name: draft.airport_name.trim(), match_terms: terms, journey_type: draft.journey_type, vehicle_category: draft.vehicle_category || null, levy_amount: amount, taxable: draft.taxable, active: draft.active, effective_from: start.toISOString(), effective_until: end?.toISOString() || null, updated_by: sessionData.session.user.id };
    if (draft.id) payload.id = draft.id;
    const { error: saveError } = await supabase.from('airport_levy_rules').upsert(payload, { onConflict: 'id' });
    setSaving(false);
    if (saveError) { setError(`Rule was not saved: ${saveError.message}. Only an authorized administrator can change these rules.`); return; }
    setDraft(null); setSuccess('Airport levy rule saved. New quotes will use it only while it is active and within its effective dates.'); await load();
  };

  return <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5">
    <div className="flex items-center gap-3"><Plane className="w-6 h-6 text-[#0798F2]"/><div><h2 className="text-xl font-bold text-slate-900">Airport levy policy</h2><p className="text-sm text-slate-500 mt-1">Configure approved levies separately from road tolls. No sample airport or rate is preloaded.</p></div></div>
    {loading && <p role="status" className="text-sm text-slate-500">Loading airport levy rules…</p>}
    {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
    {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{success}</p>}
    {!loading && !error && rules.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">No airport levy rules are configured. Airport-transfer bookings without a determinable applicable rule will require administrator verification.</div>}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{rules.map((rule) => <article key={rule.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex justify-between gap-3"><div><h3 className="font-bold text-slate-900">{rule.airport_name} ({rule.airport_code})</h3><p className="mt-1 text-xs text-slate-500">Version {rule.version} · {rule.journey_type} · {rule.vehicle_category || 'all vehicle categories'}</p></div><span className={`h-fit rounded-full px-2 py-1 text-xs font-bold ${rule.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{rule.active ? 'Active' : 'Inactive'}</span></div><p className="mt-3 text-sm">Approved levy: <strong>{money(Number(rule.levy_amount))}</strong> · {rule.taxable ? 'Taxable per configured fare tax rate' : 'Not taxable under this rule'}</p><p className="mt-1 text-xs text-slate-500">Address match terms: {rule.match_terms.join(', ')}</p><p className="mt-1 text-xs text-slate-500">Effective {new Date(rule.effective_from).toLocaleString()} {rule.effective_until ? `to ${new Date(rule.effective_until).toLocaleString()}` : 'with no end date'}</p><button type="button" onClick={() => edit(rule)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:border-[#0798F2]"><Edit3 className="h-4 w-4"/>Edit rule</button></article>)}</div>
    <button type="button" onClick={() => edit()} className="inline-flex items-center gap-2 rounded-xl bg-[#0798F2] px-5 py-3 text-sm font-bold text-white hover:bg-[#087fca]"><Plus className="h-4 w-4"/>Add airport levy rule</button>
    {draft && <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-200 p-5"><h3 className="font-bold text-slate-900">{draft.id ? 'Edit' : 'Create'} airport levy rule</h3><p className="text-xs text-slate-500">Only enter a business-approved rate. Address matching uses terms from the server-validated address; add specific terms to avoid accidental matches.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{([{key:'airport_code',label:'Airport code'},{key:'airport_name',label:'Airport name'},{key:'match_terms',label:'Address match terms (comma-separated)'},{key:'levy_amount',label:'Approved levy amount (₹)'}] as const).map(({key,label}) => <label key={key} className="block text-xs font-semibold text-slate-700">{label}<input required value={draft[key]} onChange={(e) => setDraft({...draft,[key]:e.target.value})} type={key==='levy_amount'?'number':'text'} min={key==='levy_amount'?'0':undefined} step={key==='levy_amount'?'0.01':undefined} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal"/></label>)}
      <label className="block text-xs font-semibold text-slate-700">Journey endpoint<select value={draft.journey_type} onChange={(e) => setDraft({...draft,journey_type:e.target.value as Draft['journey_type']})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal"><option value="either">Pickup or drop-off</option><option value="pickup">Airport pickup only</option><option value="dropoff">Airport drop-off only</option></select></label>
      <label className="block text-xs font-semibold text-slate-700">Vehicle category<select value={draft.vehicle_category} onChange={(e) => setDraft({...draft,vehicle_category:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal">{categories.map((c) => <option key={c} value={c}>{c ? c.replace('_',' ') : 'All categories'}</option>)}</select></label>
      <label className="block text-xs font-semibold text-slate-700">Effective from<input type="datetime-local" required value={draft.effective_from} onChange={(e) => setDraft({...draft,effective_from:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal"/></label>
      <label className="block text-xs font-semibold text-slate-700">Effective until (optional)<input type="datetime-local" value={draft.effective_until} onChange={(e) => setDraft({...draft,effective_until:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal"/></label></div>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={draft.taxable} onChange={(e) => setDraft({...draft,taxable:e.target.checked})}/>Apply the configured fare tax rate to this levy</label>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({...draft,active:e.target.checked})}/>Activate after saving</label>
      <div className="flex gap-3"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#0798F2] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : <><CheckCircle2 className="h-4 w-4"/>Save rule</>}</button><button type="button" disabled={saving} onClick={() => setDraft(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button></div>
    </form>}
  </section>;
};
