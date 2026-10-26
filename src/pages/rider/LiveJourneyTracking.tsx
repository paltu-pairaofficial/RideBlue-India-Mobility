import React, { useState, useEffect, useRef } from 'react';



import { useParams, Link, useNavigate } from 'react-router-dom';



import {



  Navigation,



  Phone,



  MessageSquare,



  Share2,



  ShieldAlert,



  Clock,



  Compass,



  AlertTriangle,



  Star,



  CheckCircle2,



  XCircle,



  Copy,



  Check,



  CreditCard,



  Radio,



  Wifi,



  WifiOff,



} from 'lucide-react';



import { InteractiveMap } from '../../components/maps/InteractiveMap';



import { useRide } from '../../context/RideContext';



import { getEstimatedRoute } from '../../utils/routing';



import { formatINR, getRideStatusConfig } from '../../utils/formatters';



import { supabase } from '../../supabase/client';







export const LiveJourneyTracking: React.FC = () => {



  const { bookingId } = useParams<{ bookingId: string }>();



  const { bookings, cancelBooking, triggerEmergencySos, submitReview, refreshData } = useRide();



  const navigate = useNavigate();







  const [copiedLink, setCopiedLink] = useState(false);



  const [sosModalOpen, setSosModalOpen] = useState(false);



  const [cancelModalOpen, setCancelModalOpen] = useState(false);



  const [cancelReason, setCancelReason] = useState('Change of plans');



  const [reviewModalOpen, setReviewModalOpen] = useState(false);



  const [reviewRating, setReviewRating] = useState(5);



  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);







  // Live driver location from backend



  const [liveDriverLocation, setLiveDriverLocation] = useState<{



    lat: number;



    lng: number;



    accuracy?: number;



    heading?: number;



    speed?: number;



    recordedAt?: string;



  } | null>(null);







  const [isGpsStale, setIsGpsStale] = useState(false);



  const [gpsError, setGpsError] = useState<string | null>(null);



  const [paymentLoading, setPaymentLoading] = useState(false);



  const [paymentError, setPaymentError] = useState<string | null>(null);



  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);







  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);







  const booking = bookingId



    ? bookings.find((b) => b.id === bookingId)



    : bookings.find((b) => ['accepted', 'driver_arriving', 'in_progress'].includes(b.status));







  // Poll driver GPS location from server



  useEffect(() => {



    if (!booking) return;







    const isActive = ['accepted', 'driver_arriving', 'in_progress'].includes(booking.status);



    if (!isActive) {



      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);



      return;



    }







    const fetchDriverLocation = async () => {



      try {



        let token = '';



        if (supabase) {



          const { data } = await supabase.auth.getSession();



          token = data.session?.access_token || '';



        }







        const res = await fetch(`/api/location/ride/${booking.id}`, {



          headers: {



            ...(token ? { Authorization: `Bearer ${token}` } : {}),



          },



        });







        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            setGpsError(
              res.status === 401
                ? 'Your session has expired. Please sign in again.'
                : 'You are not authorized to track this ride.'
            );
          } else {
            setGpsError(`Location request failed (${res.status}).`);
          }

          setIsGpsStale(true);
          return;
        }







        const data = await res.json();



        if (data.location) {



          setLiveDriverLocation(data.location);



          setGpsError(null);







          // Check staleness (> 60 seconds)



          if (data.location.recordedAt) {



            const recordedMs = new Date(data.location.recordedAt).getTime();



            const ageSec = Math.round((Date.now() - recordedMs) / 1000);



            setIsGpsStale(ageSec > 60);



          }



        }



      } catch {



        // Network error during poll



      }



    };







    void fetchDriverLocation();



    pollIntervalRef.current = setInterval(fetchDriverLocation, 5000);







    return () => {



      if (pollIntervalRef.current) {



        clearInterval(pollIntervalRef.current);



        pollIntervalRef.current = null;



      }



    };



  }, [booking?.id, booking?.status]);







  if (!booking) {



    return (



      <div className="flex-1 p-8 text-center min-h-[50vh] flex flex-col items-center justify-center">



        <h2 className="card-heading text-slate-800">No active journey found</h2>



        <p className="helper-text text-slate-500 mt-1">



          {bookingId ? `No active trip found for reference "${bookingId}".` : 'You do not have any ongoing rides to track.'}



        </p>



        <Link to="/rider/book" className="helper-text text-[#0798F2] underline mt-3 block">



          Book a New Ride



        </Link>



      </div>



    );



  }







  const route = getEstimatedRoute(booking.pickup, booking.destination);



  const statusCfg = getRideStatusConfig(booking.status);







  const handleShareTrip = () => {



    navigator.clipboard.writeText(window.location.href);



    setCopiedLink(true);



    setTimeout(() => setCopiedLink(false), 2500);



  };







  const handleTriggerSos = async () => {
    try {
      await triggerEmergencySos(booking.id);
      setSosModalOpen(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Emergency dispatch is unavailable. Call 112 directly if in immediate danger.');
    }
  };







  const handleConfirmCancel = async () => {



    await cancelBooking(booking.id, cancelReason, 'rider');



    setCancelModalOpen(false);



    navigate('/rider/cancelled');



  };







  const handleSendReview = async () => {
    if (reviewSubmitting) return;
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      await submitReview(booking.id, reviewRating, reviewComment);
      setReviewModalOpen(false);
      setReviewComment('');
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Could not submit your rating.');
    } finally {
      setReviewSubmitting(false);
    }
  };







  // Real Razorpay Checkout integration



  const handlePayWithRazorpay = async () => {



    try {



      setPaymentLoading(true);



      setPaymentError(null);



      setPaymentSuccess(null);







      // 1. Ensure Razorpay checkout script is loaded



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







      // 2. Obtain Supabase session token



      let token = '';



      if (supabase) {



        const { data } = await supabase.auth.getSession();



        token = data.session?.access_token || '';



      }







      // 3. Request order creation from backend



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







      // 4. Launch Razorpay Standard Checkout in TEST MODE



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



              throw new Error(verifyData.error || 'Server signature verification failed.');



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



      console.error('Payment checkout error:', err);



      setPaymentError(err?.message || 'Could not initialize payment gateway.');



      setPaymentLoading(false);



    }



  };







  return (



    <div className="flex-1 bg-slate-50 flex flex-col">



      {/* Top Tracking Status Ribbon */}



      <div className="bg-[#102A43] text-white px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">



        <div className="flex items-center gap-2">



          <span className="font-bold tracking-wide">TRIP ID: {booking.bookingCode}</span>



          <span className="text-slate-400">·</span>



          <span className="text-[#FFE600] font-semibold">{statusCfg.label}</span>



          <span className="text-slate-400">·</span>



          <span className="flex items-center gap-1.5 text-slate-300">



            {liveDriverLocation ? (



              <>



                <span



                  className={`w-2 h-2 rounded-full ${isGpsStale ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'



                    }`}



                />



                <span>



                  {isGpsStale ? 'Driver GPS Stale (>60s)' : 'Live Driver GPS Streaming'}



                </span>



              </>



            ) : (



              <>



                <span className="w-2 h-2 rounded-full bg-slate-400" />



                <span>Awaiting driver device GPS broadcast</span>



              </>



            )}



          </span>



        </div>







        <div className="flex items-center gap-2">



          <button



            type="button"



            onClick={handleShareTrip}



            className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors"



          >



            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}



            <span>{copiedLink ? 'Link Copied!' : 'Share Live Trip'}</span>



          </button>



        </div>



      </div>







      {/* Main Tracking Layout: Desktop Side Panel vs Mobile Stack */}



      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">



        {/* MAP CONTAINER (Large map layout) */}



        <div className="lg:col-span-8 flex flex-col space-y-3">



          <div className="bg-white border border-slate-200 rounded-3xl p-3 sm:p-4 shadow-sm flex-1 min-h-[400px] lg:min-h-[550px] relative">



            <InteractiveMap



              pickup={booking.pickup}



              destination={booking.destination}



              driverLocation={liveDriverLocation ? { lat: liveDriverLocation.lat, lng: liveDriverLocation.lng } : undefined}



              routeCoordinates={route.coordinates}



              className="w-full h-full min-h-[380px] lg:min-h-[520px] rounded-2xl overflow-hidden"



            />



          </div>







          {/* GPS telemetry note for rider */}



          <div className="p-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-center justify-between">



            <div className="flex items-center gap-2">



              <Radio className="w-4 h-4 text-[#0798F2]" />



              {liveDriverLocation ? (



                <span>



                  Driver position recorded at{' '}



                  <strong className="text-slate-900">



                    {new Date(liveDriverLocation.recordedAt || '').toLocaleTimeString()}



                  </strong>



                  {liveDriverLocation.accuracy && ` (Accuracy ±${Math.round(liveDriverLocation.accuracy)}m)`}



                </span>



              ) : (



                <span className="text-slate-500 italic">



                  Driver device location will update on the map as soon as GPS telemetry is received from the vehicle.



                </span>



              )}



            </div>







            {isGpsStale && (



              <span className="text-amber-700 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 text-[11px]">



                Weak GPS signal



              </span>



            )}



          </div>



        </div>







        {/* SIDEBAR: JOURNEY TIMELINE & CONTROLS */}



        <div className="lg:col-span-4 space-y-4">



          {/* Status & ETA Card */}



          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">



            <div className="flex items-center justify-between">



              <div>



                <div className="text-[10px] uppercase font-bold text-slate-400">Estimated Arrival</div>



                <div className="text-2xl font-black text-[#102A43] tabular-nums">



                  {booking.status === 'driver_arriving'



                    ? '4 – 6 Mins'



                    : booking.status === 'in_progress'



                      ? `${booking.estimatedDurationMin} Mins`



                      : booking.driverId ? 'Waiting for route updates' : 'Waiting for driver acceptance'}



                </div>



              </div>



              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusCfg.badgeClass}`}>



                {statusCfg.label}



              </span>



            </div>







            {/* Driver Profile & Vehicle */}



            {booking.driverId ? <>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">



                <div className="flex items-center gap-3">



                  <div className="w-12 h-12 rounded-xl bg-[#E5F4FF] text-[#0798F2] flex items-center justify-center font-bold text-lg">



                    {booking.driverName?.charAt(0) || 'D'}



                  </div>



                  <div>



                    <div className="text-sm font-bold text-slate-900">{booking.driverName || 'Driver details unavailable'}</div>



                    <div className="text-xs text-slate-600 font-semibold">{booking.vehiclePlate}</div>



                    <div className="text-[11px] text-slate-400">{booking.vehicleModel}</div>



                  </div>



                </div>







                {booking.driverPhone && (



                  <a



                    href={`tel:${booking.driverPhone}`}



                    className="p-2.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-700 shadow-sm transition-colors"



                    title="Call Driver"



                  >



                    <Phone className="w-4 h-4 text-emerald-600" />



                  </a>



                )}



              </div>







            </> : <div role="status" className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-900"><div className="font-bold">No driver assigned yet</div><p className="text-xs mt-1">This ride is still a request. Driver details and live tracking become available only after an eligible driver accepts it.</p></div>}

            {/* Fare & Online Payment Action */}



            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">



              <div className="flex items-center justify-between">



                <div>



                  <div className="text-[10px] uppercase font-bold text-slate-400">Trip Fare</div>



                  <div className="text-base font-extrabold text-[#102A43]">



                    {formatINR(booking.fareBreakdown.total)}



                  </div>



                </div>



                <div>



                  <span



                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${booking.paymentStatus === 'paid'



                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'



                      : 'bg-amber-50 text-amber-700 border-amber-200'



                      }`}



                  >



                    {booking.paymentStatus === 'paid' ? 'Verified Paid' : 'Payment Pending'}



                  </span>



                </div>



              </div>







              {/* Razorpay Online Payment Button */}



              {booking.paymentMethod !== 'cash' && booking.paymentStatus !== 'paid' && (



                <div>



                  <button



                    type="button"



                    disabled={paymentLoading}



                    onClick={handlePayWithRazorpay}



                    className="w-full py-3 bg-[#0798F2] hover:bg-[#0570B5] text-white btn-text rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs"



                  >



                    <CreditCard className="w-4 h-4" />



                    <span>



                      {paymentLoading ? 'Connecting Gateway...' : 'Pay with Razorpay (Test Mode)'}



                    </span>



                  </button>



                  <span className="text-[10px] text-slate-400 block text-center mt-1">



                    Verified test transaction with cryptographic signature verification.



                  </span>



                </div>



              )}







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







            {/* Emergency SOS & Cancel Buttons */}



            <div className="pt-2 flex items-center gap-2">



              <button



                type="button"



                onClick={() => setSosModalOpen(true)}



                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"



              >



                <ShieldAlert className="w-4 h-4" />



                <span>Emergency SOS</span>



              </button>







              {['requested', 'accepted'].includes(booking.status) && (



                <button



                  type="button"



                  onClick={() => setCancelModalOpen(true)}



                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"



                >



                  Cancel Ride



                </button>



              )}



              {booking.status === 'completed' && booking.driverId && !booking.reviewSubmitted && !booking.review && (



                <button



                  type="button"



                  onClick={() => setReviewModalOpen(true)}



                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"



                >



                  <Star className="w-4 h-4 fill-current" />



                  Rate Driver



                </button>



              )}



            </div>



          </div>



        </div>



      </div>







      {/* SOS Modal */}



      {sosModalOpen && (



        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">



          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">



            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">



              <ShieldAlert className="w-8 h-8" />



            </div>



            <h3 className="text-lg font-black text-slate-900">Trigger Emergency Protocol?</h3>



            <p className="text-xs text-slate-500">



              Emergency dispatch is not connected. Confirming here will not contact responders or send your location. If you are in immediate danger in India, call 112 directly.



            </p>



            <div className="flex gap-3 pt-2">



              <button



                type="button"



                onClick={() => setSosModalOpen(false)}



                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"



              >



                Cancel



              </button>



              <button



                type="button"



                onClick={() => { window.location.href = 'tel:112'; setSosModalOpen(false); }}



                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg"



              >



                Call Emergency Services (112)



              </button>



            </div>



          </div>



        </div>



      )}







      {/* Driver Review Modal */}



      {reviewModalOpen && (



        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">



          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">



            <div className="text-center space-y-2">



              <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">



                <Star className="w-7 h-7 fill-current" />



              </div>



              <h3 className="text-lg font-black text-slate-900">Rate your driver</h3>



              <p className="text-sm text-slate-500">



                How was your ride with {booking.driverName || 'your driver'}?



              </p>



            </div>



            <div className="flex justify-center gap-2" role="radiogroup" aria-label="Driver rating">



              {[1, 2, 3, 4, 5].map((rating) => (



                <button



                  key={rating}



                  type="button"



                  role="radio"



                  aria-checked={reviewRating === rating}



                  aria-label={`${rating} star${rating === 1 ? '' : 's'}`}



                  onClick={() => setReviewRating(rating)}



                  className={`p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded ${rating <= reviewRating ? 'text-amber-500' : 'text-slate-300'



                    }`}



                >



                  <Star className="w-9 h-9 fill-current" />



                </button>



              ))}



            </div>



            <p className="text-center text-sm font-semibold text-slate-700">



              {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][reviewRating]}



            </p>



            <textarea



              value={reviewComment}



              onChange={(event) => setReviewComment(event.target.value)}



              placeholder="Write an optional comment about your ride..."



              rows={3}



              maxLength={1000}



              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0798F2]"



            />



            {reviewError && (
              <p role="alert" className="text-sm font-medium text-red-600">{reviewError}</p>
            )}

            <div className="flex gap-3">



              <button



                type="button"



                onClick={() => setReviewModalOpen(false)}



                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl"



              >



                Cancel



              </button>



              <button



                type="button"



                onClick={handleSendReview}
                disabled={reviewSubmitting}
                className="flex-1 py-3 bg-[#0798F2] hover:bg-[#0570B5] text-white font-bold text-sm rounded-xl"



              >



                {reviewSubmitting ? 'Submitting…' : 'Submit Rating'}

              </button>



            </div>



          </div>



        </div>



      )}





      {/* Cancel Modal */}



      {cancelModalOpen && (



        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">



          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">



            <h3 className="text-base font-bold text-slate-900">Cancel Your Booking?</h3>



            <p className="text-xs text-slate-500">Please provide a reason for cancellation:</p>



            <select



              value={cancelReason}



              onChange={(e) => setCancelReason(e.target.value)}



              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"



            >



              <option value="Change of plans">Change of plans</option>



              <option value="Driver took too long">Driver taking too long</option>



              <option value="Booked by mistake">Booked by mistake</option>



              <option value="Found alternative transport">Found alternative transport</option>



            </select>



            <div className="flex gap-3 pt-2">



              <button



                type="button"



                onClick={() => setCancelModalOpen(false)}



                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"



              >



                Keep Booking



              </button>



              <button



                type="button"



                onClick={handleConfirmCancel}



                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl"



              >



                Confirm Cancellation



              </button>



            </div>



          </div>



        </div>



      )}



    </div>



  );



};
