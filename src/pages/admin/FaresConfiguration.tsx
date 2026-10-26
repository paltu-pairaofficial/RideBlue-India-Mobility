
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Edit3, Plus, Settings } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../supabase/client';
import { AirportLevyConfiguration } from './AirportLevyConfiguration';

type FareRule = {
  id: string;
  vehicle_category: string;
  base_fare: number;
  rate_per_km: number;
  rate_per_minute: number;
  minimum_fare: number;
  cancellation_fee: number;
  max_passengers: number;
  included_passengers: number;
  additional_passenger_fee: number;
  tax_rate: number;
  commission_rate: number;
  active: boolean;
  version: number;
  updated_at: string;
  effective_from: string;
  effective_until: string | null;
};

type FareDraft = Record<
  | 'base_fare'
  | 'rate_per_km'
  | 'rate_per_minute'
  | 'minimum_fare'
  | 'cancellation_fee'
  | 'max_passengers'
  | 'included_passengers'
  | 'additional_passenger_fee'
  | 'tax_rate'
  | 'commission_rate',
  string
> & {
  vehicle_category: string;
  active: boolean;
  effective_from: string;
  effective_until: string;
};

const CATEGORIES = [
  'economy',
  'sedan',
  'suv',
  'xl',
  'airport_transfer',
];

const FIELD_LABELS: Array<{
  key: keyof Omit<FareDraft, 'vehicle_category' | 'active'>;
  label: string;
  step?: string;
  min?: string;
  max?: string;
}> = [
    { key: 'base_fare', label: 'Base fare (₹)', step: '0.01', min: '0' },
    { key: 'rate_per_km', label: 'Rate per kilometre (₹)', step: '0.01', min: '0' },
    { key: 'rate_per_minute', label: 'Rate per minute (₹)', step: '0.01', min: '0' },
    { key: 'minimum_fare', label: 'Minimum fare (₹)', step: '0.01', min: '0' },
    { key: 'cancellation_fee', label: 'Cancellation fee (₹)', step: '0.01', min: '0' },
    { key: 'max_passengers', label: 'Maximum passengers', step: '1', min: '1', max: '8' },
    { key: 'included_passengers', label: 'Included passengers', step: '1', min: '1', max: '8' },
    { key: 'additional_passenger_fee', label: 'Additional fee per passenger (₹)', step: '0.01', min: '0' },
    { key: 'tax_rate', label: 'Tax rate (decimal, e.g. 0.05 for 5%)', step: '0.0001', min: '0', max: '1' },
    { key: 'commission_rate', label: 'Commission rate (decimal, e.g. 0.12 for 12%)', step: '0.0001', min: '0', max: '1' },
  ];

const blankDraft = (category = 'economy'): FareDraft => ({
  vehicle_category: category,
  active: false,
  effective_from: new Date().toISOString().slice(0, 16),
  effective_until: '',
  base_fare: '',
  rate_per_km: '',
  rate_per_minute: '',
  minimum_fare: '',
  cancellation_fee: '',
  max_passengers: '',
  included_passengers: '',
  additional_passenger_fee: '',
  tax_rate: '',
  commission_rate: '',
});

const money = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);

