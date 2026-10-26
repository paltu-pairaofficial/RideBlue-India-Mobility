import React, { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../supabase/client';

type PlatformSetting = { setting_key: string; setting_value: unknown; updated_at: string };

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refundPolicyEnabled, setRefundPolicyEnabled] = useState(false);
  const [refundPolicyText, setRefundPolicyText] = useState('');
  const [refundPolicyMax, setRefundPolicyMax] = useState('');
  const [savingRefundPolicy, setSavingRefundPolicy] = useState(false);
  const [refundPolicyMessage, setRefundPolicyMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setError('Supabase is not configured. Platform settings are unavailable.');
        setLoading(false);
        return;
      }
      const { data, error: queryError } = await supabase.from('platform_settings').select('setting_key, setting_value, updated_at').order('setting_key');
      if (cancelled) return;
      if (queryError) {
        setError(`Platform settings could not be loaded: ${queryError.message}. Apply migration 04 and sign in as an authorized administrator.`);
        setSettings([]);
      } else {
        const rows = (data || []) as PlatformSetting[];
        setSettings(rows);
        const policy = rows.find((row) => row.setting_key === 'refund_policy')?.setting_value as any;
        setRefundPolicyEnabled(policy?.enabled === true);
        setRefundPolicyText(typeof policy?.policy_text === 'string' ? policy.policy_text : '');
        setRefundPolicyMax(policy?.max_refund_amount == null ? '' : String(policy.max_refund_amount));
        setError(null);
      }
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const saveRefundPolicy = async () => {
    if (!supabase) { setRefundPolicyMessage('Supabase is not configured.'); return; }
    const policyText = refundPolicyText.trim();
    const maxAmount = refundPolicyMax.trim() === '' ? null : Number(refundPolicyMax);
    if (refundPolicyEnabled && policyText.length < 20) {
      setRefundPolicyMessage('Document the approved refund policy in at least 20 characters before enabling refunds.');
      return;
    }
    if (maxAmount !== null && (!Number.isFinite(maxAmount) || maxAmount <= 0)) {
      setRefundPolicyMessage('Maximum refund amount must be blank or a positive approved amount.');
      return;
    }
    setSavingRefundPolicy(true); setRefundPolicyMessage(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Sign in again before changing refund policy.');
      const { error: saveError } = await supabase.from('platform_settings').upsert({
        setting_key: 'refund_policy',
        setting_value: { enabled: refundPolicyEnabled, max_refund_amount: maxAmount, policy_text: policyText },
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'setting_key' });
      if (saveError) throw saveError;
      setSettings((previous) => {
        const next = previous.filter((item) => item.setting_key !== 'refund_policy');
        return [...next, { setting_key: 'refund_policy', setting_value: { enabled: refundPolicyEnabled, max_refund_amount: maxAmount, policy_text: policyText }, updated_at: new Date().toISOString() }].sort((a,b) => a.setting_key.localeCompare(b.setting_key));
      });
      setRefundPolicyMessage('Refund policy saved to Supabase. Refund requests remain disabled unless the server ENABLE_REFUNDS flag is also enabled.');
    } catch (err: any) {
      setRefundPolicyMessage(err?.message || 'Refund policy could not be saved.');
    } finally { setSavingRefundPolicy(false); }
  };

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-center gap-3"><Settings className="w-6 h-6 text-[#0798F2]"/><div><h1 className="text-2xl font-bold text-slate-900">Platform Administration &amp; Settings</h1><p className="text-xs text-slate-500 mt-0.5">Values are loaded from the administrator-only Supabase settings table.</p></div></div>
        <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div><h2 className="text-lg font-bold text-slate-900">Refund policy</h2><p className="mt-1 text-sm text-slate-600">Document the business-approved refund rules. No fee or refund rate is prefilled. Provider refunds also require server-side ENABLE_REFUNDS=true.</p></div>
          <label className="flex items-start gap-3 text-sm text-slate-700"><input type="checkbox" checked={refundPolicyEnabled} onChange={(event) => setRefundPolicyEnabled(event.target.checked)} className="mt-1"/><span><strong>Enable approved refund policy</strong><span className="block text-xs text-slate-500 mt-1">Only enable this after the written policy is approved and reviewed.</span></span></label>
          <label className="block text-sm font-medium text-slate-700">Approved policy text<textarea value={refundPolicyText} onChange={(event) => setRefundPolicyText(event.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="Enter the approved refund eligibility, authorization, and handling policy. No default policy is supplied." /></label>
          <label className="block text-sm font-medium text-slate-700">Maximum per-refund amount (INR, optional)<input inputMode="decimal" value={refundPolicyMax} onChange={(event) => setRefundPolicyMax(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="Leave blank only if the approved policy has no per-refund cap" /></label>
          {refundPolicyMessage && <p role="status" className="text-sm text-slate-700">{refundPolicyMessage}</p>}
          <button type="button" onClick={() => void saveRefundPolicy()} disabled={savingRefundPolicy || loading} className="rounded-xl bg-[#0798F2] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{savingRefundPolicy ? 'Saving…' : 'Save refund policy'}</button>
        </section>
        {loading && <div role="status" className="bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-600">Loading platform settings…</div>}
        {error && <div role="alert" className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">{error}</div>}
        {!loading && !error && settings.length === 0 && <div className="bg-white border border-amber-200 rounded-3xl p-8 text-center shadow-sm"><h2 className="font-bold text-lg text-slate-900">No platform settings configured</h2><p className="mt-2 text-sm text-slate-600">No sample commission, emergency-contact, support-phone, or dispatch-radius values are loaded. Configure approved business settings in Supabase before enabling related production features.</p></div>}
        {settings.length > 0 && <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm divide-y divide-slate-100">{settings.map((setting) => <div key={setting.setting_key} className="py-3 first:pt-0 last:pb-0"><div className="text-xs text-slate-500">{setting.setting_key}</div><pre className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">{JSON.stringify(setting.setting_value, null, 2)}</pre><div className="mt-1 text-[11px] text-slate-400">Updated {new Date(setting.updated_at).toLocaleString()}</div></div>)}</div>}
      </div>
    </div>
  );
};
