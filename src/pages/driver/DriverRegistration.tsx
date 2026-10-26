// import React, { useState } from 'react';
// import { useNavigate, Link } from 'react-router-dom';
// import {
//   FileText,
//   Upload,
//   CheckCircle2,
//   AlertCircle,
//   ShieldCheck,
//   ArrowRight,
//   Car,
//   User,
//   CreditCard,
// } from 'lucide-react';
// import { useRide } from '../../context/RideContext';
// import { VEHICLE_CATEGORIES } from '../../data/vehicleCategories';
// import { VehicleCategoryType } from '../../types';

// export const DriverRegistration: React.FC = () => {
//   const navigate = useNavigate();
//   const { updateDriverDocuments } = useRide();

//   const [step, setStep] = useState<1 | 2 | 3>(1);
//   const [name, setName] = useState('Subir Chatterjee');
//   const [phone, setPhone] = useState('+91 98310 99881');
//   const [email, setEmail] = useState('subir.driver@rideblue.in');

//   const [vehicleCategory, setVehicleCategory] = useState<VehicleCategoryType>('sedan');
//   const [vehicleModel, setVehicleModel] = useState('Maruti Suzuki Dzire VXI');
//   const [vehicleNumber, setVehicleNumber] = useState('WB 02 BB 9912');
//   const [year, setYear] = useState('2023');

//   const [licenseNumber, setLicenseNumber] = useState('WB-01-2017-0091823');
//   const [licenseExpiry, setLicenseExpiry] = useState('2031-10-15');
//   const [rcNumber, setRcNumber] = useState('WB02BB9912/2023');
//   const [pucNumber, setPucNumber] = useState('PUC-WB-991238');

//   const [submitting, setSubmitting] = useState(false);
//   const [success, setSuccess] = useState(false);

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     setSubmitting(true);

//     setTimeout(() => {
//       setSubmitting(false);
//       setSuccess(true);
//       // Update pending driver records
//       updateDriverDocuments('drv-2', {
//         licenseNumber,
//         licenseExpiry,
//         rcNumber,
//         pucNumber,
//         licenseVerified: false,
//         rcVerified: false,
//       });
//     }, 600);
//   };

//   return (
//     <div className="flex-1 bg-slate-50 py-12">
//       <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
//         <div className="text-center space-y-2">
//           <span className="text-xs font-bold uppercase tracking-wider text-[#0798F2]">
//             Join RideBlue Fleet
//           </span>
//           <h1 className="page-heading text-[#102A43] tracking-tight">
//             Driver Partner Onboarding
//           </h1>
//           <p className="body-text text-slate-500">
//             Earn up to ₹45,000/month driving with West Bengal's fastest-growing professional cab network.
//           </p>
//         </div>

//         {/* Multi-step Stepper */}
//         <div className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between helper-text font-semibold text-slate-500">
//           <span className={step >= 1 ? 'text-[#0798F2] font-bold' : ''}>1. Personal Info</span>
//           <span>&rarr;</span>
//           <span className={step >= 2 ? 'text-[#0798F2] font-bold' : ''}>2. Vehicle Details</span>
//           <span>&rarr;</span>
//           <span className={step >= 3 ? 'text-[#0798F2] font-bold' : ''}>3. Official Documents</span>
//         </div>

