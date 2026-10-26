import React, { useState, useEffect } from 'react';
import { Banknote, ShieldCheck, AlertTriangle, CreditCard, CheckCircle2, RefreshCw } from 'lucide-react';

export const PaymentMethods: React.FC = () => {
  const [gatewayStatus, setGatewayStatus] = useState<{
    ok: boolean;
    razorpayConfigured: boolean;
    supabaseConfigured: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const checkGateway = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setGatewayStatus(data);
      }
    } catch {
      setGatewayStatus({ ok: false, razorpayConfigured: false, supabaseConfigured: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void checkGateway();
  }, []);

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-heading text-slate-900">Payment Methods &amp; Gateway Configuration</h1>
            <p className="body-text text-slate-500 mt-1">
              Razorpay server endpoints are present, but new bookings and payments are unavailable until approved production pricing and booking validation are configured.
            </p>
          </div>
          <button
            type="button"
            onClick={checkGateway}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 shadow-sm"
            title="Refresh status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Live Gateway Status Strip */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-[#0798F2]" />
              <div>
                <h2 className="card-heading text-slate-900">Razorpay Payment Gateway (Test Mode)</h2>
                <p className="helper-text text-slate-500">
                  Secured with cryptographic HMAC-SHA256 signature verification and webhook idempotency.
                </p>
              </div>
            </div>

            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${
                gatewayStatus?.razorpayConfigured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {loading
                ? 'Checking...'
                : gatewayStatus?.razorpayConfigured
                ? 'Gateway Ready (Test Keys Active)'
                : 'Awaiting Gateway Keys'}
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-600">
            <p>
              When booking a ride, passengers can select <strong>Razorpay Online Payment</strong>. Checkout must be verified against the configured Razorpay sandbox after the booking flow is enabled. Do not treat a client-side payment state as proof of payment.
            </p>
            {!gatewayStatus?.razorpayConfigured && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Setup Notice:</strong> To process transactions in Razorpay Test Mode, provide <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">RAZORPAY_KEY_ID</code> and <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">RAZORPAY_KEY_SECRET</code> in your server environment (<code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env</code>).
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cash Payment Method */}
        <div className="bg-white border border-emerald-200 rounded-3xl p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Banknote className="w-6 h-6 text-emerald-700" />
            <h2 className="card-heading text-slate-900">Cash on Destination Arrival</h2>
          </div>
          <p className="helper-text text-slate-600">
            Cash is supported across all West Bengal zones. Drivers collect the exact fare shown on their mobile console upon reaching the drop point.
          </p>
        </div>

        {/* Security Discipline */}
        <div className="p-4 bg-slate-100 rounded-2xl helper-text text-slate-700 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <span>
            <strong>Zero PCI Risk Architecture:</strong> RideBlue never stores raw card credentials, UPI PINs, or CVVs. All sensitive payment tokens are handled directly by Razorpay's encrypted checkout iframe.
          </span>
        </div>
      </div>
    </div>
  );
};
