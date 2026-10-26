import React, { useState } from 'react';
import { User, Mail, Phone, Car, ShieldCheck, Save, CheckCircle2 } from 'lucide-react';
import { useRide } from '../../context/RideContext';
import { useAuth } from '../../context/AuthContext';

export const DriverProfile: React.FC = () => {
  const { drivers } = useRide();
  const { currentUser } = useAuth();
  const driver = drivers.find((d) => d.userId === currentUser?.id || d.id === currentUser?.id) || drivers[0];

  const [phone, setPhone] = useState(driver.phone);
  const [email, setEmail] = useState(driver.email);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <div>
          <h1 className="page-heading text-slate-900">Driver Partner Profile</h1>
          <p className="body-text text-slate-500 mt-0.5">
            Personal credentials, verified vehicle parameters, and contact phone.
          </p>
        </div>

        {saved && (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 helper-text text-emerald-800 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Driver profile successfully updated.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-[#E5F4FF] text-[#0798F2] flex items-center justify-center font-bold text-2xl">
              {driver.name.charAt(0)}
            </div>
            <div>
              <h2 className="card-heading text-slate-900">{driver.name}</h2>
              <div className="helper-text text-slate-500">
                Partner since {driver.joinedDate} · {driver.totalTrips} Trips
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label text-slate-700 block mb-1">Mobile Contact</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900"
              />
            </div>

            <div>
              <label className="form-label text-slate-700 block mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900"
              />
            </div>

            <div>
              <label className="form-label text-slate-700 block mb-1">Vehicle Model</label>
              <div className="px-3.5 py-2.5 bg-slate-100 rounded-xl helper-text font-semibold text-slate-800">
                {driver.vehicleModel}
              </div>
            </div>

            <div>
              <label className="form-label text-slate-700 block mb-1">Plate Number</label>
              <div className="px-3.5 py-2.5 bg-slate-100 rounded-xl helper-text font-bold text-slate-800">
                {driver.vehicleNumber}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#0798F2] hover:bg-[#0570B5] text-white btn-text rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
