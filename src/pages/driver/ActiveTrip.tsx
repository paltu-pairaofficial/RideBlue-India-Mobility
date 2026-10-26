
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Navigation,
  Phone,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldAlert,
  ArrowRight,
  AlertCircle,
  Banknote,
  CreditCard,
  Radio,
  WifiOff,
  Crosshair,
} from 'lucide-react';
import { InteractiveMap } from '../../components/maps/InteractiveMap';
import { useRide } from '../../context/RideContext';
import { getEstimatedRoute } from '../../utils/routing';
import { formatINR, getRideStatusConfig } from '../../utils/formatters';
import { supabase } from '../../supabase/client';
import { RideTollAdjustments } from '../../components/RideTollAdjustments';

export const ActiveTrip: React.FC = () => {
  const { activeDriverTrip, bookings, updateRideStatus } = useRide();
  const navigate = useNavigate();

  // If activeDriverTrip not set, use any active booking assigned
  const trip =
    activeDriverTrip ||
    bookings.find((b) =>
      ['accepted', 'driver_arriving', 'in_progress'].includes(b.status)
    );

  // Geolocation state
  const [gpsPermission, setGpsPermission] = useState<
    'prompt' | 'granted' | 'denied' | 'unsupported'
  >('prompt');

  const [currentCoords, setCurrentCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [serverCoords, setServerCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsSpeed, setGpsSpeed] = useState<number | null>(null);

  const [lastTransmissionTime, setLastTransmissionTime] =
    useState<string | null>(null);

  const [transmissionError, setTransmissionError] = useState<string | null>(
    null
  );

  const [isTransmitting, setIsTransmitting] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const lastSentTimeRef = useRef<number>(0);

  // Send GPS to backend endpoint
  const sendLocationUpdate = async (
    coords: GeolocationCoordinates,
    capturedAt: number
  ) => {
    if (!trip || document.visibilityState === 'hidden') return;

    try {
      setIsTransmitting(true);
      setTransmissionError(null);

      let token = '';

      if (supabase) {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || '';
      }

      const res = await fetch('/api/location/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          rideId: trip.id,
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy,
          heading: coords.heading,
          speed: coords.speed,
          capturedAt,
        }),
      });

      const resData = await res.json();

      if (!res.ok) {
        setTransmissionError(
          resData.error || 'Failed to sync GPS with RideBlue server.'
        );
      } else {
        setLastTransmissionTime(new Date().toLocaleTimeString());
      }
    } catch {
      setTransmissionError(
        'Network connectivity error while uploading GPS coordinates.'
      );
    } finally {
      setIsTransmitting(false);
    }
  };

  // Start watching location on the driver's device
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGpsPermission('unsupported');
      return;
    }

    if (
      !trip ||
      !['accepted', 'driver_arriving', 'in_progress'].includes(trip.status)
    ) {
      return;
    }

    const successHandler = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy, speed } = position.coords;

      setGpsPermission('granted');
      setGpsAccuracy(accuracy);

      // Reject inaccurate or invalid GPS readings.
      // Keep this limit aligned with the backend's 500 m validation.
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        !Number.isFinite(accuracy) ||
        accuracy < 0 ||
        accuracy > 100 ||
        latitude < 6.0 ||
        latitude > 37.5 ||
        longitude < 68.0 ||
        longitude > 97.5
      ) {
        setTransmissionError(
          Number.isFinite(accuracy)
            ? `GPS accuracy is too poor (${Math.round(
                accuracy
              )}m) or coordinates are outside the supported area. Waiting for a valid location.`
            : 'GPS accuracy is unavailable. Waiting for a valid location.'
        );
        return;
      }

      // Only publish a location after it passes validation.
      setTransmissionError(null);
      setCurrentCoords({
        lat: latitude,
        lng: longitude,
      });
      setGpsSpeed(speed);

      // Throttle upload to every 5 seconds.
      const now = Date.now();

      if (now - lastSentTimeRef.current >= 5000) {
        lastSentTimeRef.current = now;
        void sendLocationUpdate(position.coords, position.timestamp);
      }
    };

    const errorHandler = (error: GeolocationPositionError) => {
      if (error.code === error.PERMISSION_DENIED) {
        setGpsPermission('denied');
      } else {
        setTransmissionError(
          error.code === error.POSITION_UNAVAILABLE
            ? 'Device location is unavailable. Check GPS and location services.'
            : 'GPS timed out. Waiting for a fresh device location.'
        );
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      successHandler,
      errorHandler,
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 30000,
      }
    );

    watchIdRef.current = watchId;

    return () => {
      navigator.geolocation.clearWatch(watchId);

      if (watchIdRef.current === watchId) {
        watchIdRef.current = null;
      }
    };
  }, [trip?.id, trip?.status]);

  // Fetch the latest valid driver location from the server every 5 seconds.
  useEffect(() => {
    if (
      !trip?.id ||
      !['accepted', 'driver_arriving', 'in_progress'].includes(trip.status)
    ) {
      setServerCoords(null);
      return;
    }

    let cancelled = false;

    const fetchServerLocation = async () => {
      try {
        if (!supabase || cancelled) return;

        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token || cancelled) return;

        const response = await fetch(
          `/api/location/ride/${encodeURIComponent(trip.id)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
          }
        );

        if (!response.ok || cancelled) return;

        const result = await response.json();

        const lat = Number(result.location?.lat);
        const lng = Number(result.location?.lng);

        const validLocation =
          result.trackingAvailable === true &&
          result.locationStale === false &&
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          lat >= 6.0 &&
          lat <= 37.5 &&
          lng >= 68.0 &&
          lng <= 97.5;

        if (cancelled) return;

        if (validLocation) {
          setServerCoords({ lat, lng });
        } else {
          // Remove stale or invalid server coordinates.
          setServerCoords(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            'Could not refresh server driver location:',
            error
          );
        }
      }
    };

    void fetchServerLocation();

    const intervalId = setInterval(() => {
      void fetchServerLocation();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [trip?.id, trip?.status]);

  if (!trip) {
    return (
      <div className="flex-1 p-8 text-center min-h-[50vh] flex flex-col items-center justify-center">
        <h2 className="card-heading text-slate-800">
          No active trip currently assigned
        </h2>

        <p className="helper-text text-slate-500 mt-1">
          Accept a dispatched trip from your requests feed to begin navigation.
        </p>

        <Link
          to="/driver/requests"
          className="helper-text text-[#0798F2] underline mt-3 block"
        >
          Check Ride Requests
        </Link>
      </div>
    );
  }

  const route = getEstimatedRoute(trip.pickup, trip.destination);
  const statusCfg = getRideStatusConfig(trip.status);

   const handleNextStatus = async () => {
    try {
      if (trip.status === 'accepted') {
        await updateRideStatus(trip.id, 'driver_arriving');
        return;
      }

      if (trip.status === 'driver_arriving') {
        await updateRideStatus(trip.id, 'in_progress');
        return;
      }

      if (trip.status === 'in_progress') {
        if (!supabase) {
          throw new Error('Authentication service is unavailable.');
        }

        const {
          data,
          error: sessionError,
        } = await supabase.auth.getSession();

        const token = data.session?.access_token;

        if (sessionError || !token) {
          throw new Error(
            'Your session has expired. Please sign in again.'
          );
        }

        // Ask the backend to complete the ride.
        const response = await fetch(
          `/api/rides/${encodeURIComponent(trip.id)}/complete`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.success !== true) {
          throw new Error(
            result.error || 'Could not complete this trip.'
          );
        }

        // Stop GPS only after the backend confirms completion.
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(
            watchIdRef.current
          );
          watchIdRef.current = null;
        }

        navigate('/driver/completed-trips');
      }
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Ride status update failed. Please try again.'
      );
    }
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col">
      {/* Top Banner */}
      <div className="bg-[#102A43] text-white px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold">
            DRIVER CONSOLE · ACTIVE TRIP {trip.bookingCode}
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-[#FFE600] font-semibold">
            {statusCfg.label}
          </span>
        </div>

        <div className="font-bold tabular-nums">
          Payout: {formatINR(trip.fareBreakdown.total)} (
          {trip.paymentMethod === 'cash'
            ? 'Collect Cash'
            : trip.paymentStatus === 'paid'
              ? 'Paid Online'
              : 'Online (Pending Verification)'}
          )
        </div>
      </div>

      {/* GPS Status Notice */}
      {gpsPermission === 'denied' && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>GPS Access Denied:</strong> Your browser has blocked
              location permissions. Please allow location access in your
              browser site settings so passenger tracking functions properly.
            </span>
          </div>
        </div>
      )}

      {gpsPermission === 'unsupported' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Geolocation is not supported by your browser environment.
          </span>
        </div>
      )}

      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          <div className="bg-white border border-slate-200 rounded-3xl p-3 sm:p-4 shadow-sm flex-1 min-h-[420px] lg:min-h-[550px]">
            <InteractiveMap
              pickup={trip.pickup}
              destination={trip.destination}
              // Prefer valid server coordinates; otherwise use device GPS.
            driverLocation={currentCoords || serverCoords || undefined}
              routeCoordinates={route.coordinates}
              className="w-full h-full min-h-[400px] lg:min-h-[520px] rounded-2xl overflow-hidden"
            />
          </div>

          {/* Real GPS Telemetry Ribbon */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  gpsPermission === 'granted'
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-slate-300'
                }`}
              />

              <span className="font-bold text-slate-800">
                Live GPS Broadcast:{' '}
                {gpsPermission === 'granted'
                  ? 'Active'
                  : 'Awaiting Permission'}
              </span>

              {currentCoords && (
                <span className="text-slate-500 tabular-nums">
                  ({currentCoords.lat.toFixed(4)},{' '}
                  {currentCoords.lng.toFixed(4)})
                  {gpsAccuracy !== null &&
                    ` · Accuracy ±${Math.round(gpsAccuracy)}m`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-slate-500">
              {isTransmitting && (
                <span className="text-[#0798F2] flex items-center gap-1 font-semibold text-[11px]">
                  <Radio className="w-3.5 h-3.5 animate-spin" />
                  Uploading...
                </span>
              )}

              {lastTransmissionTime && (
                <span>Last Synced: {lastTransmissionTime}</span>
              )}

              {transmissionError && (
                <span className="text-rose-600 font-semibold">
                  {transmissionError}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            {/* Passenger Profile */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="card-heading text-slate-900">
                  {trip.riderName}
                </div>
                <div className="helper-text text-slate-500">
                  {trip.riderPhone}
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                  Verified Passenger
                </div>
              </div>

              <a
                href={`tel:${trip.riderPhone}`}
                className="p-3 bg-emerald-600 text-white rounded-xl shadow-sm hover:bg-emerald-700 transition-colors"
                title="Call Passenger"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>

            {/* Address Points */}
            <div className="space-y-3 helper-text">
              <div className="flex items-start gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Pickup Location
                  </div>
                  <div className="font-semibold text-slate-900">
                    {trip.pickup.address}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 mt-1" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Destination
                  </div>
                  <div className="font-semibold text-slate-900">
                    {trip.destination.address}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment & Fare Collection Instructions */}
            <div className="p-4 bg-[#E5F4FF]/50 border border-[#0798F2]/20 rounded-2xl helper-text space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>Trip Fare Total:</span>
                <span className="card-heading tabular-nums">
                  {formatINR(trip.fareBreakdown.total)}
                </span>
              </div>

              {Number(trip.fareBreakdown.airportLevyAmount || 0) > 0 && (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Included airport levy</span>
                  <strong>
                    {formatINR(
                      Number(trip.fareBreakdown.airportLevyAmount)
                    )}
                  </strong>
                </div>
              )}

              <div className="helper-text text-slate-600 flex items-center gap-1.5">
                {trip.paymentMethod === 'cash' ? (
                  <>
                    <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Collect Cash:</strong> Ask passenger for{' '}
                      {formatINR(trip.fareBreakdown.total)} on arrival.
                    </span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      <strong>Prepaid Online:</strong>{' '}
                      {trip.paymentStatus === 'paid'
                        ? 'Fare is paid. Do not collect cash.'
                        : 'Payment pending verification.'}
                    </span>
                  </>
                )}
              </div>

              <p className="text-[11px] text-slate-500">
                Road tolls are separate actual-cost adjustments. Do not collect
                or include an unverified toll in earnings.
              </p>
            </div>

            <RideTollAdjustments rideId={trip.id} role="driver" />

            {/* Status Update Trigger Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleNextStatus}
                className="w-full py-4 bg-[#FFE600] hover:bg-[#ebd300] active:scale-[0.99] text-slate-950 btn-text rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {trip.status === 'accepted' && (
                  <>
                    <Navigation className="w-4 h-4" />
                    <span>Confirm "Arrived at Pickup"</span>
                  </>
                )}

                {trip.status === 'driver_arriving' && (
                  <>
                    <Navigation className="w-4 h-4" />
                    <span>Start Journey (Passenger Boarded)</span>
                  </>
                )}

                {trip.status === 'in_progress' && (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Complete Trip &amp; Settle Fare</span>
                  </>
                )}

                {trip.status === 'completed' && (
                  <span>Trip Completed &rarr;</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
