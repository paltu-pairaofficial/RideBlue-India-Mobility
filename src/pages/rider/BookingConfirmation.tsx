import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  MapPin,
  Calendar,
  Clock,
  Navigation,
  ShieldCheck,
  Phone,
  ArrowRight,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import { useRide } from '../../context/RideContext';
import { formatINR, formatDateTime } from '../../utils/formatters';
import { supabase } from '../../supabase/client';
import { RideTollAdjustments } from '../../components/RideTollAdjustments';

export const BookingConfirmation: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { bookings, refreshData } = useRide();
  const navigate = useNavigate();

  const [reloadingBooking, setReloadingBooking] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  const booking = bookings.find((b) => b.id === bookingId);

  useEffect(() => {
    if (booking || !bookingId) return;
    let active = true;
    setReloadingBooking(true);
    void refreshData().finally(() => { if (active) setReloadingBooking(false); });
    return () => { active = false; };
  }, [booking, bookingId, refreshData]);

  if (!booking) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center min-h-[50vh]">
        <div>
          <h2 className="card-heading text-slate-800">{reloadingBooking ? 'Loading booking…' : 'Booking Not Found'}</h2>
          <p className="helper-text text-slate-500 mt-1">{reloadingBooking ? 'Loading your saved booking from Supabase.' : `No booking matches reference ID "${bookingId}". Check Ride History before trying again.`}</p>
          <Link to="/rider/book" className="helper-text text-[#0798F2] underline mt-3 inline-block">
            Return to Booking
          </Link>
        </div>
      </div>
    );
  }

  const handlePayNow = async () => {
    try {
      setPaymentLoading(true);
      setPaymentError(null);
      setPaymentSuccess(null);

      if (!(window as any).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Razorpay checkout script.'));
          document.body.appendChild(script);
        });
      }

      let token = '';
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || '';
      }

      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ rideId: booking.id, idempotencyKey: crypto.randomUUID() }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to create payment order on server.');
      }

      const rzp = new (window as any).Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'RideBlue Cab Service',
        description: `Booking #${booking.bookingCode}`,
        order_id: orderData.orderId,
        prefill: {
          name: booking.riderName,
          contact: booking.riderPhone,
        },
        theme: { color: '#0798F2' },
        handler: async (response: any) => {
          try {
            setPaymentLoading(true);
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                rideId: booking.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.verified) {
              throw new Error(verifyData.error || 'Payment signature verification failed.');
            }

            setPaymentSuccess(`Payment verified! ID: ${response.razorpay_payment_id}`);
            await refreshData();
          } catch (vErr: any) {
            setPaymentError(vErr?.message || 'Payment verification failed.');
          } finally {
            setPaymentLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentLoading(false);
          },
        },
      });

      rzp.open();
    } catch (err: any) {
      setPaymentError(err?.message || 'Could not launch payment gateway.');
      setPaymentLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Success Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              {booking.status === 'requested' ? 'Ride Request Submitted' : booking.status === 'cancelled' ? 'Ride Cancelled' : booking.driverId ? 'Driver Assignment Recorded' : 'Booking Status Updated'}
            </div>
            <h1 className="page-heading text-[#102A43] mt-1">
              Booking Ref: {booking.bookingCode}
            </h1>
            <p className="body-text text-slate-500 mt-1">
              {booking.status === 'requested' ? 'Your request is saved. It is not confirmed until an eligible driver accepts it.' : booking.driverId ? 'Your assigned driver and current booking status are shown below.' : 'Your booking status is shown below. No driver assignment is recorded yet.'}
            </p>
          </div>

          {/* Driver details are shown only after a persisted assignment exists. */}
          {booking.driverId ? <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-[#E5F4FF] text-[#0798F2] flex items-center justify-center font-bold text-base">{booking.driverName?.charAt(0) || '?'}</div><div>
              <div className="card-heading text-slate-900">{booking.driverName || 'Assigned driver'}</div>
              <div className="helper-text text-slate-600 font-medium">{booking.vehicleModel || 'Vehicle details unavailable'}{booking.vehiclePlate ? ` · ${booking.vehiclePlate}` : ''}</div>
              {booking.driverRating != null && <div className="text-[11px] text-amber-600 font-semibold mt-0.5">★ {booking.driverRating} · Database rating</div>}
            </div></div>
            <div className="text-right"><span className="text-[10px] text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full font-bold border border-slate-200">{booking.status.replace('_', ' ')}</span></div>
          </div> : <div role="status" className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-left"><div className="font-bold text-amber-900">Waiting for driver acceptance</div><p className="text-xs text-amber-800 mt-1">No driver has accepted this request yet. Driver details and live tracking will appear only after the database records an assignment.</p></div>}

          {/* Trip Details */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 text-left space-y-3 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0 mt-1" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Pickup Location</div>
                <div className="text-xs font-semibold text-slate-900">{booking.pickup.address}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-rose-500 shrink-0 mt-1" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Destination</div>
                <div className="text-xs font-semibold text-slate-900">{booking.destination.address}</div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Payment Mode</div>
                <div className="font-bold text-slate-800 capitalize">
                  {booking.paymentMethod !== 'cash'
                    ? booking.paymentStatus === 'paid'
                      ? 'Online Card (Verified Paid)'
                      : 'Online (Payment Pending)'
                    : 'Cash on Trip End'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">Quoted Fare</div>
                <div className="text-base font-extrabold text-[#102A43] tabular-nums">
                  {formatINR(booking.fareBreakdown.total)}
                </div>
              </div>
            </div>

            {Number(booking.fareBreakdown.airportLevyAmount || 0) > 0 && <div className="flex justify-between rounded-xl bg-sky-50 px-3 py-2 text-xs"><span className="text-sky-900">Approved airport levy included in quote</span><strong className="text-sky-950">{formatINR(Number(booking.fareBreakdown.airportLevyAmount))}</strong></div>}
            <RideTollAdjustments rideId={booking.id} role="rider" />

            {/* Pay Online Action if pending */}
            {booking.driverId && ['accepted', 'driver_arriving', 'in_progress', 'completed'].includes(booking.status) && booking.paymentMethod !== 'cash' && booking.paymentStatus !== 'paid' && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  disabled={paymentLoading}
                  onClick={handlePayNow}
                  className="w-full py-3 bg-[#0798F2] hover:bg-[#0570B5] text-white btn-text rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {paymentLoading ? 'Connecting Razorpay...' : 'Pay with Razorpay'}
                  </span>
                </button>

                {paymentSuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{paymentSuccess}</span>
                  </div>
                )}

                {paymentError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{paymentError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            {booking.driverId && ['accepted', 'driver_arriving', 'in_progress'].includes(booking.status) ? <Link
              to={`/rider/tracking/${booking.id}`}
              className="flex-1 py-3.5 bg-[#0798F2] hover:bg-[#0570B5] text-white btn-text rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            ><Navigation className="w-4 h-4" /><span>View Assigned Ride &rarr;</span></Link> : <Link to="/rider/history" className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 btn-text rounded-xl transition-all text-center">View Ride History</Link>}
            <Link
              to="/rider/dashboard"
              className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 btn-text rounded-xl transition-all"
            >
              Rider Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
