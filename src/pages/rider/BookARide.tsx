import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Plus,
  Trash2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Tag,
  CreditCard,
  Banknote,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { LocationAutocomplete } from '../../components/maps/LocationAutocomplete';
import { InteractiveMap } from '../../components/maps/InteractiveMap';
import { VehicleVisual } from '../../components/visuals/VehicleVisual';
import { VEHICLE_CATEGORIES } from '../../data/vehicleCategories';
import { LocationPoint, RideStop, VehicleCategoryType, PaymentMethod, FareBreakdown } from '../../types';
import { getDrivingRoute, RouteSummary } from '../../utils/routing';
import { useRide } from '../../context/RideContext';
import { formatINR } from '../../utils/formatters';
import { isSupabaseConfigured, supabase } from '../../supabase/client';

export const BookARide: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { createBooking } = useRide();

  // Initial values from homepage navigation or defaults
  const stateData = location.state as {
    initialPickup?: LocationPoint;
    initialDestination?: LocationPoint;
    passengerCount?: number;
    bookingDate?: string;
    bookingTime?: string;
    fromPreset?: { from: string; to: string };
  } | null;

  const getInitialStep = (): 1 | 2 | 3 => {
    if (location.pathname === '/rider/vehicles') return 2;
    if (location.pathname === '/rider/review') return 3;
    return 1;
  };

  const [step, setStepState] = useState<1 | 2 | 3>(getInitialStep);

  const goToStep = (targetStep: 1 | 2 | 3) => {
    setStepState(targetStep);
    if (targetStep === 1 && location.pathname !== '/rider/book') navigate('/rider/book');
    else if (targetStep === 2 && location.pathname !== '/rider/vehicles') navigate('/rider/vehicles');
    else if (targetStep === 3 && location.pathname !== '/rider/review') navigate('/rider/review');
  };

  useEffect(() => {
    if (location.pathname === '/rider/vehicles') {
      setStepState(2);
    } else if (location.pathname === '/rider/review') {
      setStepState(3);
    } else if (location.pathname === '/rider/book') {
      setStepState(1);
    }
  }, [location.pathname]);

  // Form State
  // Do not silently prefill unrelated demo coordinates. Homepage-selected
  // locations are retained; otherwise the rider must select both locations.
  const [pickup, setPickup] = useState<LocationPoint | null>(stateData?.initialPickup || null);
  const [destination, setDestination] = useState<LocationPoint | null>(stateData?.initialDestination || null);

  const [stops, setStops] = useState<RideStop[]>([]);
  const [scheduledDate, setScheduledDate] = useState<string>(stateData?.bookingDate || '');
  const [scheduledTime, setScheduledTime] = useState<string>(stateData?.bookingTime || '');
  const [passengerCount, setPassengerCount] = useState<number>(stateData?.passengerCount || 1);
  const [vehicleCategory, setVehicleCategory] = useState<VehicleCategoryType>('sedan');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay');

  // Promo code
  const [quoteToken, setQuoteToken] = useState<string | null>(null);
  const [quoteKey, setQuoteKey] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteRefreshNonce, setQuoteRefreshNonce] = useState(0);
  const [quote, setQuote] = useState<{ pricingVersion: number; maxPassengers: number; includedPassengers: number; distanceKm: number; durationMinutes: number; airportLevyVerificationRequired: boolean; airportLevyAmount: number; airportLevyRules: Array<{ ruleId: string; airportCode: string; airportName: string; endpoint: string; amount: number; taxable: boolean; version: number }>; fare: { baseFare: number; distanceCharge: number; timeCharge: number; extraPassengerCharge: number; subtotal: number; taxes: number; total: number; currency: 'INR'; airportLevyAmount: number; airportLevyRules: any[]; airportLevyVerificationRequired: boolean; tollCharges: null; tollPolicy: string } } | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const liveBookingEnabled = (import.meta as any).env?.VITE_ENABLE_LIVE_BOOKING === 'true';

  // Policy agreement checkbox
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Request actual road-route data; never estimate from arbitrary typed text.
  const [route, setRoute] = useState<RouteSummary | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const points = [pickup, ...stops, destination];
    const valid = points.every((point) => point && Number.isFinite(point.lat) && Number.isFinite(point.lng));
    if (!valid || !pickup || !destination) {
      setRoute(null);
      setRouteError('Search for each location and select a valid suggestion to calculate the route.');
      setRouteLoading(false);
      return;
    }
    setRoute(null);
    setRouteLoading(true);
    setRouteError(null);
    getDrivingRoute(pickup, destination, stops.map(({ lat, lng }) => ({ lat, lng })))
      .then((result) => { if (!cancelled) setRoute(result); })
      .catch((error: unknown) => { if (!cancelled) setRouteError(error instanceof Error ? error.message : 'Unable to calculate this route.'); })
      .finally(() => { if (!cancelled) setRouteLoading(false); });
    return () => { cancelled = true; };
  }, [pickup, destination, stops]);


  const scheduledFor =
    scheduledDate && scheduledTime
      ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      : null;

  const currentQuoteKey = JSON.stringify({
    pickup: pickup && {
      address: pickup.address,
      lat: pickup.lat,
      lng: pickup.lng,
    },
    destination: destination && {
      address: destination.address,
      lat: destination.lat,
      lng: destination.lng,
    },
    stops: stops.map(({ address, lat, lng }) => ({
      address,
      lat,
      lng,
    })),
    vehicleCategory,
    passengerCount,
    scheduledFor,
  });

  const currentQuote = quote && quoteKey === currentQuoteKey ? quote : null;
  const currentQuoteToken = quoteKey === currentQuoteKey ? quoteToken : null;
  const fare: FareBreakdown | null = currentQuote ? { baseFare: currentQuote.fare.baseFare, distanceCharge: currentQuote.fare.distanceCharge, timeCharge: currentQuote.fare.timeCharge, extraPassengerCharge: currentQuote.fare.extraPassengerCharge, airportLevyAmount: currentQuote.fare.airportLevyAmount, taxes: currentQuote.fare.taxes, discount: 0, total: currentQuote.fare.total, currency: currentQuote.fare.currency } : null;

  // Ask the trusted API for a quote whenever route, vehicle, or passenger count changes.
  useEffect(() => {
    let cancelled = false;
    setQuote(null); setQuoteToken(null); setQuoteKey(null); setQuoteError(null); setQuoteLoading(false);
    const requestKey = currentQuoteKey;
    if (!route || !pickup || !destination || routeLoading || !isSupabaseConfigured || !supabase ||
      !pickup.address.trim() || !destination.address.trim() || stops.some((stop) => !stop.address.trim() || !Number.isFinite(stop.lat) || !Number.isFinite(stop.lng))) return;
    const requestQuote = async () => {
      setQuoteLoading(true);
      try {
        const { data: sessionData, error: sessionError } = await supabase!.auth.getSession();
        const token = sessionData.session?.access_token;
        if (sessionError || !token) throw new Error('Sign in to request an authorized fare quote.');
        const apiBase = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');
        const response = await fetch(`${apiBase}/api/fare-quote`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },

          body: JSON.stringify({
            pickup,
            destination,
            stops: stops.map(({ address, lat, lng }) => ({
              address,
              lat,
              lng,
            })),
            vehicleCategory,
            passengerCount,
            scheduledFor,
          }),

        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Trusted fare quote is unavailable.');
        if (!cancelled) { setQuote(result); setQuoteToken(result.quoteToken); setQuoteKey(requestKey); }
      } catch (error: any) { if (!cancelled) setQuoteError(error?.message || 'Unable to obtain a trusted fare quote.'); }
      finally { if (!cancelled) setQuoteLoading(false); }
    };
    void requestQuote();
    return () => { cancelled = true; };
  }, [route, currentQuoteKey, pickup, destination, stops, vehicleCategory, passengerCount, routeLoading, quoteRefreshNonce, scheduledFor]);

  const handleAddStop = () => {
    if (stops.length >= 2) return;
    const newStop: RideStop = {
      id: `stop-${Date.now()}`,
      address: '',
      lat: Number.NaN,
      lng: Number.NaN,
      order: stops.length + 1,
    };
    setStops([...stops, newStop]);
  };

  const handleRemoveStop = (id: string) => {
    setStops(stops.filter((s) => s.id !== id));
  };

  const [bookingError, setBookingError] = useState<string | null>(null);

  const handleConfirmBooking = async () => {
    if (!pickup || !destination || !route || routeLoading ||
      !Number.isFinite(pickup.lat) || !Number.isFinite(destination.lat) ||
      stops.some((stop) => !Number.isFinite(stop.lat) || !Number.isFinite(stop.lng))) {
      setRouteError('Select valid pickup, stop, and destination suggestions and wait for route calculation.');
      return;
    }
    if (!!scheduledDate !== !!scheduledTime) {
      setBookingError('Choose both a travel date and pickup time for a scheduled ride, or clear both fields for an immediate request.');
      return;
    }
    setBookingLoading(true);
    setBookingError(null);

    try {
      const newBooking = await createBooking({
        pickup,
        destination,
        stops,
        vehicleCategory,
        scheduledDate: scheduledDate || undefined,
        scheduledTime: scheduledTime || undefined,
        passengerCount,
        paymentMethod,
        quoteToken: currentQuoteToken || '',
        idempotencyKey,
      });

      navigate(`/rider/confirmation/${newBooking.id}`);
    } catch (err: any) {
      console.error('Booking failed:', err);
      const message = err?.message || 'Database booking creation failed. Please check your network and account.';
      setBookingError(message);
      if (/quote is invalid or expired|pricing changed|request a fresh quote/i.test(message)) {
        setQuote(null); setQuoteToken(null); setQuoteKey(null); setQuoteRefreshNonce((value) => value + 1);
      }
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Progress Stepper Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-6">
            <button
              type="button"
              onClick={() => goToStep(1)}
              className={`flex items-center gap-2 text-xs font-bold ${step >= 1 ? 'text-[#0798F2]' : 'text-slate-400'
                }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 1 ? 'bg-[#0798F2] text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                1
              </span>
              <span className="hidden sm:inline">Route &amp; Details</span>
            </button>

            <span className="text-slate-300">/</span>

            <button
              type="button"
              onClick={() => pickup && destination && goToStep(2)}
              className={`flex items-center gap-2 text-xs font-bold ${step >= 2 ? 'text-[#0798F2]' : 'text-slate-400'
                }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 2 ? 'bg-[#0798F2] text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                2
              </span>
              <span className="hidden sm:inline">Vehicle Selection</span>
            </button>

            <span className="text-slate-300">/</span>

            <button
              type="button"
              onClick={() => pickup && destination && goToStep(3)}
              className={`flex items-center gap-2 text-xs font-bold ${step >= 3 ? 'text-[#0798F2]' : 'text-slate-400'
                }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === 3 ? 'bg-[#0798F2] text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                3
              </span>
              <span className="hidden sm:inline">Review &amp; Confirm</span>
            </button>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Step {step} of 3
          </div>
        </div>

        {/* Main Grid: Left Controls, Right Map & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Controls for Step 1, 2, 3 */}
          <div className="lg:col-span-7 space-y-6">
            {/* STEP 1: ROUTE & PASSENGERS */}
            {step === 1 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="page-heading text-slate-900">Step 1: Where are you traveling?</h2>
                  <p className="helper-text text-slate-500 mt-1">
                    Select pickup, stops, and destination anywhere in India.
                  </p>
                </div>

                <div className="space-y-4">
                  <LocationAutocomplete
                    label="Pickup Location"
                    placeholder="Enter pickup point (Howrah, Airport, etc.)..."
                    value={pickup}
                    onChange={setPickup}
                    required
                  />

                  {/* Intermediate Stops */}
                  {stops.map((stop, idx) => (
                    <div key={stop.id} className="flex items-center gap-2">
                      <div className="flex-1">
                        <LocationAutocomplete
                          label={`Intermediate Stop ${idx + 1}`}
                          value={{ address: stop.address, lat: stop.lat, lng: stop.lng }}
                          onChange={(loc) => {
                            setStops(
                              stops.map((s) =>
                                s.id === stop.id
                                  ? { ...s, address: loc.address, lat: loc.lat, lng: loc.lng }
                                  : s
                              )
                            );
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStop(stop.id)}
                        className="mt-6 p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                        title="Remove Stop"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {stops.length < 2 && (
                    <button
                      type="button"
                      onClick={handleAddStop}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0798F2] hover:text-[#0570B5]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add intermediate stop (Multi-stop ride)</span>
                    </button>
                  )}

                  <LocationAutocomplete
                    label="Final Destination"
                    placeholder="Where are you going?"
                    value={destination}
                    onChange={setDestination}
                    required
                  />
                </div>

                {/* Date, Time, Passengers */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Travel Date
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Pickup Time
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Passengers
                    </label>
                    <select
                      value={passengerCount}
                      onChange={(e) => setPassengerCount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    >
                      <option value={1}>1 Passenger</option>
                      <option value={2}>2 Passengers</option>
                      <option value={3}>3 Passengers</option>
                      <option value={4}>4 Passengers</option>
                      <option value={6}>6 Passengers (SUV)</option>
                      <option value={7}>7 Passengers (XL)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    disabled={!pickup || !destination}
                    onClick={() => goToStep(2)}
                    className="px-6 py-3 bg-[#FFE600] hover:bg-[#ebd300] text-slate-950 btn-text rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <span>Proceed to Vehicle Selection</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: VEHICLE CATEGORY SELECTION */}
            {step === 2 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="page-heading text-slate-900">Step 2: Choose Your Vehicle</h2>
                    <p className="helper-text text-slate-500 mt-1">
                      Select capacity and comfort tier suited for your journey.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="helper-text font-semibold text-[#0798F2] hover:underline"
                  >
                    &larr; Change Route
                  </button>
                </div>

                {/* 5 Vehicle Categories Responsive Cards */}
                <div className="space-y-3">
                  {VEHICLE_CATEGORIES.map((cat) => {
                    const isSelected = vehicleCategory === cat.id;
                    const catFare = cat.id === vehicleCategory ? fare : null;

                    return (
                      <div
                        key={cat.id}
                        onClick={() => setVehicleCategory(cat.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 ${isSelected
                          ? 'bg-[#E5F4FF]/40 border-[#0798F2] ring-2 ring-[#0798F2]/30 shadow-md'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                          <div className="w-24 sm:w-28 shrink-0">
                            <VehicleVisual category={cat.id} className="w-full h-16" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900">{cat.name}</h3>
                              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                Capacity set by active fare rule
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{cat.tagline}</p>
                            <div className="text-[11px] text-slate-400 mt-1">
                              Luggage: {cat.luggage}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0">
                          <div className="text-right">
                            <div className="text-base font-extrabold text-[#102A43] tabular-nums">
                              {catFare ? formatINR(catFare.total) : 'Unavailable'}
                            </div>
                            <div className="text-[10px] text-slate-400">{quoteLoading ? 'Calculating trusted fare…' : currentQuote && cat.id === vehicleCategory ? `Pricing v${currentQuote.pricingVersion}` : cat.id === vehicleCategory ? 'Quote unavailable' : 'Select to quote'}</div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-[#0798F2] border-[#0798F2] text-white' : 'border-slate-300'
                            }`}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="px-4 py-2.5 btn-text text-slate-600 hover:text-slate-900"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="px-6 py-3 bg-[#FFE600] hover:bg-[#ebd300] text-slate-950 btn-text rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    <span>Proceed to Review &amp; Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW, PROMO & CONFIRM */}
            {step === 3 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="page-heading text-slate-900">Step 3: Review &amp; Confirm Booking</h2>
                    <p className="helper-text text-slate-500 mt-1">
                      Check your fare breakdown and select payment method.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="helper-text font-semibold text-[#0798F2] hover:underline"
                  >
                    &larr; Change Vehicle
                  </button>
                </div>

                {/* Selected vehicle summary badge */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Selected Tier
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 capitalize">
                      RideBlue {vehicleCategory.replace('_', ' ')}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {passengerCount} passenger{passengerCount === 1 ? '' : 's'} · {currentQuote ? `Maximum ${currentQuote.maxPassengers} passengers` : 'Capacity verified when quote loads'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-[#102A43] tabular-nums">
                      {fare ? formatINR(fare.total) : '---'}
                    </div>
                  </div>
                </div>

                {quoteLoading && <div role="status" className="rounded-xl bg-sky-50 border border-sky-100 p-3 text-xs text-sky-800">Calculating a trusted fare using the server-validated driving route and current approved pricing rules…</div>}
                {quoteError && <div role="alert" className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">{quoteError}</div>}
                {!quoteLoading && !quoteError && !currentQuote && <div role="status" className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">A fare quote will appear when route details and approved pricing are available.</div>}
                {currentQuote && <dl className="rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Base fare</dt><dd className="font-semibold">{formatINR(currentQuote.fare.baseFare)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Distance ({currentQuote.distanceKm} km)</dt><dd className="font-semibold">{formatINR(currentQuote.fare.distanceCharge)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Estimated driving time ({currentQuote.durationMinutes} min)</dt><dd className="font-semibold">{formatINR(currentQuote.fare.timeCharge)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Extra passenger charge</dt><dd className="font-semibold">{formatINR(currentQuote.fare.extraPassengerCharge)}</dd></div>
                  {currentQuote.fare.airportLevyAmount > 0 && <div className="flex justify-between gap-3"><dt className="text-slate-500">Approved airport levy (separate rule)</dt><dd className="font-semibold">{formatINR(currentQuote.fare.airportLevyAmount)}</dd></div>}
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Taxes</dt><dd className="font-semibold">{formatINR(currentQuote.fare.taxes)}</dd></div>
                  <div className="border-t border-slate-100 pt-2 flex justify-between gap-3 text-sm"><dt className="font-bold text-slate-800">Total</dt><dd className="font-extrabold text-slate-900">{formatINR(currentQuote.fare.total)}</dd></div>
                  <p className="text-[10px] text-slate-500">Quote expires after five minutes · Pricing version {currentQuote.pricingVersion}</p>
                </dl>}

                {/* Payment Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setPaymentMethod('razorpay')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${paymentMethod === 'razorpay'
                        ? 'border-[#0798F2] bg-[#E5F4FF]/30 ring-2 ring-[#0798F2]/20'
                        : 'border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Online Payment / Razorpay</div>
                          <div className="text-[10px] text-slate-500">Payment is collected after booking through verified checkout</div>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === 'razorpay' ? 'bg-[#0798F2] border-[#0798F2]' : 'border-slate-300'
                        }`} />
                    </div>

                    <div
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${paymentMethod === 'cash'
                        ? 'border-[#0798F2] bg-[#E5F4FF]/30 ring-2 ring-[#0798F2]/20'
                        : 'border-slate-200 hover:border-slate-300'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Banknote className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">Cash Payment</div>
                          <div className="text-[10px] text-slate-500">Pay directly to driver</div>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${paymentMethod === 'cash' ? 'bg-[#0798F2] border-[#0798F2]' : 'border-slate-300'
                        }`} />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                  Promotional discounts are unavailable until server-side coupon validation and redemption are enabled. No discount has been applied to this fare.
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">Road tolls are additional and are not included in this quote. Any actual toll must be recorded separately and verified before it can be treated as payable or included in driver earnings. {currentQuote?.fare.airportLevyVerificationRequired ? 'This route may involve an airport levy, but no applicable approved rule was found. Booking is blocked until an administrator configures or verifies the rule.' : currentQuote && currentQuote.fare.airportLevyAmount > 0 ? 'The applicable approved airport levy is shown separately in the fare breakdown.' : 'Airport levies are included only when a matching active, approved rule can be determined.'}</div>

                {/* Cancellation & Terms Notice */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Cancellation Policy</span>
                  </div>
                  <p>
                    Cancellation fees are not configured for production yet. Any applicable cancellation policy will be shown here after it is approved and configured.
                  </p>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                      className="rounded border-slate-300 text-[#0798F2] focus:ring-[#0798F2]"
                    />
                    <span>I understand the cancellation terms &amp; fare breakdown.</span>
                  </label>
                </div>

                {bookingError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">Booking Not Confirmed:</strong>
                      <p className="mt-0.5">{bookingError}</p>
                    </div>
                  </div>
                )}

                {!liveBookingEnabled && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Live booking is disabled while this flow is being verified. Set VITE_ENABLE_LIVE_BOOKING=true only after the server-side tests pass and ENABLE_LIVE_BOOKING=true is configured on the server.</div>}

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="px-4 py-2.5 btn-text text-slate-600 hover:text-slate-900"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="button"
                    disabled={!liveBookingEnabled || !agreedTerms || bookingLoading || !route || routeLoading || quoteLoading || !currentQuoteToken || !fare || Boolean(currentQuote?.fare.airportLevyVerificationRequired)}
                    onClick={handleConfirmBooking}
                    className="px-8 py-3.5 bg-[#FFE600] hover:bg-[#ebd300] active:scale-[0.99] text-slate-950 btn-text rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {bookingLoading ? (
                      <span>Creating Request...</span>
                    ) : (
                      <>
                        <span>Confirm &amp; Book Ride</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: INTERACTIVE MAP & LIVE FARE BREAKDOWN */}
          <div className="lg:col-span-5 space-y-6">
            {/* Interactive Leaflet Map Preview */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
              <div className="text-xs font-bold text-slate-900 mb-2 px-1 flex items-center justify-between">
                <span>Route Preview</span>
                {route && (
                  <span className="text-[11px] font-semibold text-[#0798F2]">
                    {currentQuote ? currentQuote.distanceKm : route.distanceKm} km · ~{currentQuote ? currentQuote.durationMinutes : route.durationMinutes} mins
                  </span>
                )}
              </div>
              {routeLoading && <p className="px-1 pb-2 text-xs text-slate-500">Calculating real driving route…</p>}
              {routeError && <p role="alert" className="px-1 pb-2 text-xs text-amber-700">{routeError}</p>}
              <p className="px-1 pb-2 text-[10px] text-slate-500">Map path is a preview. When available, fare distance and duration come from the server-validated route.</p>
              <InteractiveMap
                pickup={pickup && Number.isFinite(pickup.lat) ? pickup : null}
                destination={destination && Number.isFinite(destination.lat) ? destination : null}
                stops={stops.filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng))}
                routeCoordinates={route?.coordinates}
                className="h-64 sm:h-72 w-full rounded-2xl overflow-hidden"
              />
            </div>

            {/* Transparent Fare Breakdown Card */}
            {fare && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="card-heading text-slate-900">Fare Breakdown</h3>
                  <span className="text-[11px] font-semibold text-slate-500 capitalize">
                    {vehicleCategory.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Base Fare</span>
                    <span className="font-semibold text-slate-900 tabular-nums">{formatINR(fare.baseFare)}</span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Distance Charge ({currentQuote?.distanceKm ?? route?.distanceKm} km)</span>
                    <span className="font-semibold text-slate-900 tabular-nums">{formatINR(fare.distanceCharge)}</span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Estimated Time Charge ({currentQuote?.durationMinutes ?? route?.durationMinutes} min)</span>
                    <span className="font-semibold text-slate-900 tabular-nums">{formatINR(fare.timeCharge)}</span>
                  </div>

                  {(fare.extraPassengerCharge ?? 0) > 0 && <div className="flex justify-between text-slate-600"><span>Extra passenger charge</span><span className="font-semibold text-slate-900 tabular-nums">{formatINR(fare.extraPassengerCharge ?? 0)}</span></div>}
                  {(fare.airportLevyAmount ?? 0) > 0 && <div className="flex justify-between text-slate-600"><span>Approved airport levy (separate)</span><span className="font-semibold text-slate-900 tabular-nums">{formatINR(fare.airportLevyAmount ?? 0)}</span></div>}
                  <div className="flex justify-between text-slate-600"><span>Road tolls</span><span className="font-semibold text-slate-900">Additional actual cost; not included</span></div>

                  {currentQuote && currentQuote.fare.subtotal > currentQuote.fare.baseFare + currentQuote.fare.distanceCharge + currentQuote.fare.timeCharge + currentQuote.fare.extraPassengerCharge && <div className="flex justify-between text-slate-600"><span>Minimum fare adjustment</span><span className="font-semibold text-slate-900 tabular-nums">{formatINR(currentQuote.fare.subtotal - currentQuote.fare.baseFare - currentQuote.fare.distanceCharge - currentQuote.fare.timeCharge - currentQuote.fare.extraPassengerCharge)}</span></div>}
                  <div className="flex justify-between text-slate-600">
                    <span>Configured taxes</span>
                    <span className="font-semibold text-slate-900 tabular-nums">{formatINR(fare.taxes)}</span>
                  </div>

                  {fare.discount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded">
                      <span>Coupon Discount</span>
                      <span className="tabular-nums">- {formatINR(fare.discount)}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-900">Estimated Total</span>
                    <span className="text-lg font-black text-[#102A43] tabular-nums">
                      {formatINR(fare.total)}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 leading-tight">
                  * Quote includes the currently applicable configured fare rules and airport levy. Road tolls are separate actual-cost adjustments and are not included in this estimate.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
