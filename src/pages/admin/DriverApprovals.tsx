import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle, FileText, Search, X } from 'lucide-react';
import { useRide } from '../../context/RideContext';
import { DriverProfile, DriverApprovalStatus } from '../../types';
import { getDriverApprovalConfig } from '../../utils/formatters';

export const DriverApprovals: React.FC = () => {
  const { drivers, updateDriverApproval, refreshData } = useRide();

  useEffect(() => {
    void refreshData();
  }, [refreshData]);
  const [selectedDriver, setSelectedDriver] = useState<DriverProfile | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionType, setActionType] = useState<'reject' | 'correction' | null>(null);

  const handleApprove = (driverId: string) => {
    updateDriverApproval(driverId, 'approved');
    setSelectedDriver(null);
  };

  const handleRejectOrCorrect = () => {
    if (!selectedDriver || !actionType) return;
    const status: DriverApprovalStatus = actionType === 'reject' ? 'rejected' : 'correction_required';
    updateDriverApproval(selectedDriver.id, status, rejectReason || 'Incomplete or unverified document');
    setActionType(null);
    setRejectReason('');
    setSelectedDriver(null);
  };

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="page-heading text-slate-900">Driver &amp; Vehicle Approvals</h1>
          <p className="body-text text-slate-500 mt-0.5">
            Audit commercial permits, driving licenses, and grant platform dispatch authorizations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map((drv) => {
            const cfg = getDriverApprovalConfig(drv.approvalStatus);
            return (
              <div
                key={drv.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="card-heading text-slate-900">{drv.name}</h3>
                      <div className="helper-text text-slate-500">{drv.phone}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${cfg.badgeClass}`}>
                      {cfg.label}
                    </span>
                  </div>

                  <div className="mt-4 p-3 bg-slate-50 rounded-2xl space-y-1.5 helper-text">
                    <div>Vehicle: <strong className="text-slate-800">{drv.vehicleModel}</strong></div>
                    <div>Registration: <strong className="text-slate-800">{drv.vehicleNumber}</strong></div>
                    <div>License No: <span className="text-slate-600">{drv.documents.licenseNumber}</span></div>
                    <div>RC Permit: <span className="text-slate-600">{drv.documents.rcNumber}</span></div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDriver(drv)}
                    className="w-full py-2 bg-slate-100 hover:bg-[#E5F4FF] hover:text-[#0798F2] text-slate-800 btn-text rounded-xl transition-colors"
                  >
                    Audit Application
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Audit Modal */}
        {selectedDriver && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  setSelectedDriver(null);
                  setActionType(null);
                }}
                className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Driver Verification</span>
                <h2 className="card-heading text-slate-900 mt-0.5">{selectedDriver.name}</h2>
                <p className="helper-text text-slate-500">Applicant ID: {selectedDriver.id} · West Bengal Transport Pool</p>
              </div>

              {/* Compliance checklist */}
              <div className="space-y-2 helper-text">
                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                  <span>Commercial Driving License ({selectedDriver.documents.licenseNumber})</span>
                  <span className="text-emerald-700 font-bold">Expires: {selectedDriver.documents.licenseExpiry}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                  <span>Vehicle Registration Certificate ({selectedDriver.documents.rcNumber})</span>
                  <span className="text-emerald-700 font-bold">{selectedDriver.vehicleNumber}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                  <span>Commercial Insurance &amp; PUC</span>
                  <span className="text-emerald-700 font-bold">Valid &amp; Audited</span>
                </div>
              </div>

              {/* Reject / Correct Reason Input */}
              {actionType && (
                <div className="space-y-2 p-4 bg-rose-50 border border-rose-200 rounded-2xl helper-text">
                  <label className="form-label text-rose-900 block">
                    Reason for {actionType === 'reject' ? 'Rejection' : 'Correction Request'}:
                  </label>
                  <textarea
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Commercial DL scan blurry, please re-upload valid copy..."
                    className="w-full p-2 bg-white border border-rose-300 rounded-xl helper-text"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActionType(null)}
                      className="px-3 py-1 bg-white text-slate-600 btn-text rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectOrCorrect}
                      className="px-4 py-1 bg-rose-600 text-white btn-text rounded-lg"
                    >
                      Confirm {actionType === 'reject' ? 'Rejection' : 'Correction'}
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              {!actionType && (
                <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setActionType('correction')}
                    className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 btn-text rounded-xl"
                  >
                    Request Correction
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('reject')}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 btn-text rounded-xl"
                  >
                    Reject Application
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedDriver.id)}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white btn-text rounded-xl shadow-md"
                  >
                    Approve Driver Partner
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
