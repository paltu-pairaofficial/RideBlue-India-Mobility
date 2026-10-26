import React, { useState } from 'react';
import { User, Mail, Phone, ShieldCheck, Heart, Save, CheckCircle2 } from 'lucide-react';
import { useRide } from '../../context/RideContext';

export const RiderProfile: React.FC = () => {
  const { riderProfile, updateRiderProfile } = useRide();

  const [name, setName] = useState(riderProfile.name);
  const [email, setEmail] = useState(riderProfile.email);
  const [phone, setPhone] = useState(riderProfile.phone);
  const [emergencyName, setEmergencyName] = useState(riderProfile.emergencyContact.name);
  const [emergencyPhone, setEmergencyPhone] = useState(riderProfile.emergencyContact.phone);
  const [relationship, setRelationship] = useState(riderProfile.emergencyContact.relationship);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(false);
    setSaveError(null);
    try {
      updateRiderProfile({
        name, email, phone,
        emergencyContact: { name: emergencyName, phone: emergencyPhone, relationship },
      });
      setSavedSuccess(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Profile could not be saved.');
    }
  };

  return (
    <div className="flex-1 bg-slate-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <div>
          <h1 className="page-heading text-slate-900">Passenger Profile &amp; Emergency Contact</h1>
          <p className="body-text text-slate-500 mt-0.5">
            Manage your personal contact details, verified phone number, and emergency contacts.
          </p>
        </div>

        {saveError && <div role="alert" className="p-4 rounded-2xl bg-amber-50 border border-amber-200 helper-text text-amber-900">{saveError}</div>}

        {savedSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 helper-text text-emerald-800 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Profile information and emergency contact successfully updated.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <h2 className="card-heading text-slate-900">
              Personal Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label text-slate-700 block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20"
                />
              </div>

              <div>
                <label className="form-label text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20"
                />
              </div>

              <div>
                <label className="form-label text-slate-700 block mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20"
                />
              </div>

              <div>
                <label className="form-label text-slate-700 block mb-1">Passenger Rating</label>
                <div className="px-3.5 py-2.5 bg-slate-100 rounded-xl helper-text font-bold text-amber-600">
                  {riderProfile.rating > 0 ? `★ ${riderProfile.rating} / 5.0` : 'No rating recorded'}
                </div>
              </div>
            </div>
          </div>

          {/* Emergency SOS Contact Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-rose-600" />
              <h2 className="card-heading text-slate-900">
                Emergency SOS Broadcast Contact
              </h2>
            </div>
            <p className="body-text text-slate-500">
              Emergency-contact persistence and dispatch integration are not configured. Do not rely on this form to notify anyone during an emergency.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="form-label text-slate-700 block mb-1">Contact Name</label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20"
                />
              </div>

              <div>
                <label className="form-label text-slate-700 block mb-1">Emergency Mobile</label>
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20"
                />
              </div>

              <div>
                <label className="form-label text-slate-700 block mb-1">Relationship</label>
                <input
                  type="text"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0798F2]/20"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-8 py-3 bg-[#0798F2] hover:bg-[#0570B5] text-white btn-text rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Profile Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