//         {success ? (
//           <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
//             <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
//               <CheckCircle2 className="w-8 h-8" />
//             </div>
//             <h2 className="card-heading text-slate-900">Application Submitted for Review</h2>
//             <p className="body-text text-slate-600 max-w-md mx-auto leading-relaxed">
//             </p>
//             <div className="pt-4 flex justify-center gap-3">
//               <Link
//                 to="/driver/verification"
//                 className="px-6 py-3 bg-[#0798F2] text-white btn-text rounded-xl shadow-md"
//               >
//                 Check Verification Status
//               </Link>
//               <Link
//                 to="/driver/dashboard"
//                 className="px-6 py-3 bg-slate-100 text-slate-700 btn-text rounded-xl"
//               >
//                 Driver Dashboard
//               </Link>
//             </div>
//           </div>
//         ) : (
//           <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
//             {step === 1 && (
//               <div className="space-y-4">
//                 <h3 className="card-heading text-slate-900">Step 1: Personal &amp; Contact Details</h3>
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                   <div>
//                     <label className="form-label text-slate-700 block mb-1">Full Legal Name *</label>
//                     <input
//                       type="text"
//                       value={name}
//                       onChange={(e) => setName(e.target.value)}
//                       required
//                       className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900"
//                     />
//                   </div>
//                   <div>
//                     <label className="form-label text-slate-700 block mb-1">Phone Number (Aadhaar linked) *</label>
//                     <input
//                       type="tel"
//                       value={phone}
//                       onChange={(e) => setPhone(e.target.value)}
//                       required
//                       className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900"
//                     />
//                   </div>
//                   <div className="sm:col-span-2">
//                     <label className="form-label text-slate-700 block mb-1">Email Address *</label>
//                     <input
//                       type="email"
//                       value={email}
//                       onChange={(e) => setEmail(e.target.value)}
//                       required
//                       className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900"
//                     />
//                   </div>
//                 </div>

//                 <div className="flex justify-end pt-4">
//                   <button
//                     type="button"
//                     onClick={() => setStep(2)}
//                     className="px-6 py-2.5 bg-[#0798F2] text-white btn-text rounded-xl flex items-center gap-2"
//                   >
//                     <span>Next: Vehicle Details</span>
//                     <ArrowRight className="w-4 h-4" />
//                   </button>
//                 </div>
//               </div>
//             )}

//             {step === 2 && (
//               <div className="space-y-4">
//                 <h3 className="card-heading text-slate-900">Step 2: Vehicle Information</h3>
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                   <div>
//                     <label className="form-label text-slate-700 block mb-1">Vehicle Category</label>
//                     <select
//                       value={vehicleCategory}
//                       onChange={(e) => setVehicleCategory(e.target.value as VehicleCategoryType)}
//                       className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900"
//                     >
//                       <option value="economy">Economy (Hatchback)</option>
//                       <option value="sedan">Sedan (Dzire, Amaze)</option>
//                       <option value="suv">SUV (Ertiga, Triber)</option>
//                       <option value="xl">XL (Innova, Crysta)</option>
//                       <option value="airport_transfer">Dedicated Airport Fleet</option>
//                     </select>
//                   </div>
//                   <div>
//                     <label className="form-label text-slate-700 block mb-1">Vehicle Make &amp; Model</label>
//                     <input
//                       type="text"
//                       value={vehicleModel}
//                       onChange={(e) => setVehicleModel(e.target.value)}
//                       required
//                       className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900"
//                     />
//                   </div>
//                   <div>
//                     <label className="form-label text-slate-700 block mb-1">Registration Plate Number *</label>
//                     <input
//                       type="text"
//                       value={vehicleNumber}
//                       onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
//                       placeholder="e.g. WB 02 AR 4421"
//                       required
//                       className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900 uppercase"
//                     />
//                   </div>
//                   <div>
//                     <label className="form-label text-slate-700 block mb-1">Year of Manufacture</label>
//                     <input
//                       type="number"
//                       value={year}
//                       onChange={(e) => setYear(e.target.value)}
//                       min="2016"
//                       max="2026"
//                       required
//                       className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900"
//                     />
//                   </div>
//                 </div>

//                 <div className="flex justify-between pt-4">
//                   <button
//                     type="button"
//                     onClick={() => setStep(1)}
//                     className="px-4 py-2 btn-text text-slate-600"
//                   >
//                     &larr; Back
//                   </button>
//                   <button
//                     type="button"
//                     onClick={() => setStep(3)}
//                     className="px-6 py-2.5 bg-[#0798F2] text-white btn-text rounded-xl flex items-center gap-2"
//                   >
//                     <span>Next: Upload Documents</span>
//                     <ArrowRight className="w-4 h-4" />
//                   </button>
//                 </div>
//               </div>
//             )}

//             {step === 3 && (
//               <div className="space-y-4">
//                 <div className="flex items-center gap-2">
//                   <ShieldCheck className="w-5 h-5 text-emerald-600" />
//                   <h3 className="card-heading text-slate-900">Step 3: Documents &amp; Verification Submission</h3>
//                 </div>

