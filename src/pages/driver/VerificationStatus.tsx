
import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';

import { useRide } from '../../context/RideContext';
import { useAuth } from '../../context/AuthContext';
import { getDriverApprovalConfig } from '../../utils/formatters';

export const VerificationStatus: React.FC = () => {
  const { drivers } = useRide();
  const { currentUser, authReady, isAuthenticated } = useAuth();

  // Wait for authentication to finish loading.
  if (!authReady) {
    return (
      <div className="flex-1 bg-slate-50 py-12 text-center text-slate-600">
        Loading your verification status...
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="flex-1 bg-slate-50 py-12">
        <div className="max-w-xl mx-auto px-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center">
            <h1 className="text-xl font-bold text-slate-900">
              Sign In Required
            </h1>
            <p className="mt-3 text-slate-600">
              Sign in to view your driver verification status.
            </p>
            <Link
              to="/auth/sign-in"
              className="inline-flex mt-5 px-6 py-3 bg-[#0798F2] text-white rounded-xl font-semibold"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Never fall back to another driver's record.
  const driver = drivers.find(
    (item) => item.userId === currentUser.id
  );

  if (!driver) {
    return (
      <div className="flex-1 bg-slate-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center">
            <Clock className="w-10 h-10 mx-auto text-amber-500" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Driver Application Not Found
            </h1>
            <p className="mt-3 text-slate-600">
              We could not find a driver application linked to your account.
              If you have submitted an application, refresh the page or
              contact RideBlue support.
            </p>
            <Link
              to="/driver/register"
              className="inline-flex mt-5 px-6 py-3 bg-[#0798F2] text-white rounded-xl font-semibold"
            >
              Driver Registration
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const cfg = getDriverApprovalConfig(driver.approvalStatus);
  const isApproved = driver.approvalStatus === 'approved';
  const isRejected = driver.approvalStatus === 'rejected';

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div>
          <h1 className="page-heading text-slate-900">
            Verification &amp; Eligibility Status
          </h1>
          <p className="body-text text-slate-500 mt-1">
            Your driver application status from RideBlue.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                isApproved
                  ? 'bg-emerald-100 text-emerald-600'
                  : isRejected
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-amber-100 text-amber-600'
              }`}
            >
              {isApproved ? (
                <ShieldCheck className="w-8 h-8" />
              ) : isRejected ? (
                <AlertTriangle className="w-8 h-8" />
              ) : (
                <Clock className="w-8 h-8" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="card-heading text-slate-900">
                  {driver.name}
                </h2>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${cfg.badgeClass}`}
                >
                  {cfg.label}
                </span>
              </div>

              <p className="text-sm text-slate-500 mt-1">
                Vehicle: {driver.vehicleModel} ({driver.vehicleNumber})
              </p>
            </div>
          </div>

          {isApproved ? (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-sm text-emerald-800 space-y-1">
              <div className="font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Administrator Approval Recorded
              </div>
              <p>
                Your driver record is marked as approved. This page
                displays the recorded status; it does not independently
                verify your documents or background check.
              </p>
            </div>
          ) : isRejected ? (
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-sm text-rose-800 space-y-1">
              <div className="font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Application Rejected
              </div>
              <p>
                Your application is marked as rejected. Please contact
                RideBlue administration for the reason and next steps.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-sm text-amber-800 space-y-1">
              <div className="font-bold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending Administrator Review
              </div>
              <p>
                Your application is awaiting review. You must not accept
                passenger rides until an authorized administrator approves
                your application.
              </p>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <h3 className="card-heading text-slate-900">
              Compliance Checklist
            </h3>

            {[
              'Commercial Driving Licence',
              'Vehicle Registration Certificate (RC)',
              'Insurance and other required documents',
              'Background Check',
            ].map((label) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl"
              >
                <span className="text-sm text-slate-700">{label}</span>
                <span
                  className={`text-sm font-semibold ${
                    isApproved
                      ? 'text-emerald-600'
                      : isRejected
                        ? 'text-rose-600'
                        : 'text-amber-600'
                  }`}
                >
                  {isApproved
                    ? 'Approval Recorded'
                    : isRejected
                      ? 'Rejected'
                      : 'Pending Review'}
                </span>
              </div>
            ))}

            <p className="text-xs text-slate-500">
              Individual document checks are not independently recorded by
              this page. The status above reflects the overall driver
              application status.
            </p>
          </div>

          <Link
            to="/driver/dashboard"
            className="inline-flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Driver Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