export const FaresConfiguration: React.FC = () => {
  const [rules, setRules] = useState<FareRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [draft, setDraft] = useState<FareDraft | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (draft) {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [draft]);

  const loadRules = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured. Fare rules cannot be loaded.');
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error: queryError } = await supabase
      .from('fare_rules')
      .select('*')
      .order('vehicle_category');

    if (queryError) {
      setError(`Fare rules could not be loaded: ${queryError.message}`);
      setRules([]);
    } else {
      setRules((data || []) as FareRule[]);
      setError(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const startEdit = (rule?: FareRule, category?: string) => {
    setSuccess(null);
    setError(null);

    if (!rule) {
      setDraft(
        blankDraft(
          category ||
          CATEGORIES.find(
            (c) => !rules.some((r) => r.vehicle_category === c)
          ) ||
          'economy'
        )
      );
      return;
    }

    setDraft({
      vehicle_category: rule.vehicle_category,
      active: rule.active,
      base_fare: String(rule.base_fare),
      rate_per_km: String(rule.rate_per_km),
      rate_per_minute: String(rule.rate_per_minute),
      minimum_fare: String(rule.minimum_fare),
      cancellation_fee: String(rule.cancellation_fee),
      max_passengers: String(rule.max_passengers),
      included_passengers: String(rule.included_passengers),
      additional_passenger_fee: String(rule.additional_passenger_fee),
      tax_rate: String(rule.tax_rate),
      commission_rate: String(rule.commission_rate),
      effective_from: rule.effective_from.slice(0, 16),
      effective_until: rule.effective_until
        ? rule.effective_until.slice(0, 16)
        : '',
    });
  };



  const saveRule = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!draft || !supabase) return;

    setError(null);
    setSuccess(null);

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      setError('Sign in again before saving fare configuration.');
      return;
    }

    const numeric = Object.fromEntries(
      FIELD_LABELS.map(({ key }) => [key, Number(draft[key])])
    ) as Record<string, number>;

    if (
      FIELD_LABELS.some(
        ({ key }) =>
          draft[key].trim() === '' || !Number.isFinite(numeric[key])
      ) ||
      numeric.base_fare < 0 ||
      numeric.rate_per_km < 0 ||
      numeric.rate_per_minute < 0 ||
      numeric.minimum_fare < 0 ||
      numeric.cancellation_fee < 0 ||
      numeric.additional_passenger_fee < 0 ||
      !Number.isInteger(numeric.max_passengers) ||
      numeric.max_passengers < 1 ||
      numeric.max_passengers > 8 ||
      !Number.isInteger(numeric.included_passengers) ||
      numeric.included_passengers < 1 ||
      numeric.included_passengers > numeric.max_passengers ||
      numeric.tax_rate < 0 ||
      numeric.tax_rate > 1 ||
      numeric.commission_rate < 0 ||
      numeric.commission_rate > 1
    ) {
      setError(
        'Check all values. Passenger counts must be whole numbers, included passengers cannot exceed capacity, and rates must be valid non-negative values.'
      );
      return;
    }

  

    const effectiveFrom = new Date(draft.effective_from);
    const effectiveUntil = draft.effective_until
      ? new Date(draft.effective_until)
      : null;

    if (
      !Number.isFinite(effectiveFrom.getTime()) ||
      (effectiveUntil &&
        (!Number.isFinite(effectiveUntil.getTime()) ||
          effectiveUntil <= effectiveFrom))
    ) {
      setError(
        'Enter a valid pricing effective period. The end must be later than the start.'
      );
      return;
    }
      setSaving(true);


    const nextVersion =
      Math.max(
        0,
        ...rules
          .filter(
            (rule) =>
              rule.vehicle_category === draft.vehicle_category
          )
          .map((rule) => Number(rule.version) || 0)
      ) + 1;

    const { error: saveError } = await supabase
      .from('fare_rules')
      .insert({
        ...numeric,
        vehicle_category: draft.vehicle_category,
        active: draft.active,
        version: nextVersion,
        effective_from: effectiveFrom.toISOString(),
        effective_until: effectiveUntil?.toISOString() || null,
        updated_by: sessionData.session.user.id,
      });


    setSaving(false);

    if (saveError) {
      setError(
        `Fare rule was not saved: ${saveError.message}. Verify that this account has the administrator role and migration 04/05 are applied.`
      );
      return;
    }

    setDraft(null);
    setSuccess(
      `Saved ${draft.vehicle_category.replace('_', ' ')} pricing. ${draft.active
        ? 'This active rule is available for new quotes.'
        : 'This rule remains inactive and will not be quoted.'
      }`
    );

    await loadRules();
  };

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-[#0798F2]" />
          <div>
            <h1 className="page-heading text-slate-900">
              Fare Configuration &amp; Vehicle Tiers
            </h1>
            <p className="body-text text-slate-500 mt-0.5">
              Configure approved pricing. Only an authorized administrator can
              save rules; no production prices are prefilled.
            </p>
          </div>
        </div>

        {loading && (
          <div
            role="status"
            className="bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-600"
          >
            Loading fare rules…
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-900"
          >
            {success}
          </div>
        )}

        {!loading && !error && rules.length === 0 && (
          <div className="bg-white border border-amber-200 rounded-3xl p-8 text-center text-slate-700 shadow-sm">
            <h2 className="font-bold text-lg">
              Production pricing is not configured
            </h2>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl mx-auto">
              Enter rates approved by the business owner. Until at least one
              active rule exists for a vehicle category, fare quotes and
              bookings for that category remain unavailable.
            </p>
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {rules.map((rule) => (
              <article
                key={rule.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 capitalize">
                      {rule.vehicle_category.replace('_', ' ')}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Pricing version {rule.version} · effective from{' '}
                      {new Date(rule.effective_from).toLocaleString()}{' '}
                      {rule.effective_until
                        ? `until ${new Date(rule.effective_until).toLocaleString()}`
                        : 'with no end date'}{' '}
                      · updated {new Date(rule.updated_at).toLocaleString()}
                    </p>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${rule.active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                      }`}
                  >
                    {rule.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Base fare</dt>
                    <dd className="font-semibold">
                      {money(Number(rule.base_fare))}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">Per km</dt>
                    <dd className="font-semibold">
                      {money(Number(rule.rate_per_km))}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">Per minute</dt>
                    <dd className="font-semibold">
                      {money(Number(rule.rate_per_minute))}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">Minimum fare</dt>
                    <dd className="font-semibold">
                      {money(Number(rule.minimum_fare))}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">Passenger capacity</dt>
                    <dd className="font-semibold">{rule.max_passengers}</dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">Included passengers</dt>
                    <dd className="font-semibold">
                      {rule.included_passengers}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">Extra passenger fee</dt>
                    <dd className="font-semibold">
                      {money(Number(rule.additional_passenger_fee))}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">Tax rate</dt>
                    <dd className="font-semibold">
                      {Number(rule.tax_rate) * 100}%
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">Commission rate</dt>
                    <dd className="font-semibold">
                      {Number(rule.commission_rate) * 100}%
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"

                  onClick={() => startEdit(rule)}


                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#0798F2]"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit pricing
                </button>
              </article>
            ))}
          </div>
        )}

        {!loading && (
          <button
            type="button"
            onClick={() => startEdit()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0798F2] px-5 py-3 text-sm font-bold text-white hover:bg-[#087fca]"
          >
            <Plus className="w-4 h-4" />
            Add vehicle pricing rule
          </button>
        )}

        {draft && (
          <form
            ref={formRef}
            onSubmit={saveRule}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5"
          >
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Schedule a new fare-rule version
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Create a new version without overwriting existing fare rules.
                Enter business-approved prices and the intended effective dates.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vehicle category
              </label>
              <select
                value={draft.vehicle_category}

                onChange={(e) =>
                  setDraft({
                    ...draft,
                    vehicle_category: e.target.value,
                  })
                }
                className="w-full sm:max-w-sm rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option
                    key={c}
                    value={c}

                  >
                    {c.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-xs font-semibold text-slate-700">
                Effective from
                <input
                  type="datetime-local"
                  required
                  value={draft.effective_from}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      effective_from: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-700">
                Effective until (optional)
                <input
                  type="datetime-local"
                  value={draft.effective_until}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      effective_until: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FIELD_LABELS.map(({ key, label, step, min, max }) => (
                <div key={key}>
                  <label
                    className="block text-xs font-semibold text-slate-700 mb-1"
                    htmlFor={`fare-${key}`}
                  >
                    {label}
                  </label>
                  <input
                    id={`fare-${key}`}
                    type="number"
                    required
                    min={min}
                    max={max}
                    step={step}
                    value={draft[key]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [key]: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    active: e.target.checked,
                  })
                }
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-800">
                  Activate this fare rule
                </span>
                <span className="block text-xs text-slate-500 mt-1">
                  Only activate after all values have been approved. Inactive
                  rules cannot generate quotes.
                </span>
              </span>
            </label>

            <div className="flex gap-3">
              <button
                disabled={saving}
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0798F2] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? (
                  'Saving…'
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Save fare rule
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => setDraft(null)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <AirportLevyConfiguration />
      </div>
    </div>
  );
};
