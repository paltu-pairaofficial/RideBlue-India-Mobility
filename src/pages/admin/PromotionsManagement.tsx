import React from 'react';
import { Tag } from 'lucide-react';
import { useRide } from '../../context/RideContext';

export const PromotionsManagement: React.FC = () => {
  const { promoCodes, dataLoading, dataError } = useRide();
  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center gap-3">
          <Tag className="w-6 h-6 text-[#0798F2]" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Promotions &amp; Coupon Codes</h1>
            <p className="text-xs text-slate-500 mt-0.5">Only persisted, validated Supabase promotions may be displayed or redeemed.</p>
          </div>
        </div>
        {dataLoading && <div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading promotions…</div>}
        {dataError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{dataError}</div>}
        <div className="bg-white border border-amber-200 rounded-3xl p-6 shadow-sm">
          <h2 className="font-bold text-slate-900">Promotion management unavailable</h2>
          <p className="mt-2 text-sm text-slate-600">Coupon creation, editing, redemption limits, expiry checks, and usage tracking are not yet connected to authorized Supabase operations. No local or sample coupons are created. Existing database promotions returned by the active backend: {promoCodes.length}.</p>
        </div>
        {promoCodes.length > 0 && <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{promoCodes.map((promo) => <article key={promo.id} className="bg-white border border-slate-200 rounded-2xl p-5"><h3 className="font-bold text-slate-900">{promo.code}</h3><p className="mt-1 text-sm text-slate-600">{promo.discountType === 'percentage' ? `${promo.discountValue}%` : `₹${promo.discountValue}`} discount</p><p className="mt-2 text-xs text-slate-500">{promo.active ? 'Active in database' : 'Inactive in database'}</p></article>)}</div>}
        {!dataLoading && !dataError && promoCodes.length === 0 && <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-sm text-slate-500">No promotion records are available.</div>}
      </div>
    </div>
  );
};
