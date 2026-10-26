import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Power,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';

import { useRide } from '../../context/RideContext';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../utils/formatters';

export const AvailabilityRequests: React.FC = () => {
  const {
    drivers,
    toggleDriverOnline,
    acceptBooking,
    bookings,
  } = useRide();

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Match the signed-in user to their own driver profile.
  const driver = drivers.find(
    (d) =>
      d.userId === currentUser?.id ||
      d.id === currentUser?.id
  );

  const [activeRequestRejected, setActiveRequestRejected] =
    useState(false);
  const [actionError, setActionError] = useState<string | null>(
    null
  );
  const [isAccepting, setIsAccepting] = useState(false);


  // Stop here if this account has no matching driver profile.
  if (!driver) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold">
          Driver Profile Not Found
        </h1>

        <p className="mt-2">
          Please sign in with your registered driver account.
        </p>
      </div>
    );
  }

  // Find a real pending request from the booking state.
  const requestedBooking = bookings.find(
    (booking) => booking.status === 'requested'
  );

  const handleAccept = async () => {
    if (!requestedBooking || isAccepting) {
      return;
    }

    setActionError(null);

    if (driver.approvalStatus !== 'approved') {
      setActionError(
        'You cannot accept rides until your account is approved by an administrator.'
      );
      return;
    }

    if (!driver.isOnline) {
      setActionError(
        'Please switch your driver status to Online before accepting a ride.'
      );
      return;
    }

    try {
      setIsAccepting(true);

      const success = await acceptBooking(
        requestedBooking.id,
        driver.id
      );

      if (success) {
        navigate('/driver/active-trip');
      } else {
        setActionError(
          'This ride could not be accepted. It may have already been assigned. Please refresh and try again.'
        );
      }
    } catch (error) {
      console.error('Error accepting ride:', error);

      setActionError(
        'Unable to accept this ride right now. Please try again.'
      );
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = () => {
    setActiveRequestRejected(true);

    window.setTimeout(() => {
      setActiveRequestRejected(false);
    }, 5000);
  };

  const handleToggleOnline = async () => {
    setActionError(null);

    try {
      await toggleDriverOnline(driver.id);
    } catch (error) {
      console.error('Error updating driver availability:', error);

      setActionError(
        'Unable to update your availability. Please try again.'
      );
    }
  };

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Header and online toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-heading text-slate-900">
              Availability &amp; Ride Requests
            </h1>

            <p className="body-text text-slate-500 mt-0.5">
              Manage your availability and review passenger
              ride requests.
            </p>
          </div>

          <button
            type="button"
            disabled={driver.approvalStatus !== 'approved'}
            onClick={handleToggleOnline}
            className={`px-6 py-2.5 rounded-xl btn-text flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 ${
              driver.isOnline
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            <Power className="w-4 h-4" />

            <span>
              {driver.isOnline
                ? 'Online (Receiving Rides)'
                : 'Offline'}
            </span>
          </button>
        </div>

        {/* Error message */}
        {actionError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />

              <span className="font-semibold">
                {actionError}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-xs font-bold text-rose-600 hover:text-rose-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Driver approval status */}
        {driver.approvalStatus !== 'approved' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />

            <div>
              <div className="font-bold">
                Driver Approval Required
              </div>

              <p className="mt-1">
                Your driver account status is{' '}
                <strong>
                  {driver.approvalStatus.toUpperCase()}
                </strong>
                . An administrator must approve your account
                before you can accept passenger trips.
              </p>

              <Link
                to="/driver/verification"
                className="text-[#0798F2] font-bold underline mt-2 block"
              >
                View Verification Status →
              </Link>
            </div>
          </div>
        )}

        {/* Real booking request */}
        {driver.isOnline &&
        driver.approvalStatus === 'approved' &&
        requestedBooking &&
        !activeRequestRejected ? (
          <div className="bg-white border-2 border-[#0798F2] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />

                <span className="text-xs font-bold uppercase tracking-wider text-[#0798F2]">
                  Incoming Passenger Request
                </span>
              </div>

              <div className="text-xs text-slate-500">Available request from Supabase</div>
            </div>

            {/* Passenger and fare */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="card-heading text-slate-900">
                  {requestedBooking.riderName}
                </h2>

                <p className="helper-text text-slate-500 mt-1">
                  Passenger ride request
                </p>
              </div>

              <div className="text-right">
                <div className="text-2xl font-black text-[#102A43] tabular-nums">
                  {formatINR(
                    requestedBooking.fareBreakdown.total
                  )}
                </div>

                <div className="text-xs text-slate-400 capitalize">
                  Payment: {requestedBooking.paymentMethod}
                </div>
              </div>
            </div>

            {/* Pickup and destination */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-start gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />

                <div>
                  <div className="text-xs uppercase font-bold text-slate-400">
                    Pickup Location
                  </div>

                  <div className="font-semibold text-slate-900 mt-1">
                    {requestedBooking.pickup.address}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />

                <div>
                  <div className="text-xs uppercase font-bold text-slate-400">
                    Destination
                  </div>

                  <div className="font-semibold text-slate-900 mt-1">
                    {requestedBooking.destination.address}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-wrap justify-between gap-2 text-sm text-slate-600">
                <span>
                  Trip distance: {requestedBooking.distanceKm} km
                </span>

                <span>
                  Estimated duration:{' '}
                  {requestedBooking.estimatedDurationMin} mins
                </span>
              </div>
            </div>

            {/* Accept and decline */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={handleReject}
                disabled={isAccepting}
                className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 btn-text rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4 text-slate-500" />
                <span>Decline</span>
              </button>

              <button
                type="button"
                onClick={handleAccept}
                disabled={isAccepting}
                className="py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white btn-text rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />

                <span>
                  {isAccepting
                    ? 'Accepting...'
                    : `Accept Ride (${formatINR(
                        requestedBooking.fareBreakdown.total
                      )})`}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* No request available */
          <div className="bg-white border border-slate-200 rounded-3xl p-10 sm:p-12 text-center space-y-4">
            <Clock className="w-12 h-12 text-slate-300 mx-auto" />

            <h3 className="card-heading text-slate-800">
              {!driver.isOnline
                ? 'You are currently Offline'
                : driver.approvalStatus !== 'approved'
                  ? 'Approval Required'
                  : activeRequestRejected
                    ? 'Request temporarily hidden'
                    : 'Waiting for Passenger Requests'}
            </h3>

            <p className="body-text text-slate-500 max-w-sm mx-auto">
              {!driver.isOnline
                ? 'Switch your status to Online to become available for ride requests.'
                : driver.approvalStatus !== 'approved'
                  ? 'Your account must be approved before you can receive and accept rides.'
                  : activeRequestRejected
                    ? 'The request has been hidden temporarily. You can wait for it to appear again.'
                    : 'No pending passenger requests are currently available to display.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};