//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                   <div>
//                     <label className="form-label text-slate-700 block mb-1">Commercial DL Number *</label>
//                     <input
//                       type="text"
//                       value={licenseNumber}
//                       onChange={(e) => setLicenseNumber(e.target.value)}
//                       placeholder="WB-01-2015-0089211"
//                       required
//                       className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900"
//                     />
//                   </div>
//                   <div>
//                     <label className="form-label text-slate-700 block mb-1">DL Valid Until *</label>
//                     <input
//                       type="date"
//                       value={licenseExpiry}
//                       onChange={(e) => setLicenseExpiry(e.target.value)}
//                       required
//                       className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900"
//                     />
//                   </div>
//                   <div>
//                     <label className="form-label text-slate-700 block mb-1">Vehicle RC Number *</label>
//                     <input
//                       type="text"
//                       value={rcNumber}
//                       onChange={(e) => setRcNumber(e.target.value)}
//                       placeholder="WB02AR4421/2023"
//                       required
//                       className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900"
//                     />
//                   </div>
//                   <div>
//                     <label className="form-label text-slate-700 block mb-1">Pollution (PUC) Cert No.</label>
//                     <input
//                       type="text"
//                       value={pucNumber}
//                       onChange={(e) => setPucNumber(e.target.value)}
//                       placeholder="PUC-WB-771290"
//                       required
//                       className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl helper-text text-slate-900"
//                     />
//                   </div>
//                 </div>

//                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
//                   <div className="helper-text text-slate-500 flex items-center gap-2">
//                     <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
//                     <span>Commercial_Driving_License_Front_Back.pdf (Attached)</span>
//                   </div>
//                   <div className="helper-text text-slate-500 flex items-center gap-2">
//                     <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
//                     <span>Vehicle_RC_Commercial_Permit.pdf (Attached)</span>
//                   </div>
//                 </div>

//                 <div className="flex justify-between pt-4">
//                   <button
//                     type="button"
//                     onClick={() => setStep(2)}
//                     className="px-4 py-2 btn-text text-slate-600"
//                   >
//                     &larr; Back
//                   </button>
//                   <button
//                     type="submit"
//                     disabled={submitting}
//                     className="px-8 py-3 bg-[#FFE600] text-slate-950 btn-text rounded-xl shadow-md disabled:opacity-50"
//                   >
//                     {submitting ? 'Submitting Application...' : 'Submit Application to Admin'}
//                   </button>
//                 </div>
//               </div>
//             )}
//           </form>
//         )}
//       </div>
//     </div>
//   );
// };



import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Car,
  User,
  FileText,
} from 'lucide-react';

import { useRide } from '../../context/RideContext';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured, supabase } from '../../supabase/client';
import type { VehicleCategoryType } from '../../types';

