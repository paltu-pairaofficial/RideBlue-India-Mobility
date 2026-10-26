import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ShieldCheck, AlertCircle, CheckCircle2, Clock, Upload } from 'lucide-react';
import { useRide } from '../../context/RideContext';
import { useAuth } from '../../context/AuthContext';
import { getDriverApprovalConfig } from '../../utils/formatters';

export const VehicleDocuments: React.FC = () => {
  const { drivers } = useRide();
  const { currentUser } = useAuth();
  const driver = drivers.find((d) => d.userId === currentUser?.id || d.id === currentUser?.id) || drivers[0];
  const approvalCfg = getDriverApprovalConfig(driver.approvalStatus);

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-heading text-slate-900">Vehicle Documents &amp; Compliance</h1>
            <p className="body-text text-slate-500 mt-0.5">
              West Bengal Motor Vehicles compliance documentation records.
            </p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${approvalCfg.badgeClass}`}>
            {approvalCfg.label}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* DL */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="card-heading text-slate-900">Commercial Driving License</h3>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="helper-text space-y-1 text-slate-600">
              <div>License Number: <strong className="text-slate-900">{driver.documents.licenseNumber}</strong></div>
              <div>Validity Expiry: <strong className="text-slate-900">{driver.documents.licenseExpiry}</strong></div>
              <div>Status: <span className="text-emerald-700 font-semibold">Government Verified</span></div>
            </div>
          </div>

          {/* RC */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="card-heading text-slate-900">Vehicle Registration (RC)</h3>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="helper-text space-y-1 text-slate-600">
              <div>Registration No: <strong className="text-slate-900">{driver.vehicleNumber}</strong></div>
              <div>RC Number: <strong className="text-slate-900">{driver.documents.rcNumber}</strong></div>
              <div>Permit Type: <span className="text-emerald-700 font-semibold">West Bengal State Tourist Cab</span></div>
            </div>
          </div>

          {/* Insurance */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="card-heading text-slate-900">Commercial Insurance</h3>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="helper-text space-y-1 text-slate-600">
              <div>Coverage: Comprehensive Commercial Fleet</div>
              <div>Valid Until: <strong className="text-slate-900">{driver.documents.insuranceValidUntil}</strong></div>
            </div>
          </div>

          {/* PUC */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="card-heading text-slate-900">Pollution Under Control (PUC)</h3>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="helper-text space-y-1 text-slate-600">
              <div>Certificate No: <strong className="text-slate-900">{driver.documents.pucNumber}</strong></div>
              <div>Status: <span className="text-emerald-700 font-semibold">Valid</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