export const DriverRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, authReady, isAuthenticated } = useAuth();
  const { refreshData } = useRide();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [vehicleCategory, setVehicleCategory] =
    useState<VehicleCategoryType>('sedan');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [year, setYear] = useState('');

  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [rcNumber, setRcNumber] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [pucNumber, setPucNumber] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [driverId, setDriverId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isAuthenticated || !currentUser) {
      setErrorMessage('Please sign in before submitting your driver application.');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage('Supabase is not configured. Please contact support.');
      return;
    }

    if (currentUser.role !== 'driver') {
      setErrorMessage('Please sign in with your driver account.');
      return;
    }

    const vehicleYear = Number(year);

    if (
      !Number.isInteger(vehicleYear) ||
      vehicleYear < 2015 ||
      vehicleYear > new Date().getFullYear()
    ) {
      setErrorMessage('Enter a valid vehicle manufacture year.');
      return;
    }

    if (
      !vehicleModel.trim() ||
      !vehicleNumber.trim() ||
      !licenseNumber.trim() ||
      !licenseExpiry ||
      !rcNumber.trim() ||
      !insuranceExpiry
    ) {
      setErrorMessage('Please complete all required vehicle and document fields.');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    if (licenseExpiry < today || insuranceExpiry < today) {
      setErrorMessage('Your driving licence and insurance must not be expired.');
      return;
    }

    setSubmitting(true);

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, role')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        throw new Error('Your RideBlue profile was not found. Please sign in again.');
      }

      if (profile.role !== 'driver') {
        throw new Error('Your database profile is not marked as a driver.');
      }

      const application = {
        profile_id: profile.id,
        vehicle_category: vehicleCategory,
        vehicle_make_model: vehicleModel.trim(),
        vehicle_plate: vehicleNumber.trim().toUpperCase(),
        vehicle_year: vehicleYear,
        license_number: licenseNumber.trim().toUpperCase(),
        license_expiry: licenseExpiry,
        rc_number: rcNumber.trim().toUpperCase(),
        insurance_expiry: insuranceExpiry,
        puc_number: pucNumber.trim() || null,
        approval_status: 'pending',
        rejection_reason: null,
        is_online: false,
      };

      const { data: existingDriver, error: existingError } = await supabase
        .from('drivers')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (existingError) throw existingError;

      let savedDriver: { id: string } | null = null;

      if (existingDriver) {
        const { data, error } = await supabase
          .from('drivers')
          .update(application)
          .eq('id', existingDriver.id)
          .select('id')
          .single();

        if (error) throw error;
        savedDriver = data;
      } else {
        const { data, error } = await supabase
          .from('drivers')
          .insert(application)
          .select('id')
          .single();

        if (error) throw error;
        savedDriver = data;
      }

      setDriverId(savedDriver.id);

      try {
        await refreshData();
      } catch (refreshError) {
        console.error('Application saved, but refresh failed:', refreshError);
      }

      setSuccess(true);
    } catch (error: unknown) {
      console.error('Driver registration failed:', error);

      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred.';

      if (
        message.toLowerCase().includes('duplicate key') ||
        message.toLowerCase().includes('unique constraint')
      ) {
        setErrorMessage(
          'A vehicle plate, licence number, or RC number may already be registered. Check your details.'
        );
      } else if (
        message.toLowerCase().includes('row-level security') ||
        message.toLowerCase().includes('permission denied')
      ) {
        setErrorMessage(
          'Supabase security policies blocked the save. Your application was not confirmed as saved.'
        );
      } else {
        setErrorMessage(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!authReady) {
    return (
      <div className="flex-1 bg-slate-50 py-12 text-center text-slate-600">
        Checking your account...
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="flex-1 bg-slate-50 py-12">
        <div className="max-w-xl mx-auto px-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center">
            <User className="w-10 h-10 mx-auto text-[#0798F2]" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Sign in to continue
            </h1>
            <p className="mt-2 text-slate-600">
              Sign in with your RideBlue driver account before completing registration.
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

  return (
    <div className="flex-1 bg-slate-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0798F2]">
            Join RideBlue Fleet
          </span>
          <h1 className="page-heading text-[#102A43] tracking-tight">
            Driver Partner Onboarding
          </h1>
          <p className="body-text text-slate-500">
            Submit your real vehicle and document details for administrator review.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap justify-between gap-2 text-sm font-semibold text-slate-500">
          <span className={step >= 1 ? 'text-[#0798F2] font-bold' : ''}>
            1. Personal Info
          </span>
          <span>→</span>
          <span className={step >= 2 ? 'text-[#0798F2] font-bold' : ''}>
            2. Vehicle Details
          </span>
          <span>→</span>
          <span className={step >= 3 ? 'text-[#0798F2] font-bold' : ''}>
            3. Official Documents
          </span>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {success ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Application Saved Successfully
            </h2>
            <p className="text-slate-600 max-w-md mx-auto">
              Your driver application is saved and is pending administrator review.
            </p>
            {driverId && (
              <p className="text-sm text-slate-500 break-all">
                Application record: {driverId}
              </p>
            )}
            <p className="text-sm text-amber-700">
              You cannot accept rides until an administrator approves your application.
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-3">
              <Link
                to="/driver/verification"
                className="px-6 py-3 bg-[#0798F2] text-white rounded-xl font-semibold"
              >
                Check Verification Status
              </Link>
              <button
                type="button"
                onClick={() => navigate('/driver/dashboard')}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold"
              >
                Driver Dashboard
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
          >
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[#0798F2]" />
                  <h3 className="text-lg font-bold text-slate-900">
                    Step 1: Personal & Contact Details
                  </h3>
                </div>

                <p className="text-sm text-slate-500">
                  These details come from your signed-in RideBlue account.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-slate-700">
                      Full Name
                    </label>
                    <input
                      value={currentUser.name}
                      readOnly
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-slate-700">
                      Phone Number
                    </label>
                    <input
                      value={currentUser.phone || ''}
                      readOnly
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-700"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block mb-1 text-sm font-medium text-slate-700">
                      Email Address
                    </label>
                    <input
                      value={currentUser.email}
                      readOnly
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-700"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-6 py-2.5 bg-[#0798F2] text-white font-semibold rounded-xl flex items-center gap-2"
                  >
                    Next: Vehicle Details <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-[#0798F2]" />
                  <h3 className="text-lg font-bold text-slate-900">
                    Step 2: Vehicle Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-slate-700">
                      Vehicle Category *
                    </label>
                    <select
                      value={vehicleCategory}
                      onChange={(e) =>
                        setVehicleCategory(e.target.value as VehicleCategoryType)
                      }
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900"
                    >
                      <option value="economy">Economy (Hatchback)</option>
                      <option value="sedan">Sedan</option>
                      <option value="suv">SUV</option>
                      <option value="xl">XL</option>
                      <option value="airport_transfer">Airport Transfer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-slate-700">
                      Vehicle Make & Model *
                    </label>
                    <input
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      placeholder="Enter actual vehicle model"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-slate-700">
                      Registration Plate Number *
                    </label>
                    <input
                      value={vehicleNumber}
                      onChange={(e) =>
                        setVehicleNumber(e.target.value.toUpperCase())
                      }
                      placeholder="e.g. WB 02 AR 4421"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-slate-700">
                      Year of Manufacture *
                    </label>
                    <input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      min="2015"
                      max={new Date().getFullYear()}
                      placeholder="e.g. 2023"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-slate-600 font-semibold"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !vehicleModel.trim() ||
                        !vehicleNumber.trim() ||
                        !year ||
                        Number(year) < 2015 ||
                        Number(year) > new Date().getFullYear()
                      ) {
                        setErrorMessage('Complete the required vehicle details first.');
                        return;
                      }
                      setErrorMessage('');
                      setStep(3);
                    }}
                    className="px-6 py-2.5 bg-[#0798F2] text-white font-semibold rounded-xl flex items-center gap-2"
                  >
                    Next: Documents <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-bold text-slate-900">
                    Step 3: Documents & Verification
                  </h3>
                </div>

                <p className="text-sm text-slate-500">
                  Enter details exactly as printed on your actual documents.
                  This form records the details but does not upload document scans.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-slate-700">
                      Driving Licence Number *
                    </label>
                    <input
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="Enter licence number"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-slate-700">
                      Licence Valid Until *
                    </label>
                    <input
                      type="date"
                      value={licenseExpiry}
                      onChange={(e) => setLicenseExpiry(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-slate-700">
                      Vehicle RC Number *
                    </label>
                    <input
                      value={rcNumber}
                      onChange={(e) => setRcNumber(e.target.value)}
                      placeholder="Enter actual RC number"
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-sm font-medium text-slate-700">
                      Insurance Valid Until *
                    </label>
                    <input
                      type="date"
                      value={insuranceExpiry}
                      onChange={(e) => setInsuranceExpiry(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block mb-1 text-sm font-medium text-slate-700">
                      Pollution Certificate (PUC) Number
                    </label>
                    <input
                      value={pucNumber}
                      onChange={(e) => setPucNumber(e.target.value)}
                      placeholder="Enter PUC number if available"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900"
                    />
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
                    <FileText className="w-4 h-4" />
                    Document upload is not enabled yet
                  </div>
                  <p className="text-sm text-amber-800">
                    No PDF or image files are attached by this form. Your document
                    details will remain pending review.
                  </p>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 text-slate-600 font-semibold"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3 bg-[#FFE600] text-slate-950 font-bold rounded-xl shadow-md disabled:opacity-50"
                  >
                    {submitting ? 'Saving Application...' : 'Submit Application'}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};