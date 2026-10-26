import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  MapPin,
  Clock,
  Calendar,
  Users,
  Compass,
  CreditCard,
  PhoneCall,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { CarHero3D } from '../../components/visuals/CarHero3D';
import { LocationAutocomplete } from '../../components/maps/LocationAutocomplete';
import { VehicleVisual } from '../../components/visuals/VehicleVisual';
import { LocationPoint, VehicleCategoryType } from '../../types';

import { VEHICLE_CATEGORIES } from '../../data/vehicleCategories';
import RideBlueHero from "../../components/RideBlueHero";

export const Home: React.FC = () => {
  const navigate = useNavigate();

  // Quick booking state in hero
  const [pickup, setPickup] = useState<LocationPoint | null>({
    address: 'Howrah Railway Station, Station Rd, Howrah, WB 711101',
    landmark: 'Central Terminus',
    lat: 22.5857,
    lng: 88.3426,
  });
  const [destination, setDestination] = useState<LocationPoint | null>({
    address: 'Salt Lake Sector V, Bidhannagar, Kolkata 700091',
    landmark: 'RDB Boulevard',
    lat: 22.5735,
    lng: 88.4331,
  });
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [bookingDate, setBookingDate] = useState<string>('');
  const [bookingTime, setBookingTime] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup) {
      setFormError('Please select a valid pickup location in India.');
      return;
    }
    if (!destination) {
      setFormError('Please select a destination point.');
      return;
    }
    setFormError(null);

    // Pass data into dedicated booking workflow via state
    navigate('/rider/book', {
      state: {
        initialPickup: pickup,
        initialDestination: destination,
        passengerCount,
        bookingDate,
        bookingTime,
      },
    });
  };

 
  return (
    <div className="flex flex-col w-full">
      {/* 2. SPLIT HERO SECTION WITH QUICK BOOKING FORM */}


      <RideBlueHero
        onFindRide={({ pickup, destination, rideType }) => {
          navigate("/rider/book", {
            state: {
              initialPickup: {
                address: pickup,
                landmark: "",
                lat: 0,
                lng: 0,
              },
              initialDestination: {
                address: destination,
                landmark: "",
                lat: 0,
                lng: 0,
              },
              rideType,
            },
          });
        }}
      />

    
      {/* 3. ROUTE BOOKING SECTION */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-xs font-bold uppercase tracking-wider text-[#0798F2] mb-1">
              Travel Across India
            </div>

            <h2 className="page-heading text-[#102A43]">
              Plan Your Next Journey
            </h2>

            <p className="helper-text text-slate-500 mt-2">
              Enter your pickup and destination to start booking your ride
              and check the fare available for your journey.
            </p>

            <Link
              to="/rider/book"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0798F2] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#0570B5] hover:-translate-y-0.5"
            >
              Book Your Ride
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>


      {/* 4. VEHICLE CATEGORIES */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-xs font-bold uppercase tracking-wider text-[#0798F2] mb-1">
              Fleet Options
            </div>
            <h2 className="page-heading text-[#102A43]">
              Choose the Right Ride for Your Journey
            </h2>
            <p className="helper-text text-slate-500 mt-2">
              From everyday hatchback commutes to spacious SUVs and dedicated CCU airport transfers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
            {VEHICLE_CATEGORIES.map((cat) => (
              <div
                key={cat.id}

                className={`bg-white border rounded-2xl p-4 flex flex-col justify-between
  transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group
  ${[
                    "border-slate-200 hover:bg-[#563D0A]/10 hover:border-[#563D0A]",
                    "border-slate-200 hover:bg-[#7A7515]/10 hover:border-[#7A7515]",
                    "border-slate-200 hover:bg-[#C6B21B]/15 hover:border-[#C6B21B]",
                    "border-slate-200 hover:bg-[#DEDCCE] hover:border-[#C4C0AF]",
                    "border-slate-200 hover:bg-[#9C9D86]/20 hover:border-[#9C9D86]",
                  ][VEHICLE_CATEGORIES.findIndex((item) => item.id === cat.id) % 5]
                  }`}

              >
                <div>

                  <img
                    src={
                      `/rideblue_assets/${({
                        hatchback: "hatchback.png",
                        sedan: "sedan.png",
                        suv: "suv.png",
                        premium: "premium.png",
                        "airport-transfer": "airport-transfer.png",
                      } as Record<string, string>)[String(cat.id)] ?? "sedan.png"
                      }`
                    }
                    alt={cat.name}
                    className="w-full h-24 mb-3 object-contain transition-transform duration-300 group-hover:scale-105"
                  />

                  <div className="flex items-center justify-between mb-1">
                    <h3 className="card-heading text-slate-900">{cat.name}</h3>
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      Capacity confirmed by active fare rules
                    </span>
                  </div>
                  <p className="helper-text text-slate-500 line-clamp-2 mb-3">
                    {cat.tagline}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="text-[11px] text-slate-500">
                    Luggage: <span className="font-medium text-slate-700">{cat.luggage}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400">Production rate</div>
                      <div className="text-xs font-bold text-slate-900 tabular-nums">
                        Pricing temporarily unavailable
                      </div>
                    </div>
                    <Link
                      to="/rider/book"
                      className="p-1.5 rounded-lg bg-[#E5F4FF] text-[#0798F2] group-hover:bg-[#0798F2] group-hover:text-white transition-colors"
                      title="Select this vehicle"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. HOW RIDEBLUE WORKS */}
      <section className="relative isolate overflow-hidden py-16 border-b border-slate-200">

        {/* City background image */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{
            backgroundImage: "url('/rideblue_assets/how-rideblue-city.jpg')",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-white/85"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{
            backgroundImage: "url('/rideblue_assets/how-rideblue-city.jpg')",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-white/85"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-xs font-bold uppercase tracking-wider text-[#0798F2] mb-1">
              Effortless Mobility
            </div>
            <h2 className="page-heading text-[#102A43]">
              How RideBlue Works in 3 Simple Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="relative rounded-2xl border border-slate-200 bg-[#89CFF0]/20 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#89CFF0] hover:bg-[#89CFF0]/45 hover:shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-[#E5F4FF] text-[#0798F2] flex items-center justify-center font-extrabold text-lg mb-4">
                01
              </div>
              <h3 className="card-heading text-slate-900 mb-2">Enter Pickup &amp; Destination</h3>
              Book your ride from anywhere in India. Choose your pickup and destination, add intermediate stops, and preview the road distance for your journey.
            </div>

            {/* Step 2 */}
            <div className="relative rounded-2xl border border-slate-200 bg-[#00FFFF]/15 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#00BFA6] hover:bg-[#00FFFF]/35 hover:shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-[#FFF8E7] text-amber-600 flex items-center justify-center font-extrabold text-lg mb-4">
                02
              </div>
              <h3 className="card-heading text-slate-900 mb-2">Select Vehicle &amp; Pay Method</h3>
              <p className="body-text text-slate-600 leading-relaxed">
                Choose between Economy, Sedan, SUV, or Airport Transfer. Production fare quotes and payment options will appear after approved pricing and payment configuration is complete.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative rounded-2xl border border-slate-200 bg-[#F4C2C2]/25 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#F4C2C2] hover:bg-[#F4C2C2]/50 hover:shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-extrabold text-lg mb-4">
                03
              </div>
              <h3 className="card-heading text-slate-900 mb-2">Track &amp; Enjoy Your Journey</h3>
              <p className="body-text text-slate-600 leading-relaxed">
                Journey tracking is available only when an assigned driver device is publishing verified GPS data. Emergency dispatch is not yet integrated.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. WHY CHOOSE RIDEBLUE */}
      <section className="relative isolate overflow-hidden py-16 border-b border-slate-200 bg-[#B9D4FF]">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-xs font-bold uppercase tracking-wider text-[#0798F2] mb-1">
              Built on Integrity
            </div>
            <h2 className="page-heading text-[#102A43]">
              Why Passengers &amp; Drivers Trust RideBlue
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl border border-slate-200 hover:border-[#0798F2] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#E5F4FF] text-[#0798F2] flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="card-heading text-slate-900 mb-2">Admin-Verified Drivers</h3>
              <p className="helper-text text-slate-600 leading-relaxed">
                Drivers must have an approved RideBlue profile before they can accept ride requests. External police verification is not represented as completed by this application.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 hover:border-[#0798F2] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="card-heading text-slate-900 mb-2">Transparent Fares</h3>
              <p className="helper-text text-slate-600 leading-relaxed">
                Detailed breakdowns showing base fare, distance, time, taxes, and applicable tolls. No sudden surge shocks at destination.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 hover:border-[#0798F2] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="card-heading text-slate-900 mb-2">City-to-City Connectivity</h3>
              <p className="helper-text text-slate-600 leading-relaxed">
                From busy city centres and IT hubs to industrial areas, residential neighbourhoods, and intercity routes across India.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 hover:border-[#0798F2] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h3 className="card-heading text-slate-900 mb-2">Support Requests</h3>
              <p className="helper-text text-slate-600 leading-relaxed">
                Dedicated ticket management system with rapid resolution for billing inquiries, lost luggage, and ride safety.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FACTUAL SERVICE STANDARDS (No fabricated testimonials rule respected!) */}
      <section className="relative isolate overflow-hidden py-16 border-b border-slate-200 ">
        {/* City background image */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{
            backgroundImage: "url('/rideblue_assets/how-rideblue-city.jpg')",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-white/85"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ">
          <div className="bg-[#E5F4FF]/40 rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0798F2]">
                  Service Commitments
                </span>
                <h2 className="page-heading text-[#102A43] mt-2 mb-4">
                  Standard Operating Protections on Every Trip
                </h2>
                <div className="space-y-3.5 body-text text-slate-600">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Cancellation rules:</strong> Cancellation eligibility depends on the stored booking status; production fee rules are not configured.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Emergency information:</strong> Dispatch integration is not configured; call 112 directly in an emergency.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Trip Sharing:</strong> Live trip sharing is not available until a verified sharing flow is configured.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Tax Invoice Generation:</strong> Download official GST-compliant tax invoices immediately upon trip completion.</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#E5F4FF]/40 rounded-2xl p-6 border border-[#0798F2]/20 space-y-4">
                <div className="card-heading text-[#102A43]">
                  Transparent Passenger Policies
                </div>
                <div className="space-y-3 helper-text text-slate-600 leading-relaxed">
                  <p>
                    All fare estimates are generated through open road distances via OpenStreetMap and OSRM protocols. Cash payment and secure cards receive equal prompt dispatch priority.
                  </p>
                  <p>
                    Drivers are required to verify passenger identity and adhere to Kolkata Traffic Police and West Bengal Motor Vehicles guidelines at all times.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    to="/terms"
                    className="helper-text font-bold text-[#0798F2] hover:underline"
                  >
                    Read full Passenger Terms &amp; Policies &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. WEBSITE-FOCUSED PROMOTIONAL SECTION */}
      <section className="border-b border-slate-200 bg-[#F3E8FF] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="grid grid-cols-1 items-center gap-8 overflow-hidden rounded-3xl border border-[#0798F2]/15 bg-white/80 p-5 shadow-sm backdrop-blur-sm md:grid-cols-[0.8fr_1.2fr] md:gap-10 md:p-8">

            {/* LEFT PART — Small promotional image */}
            <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl">
              <img
                src="/rideblue_assets/images (5).jpeg"
                alt="RideBlue car ready for a comfortable journey"
                className="h-64 w-full object-cover transition-transform duration-500 hover:scale-105 sm:h-72 md:h-80"
              />

              {/* Image label */}
              <div className="absolute inset-x-3 bottom-3 rounded-xl bg-[#102A43]/85 px-4 py-3 text-white backdrop-blur-sm">
                <p className="text-sm font-bold">Your Journey, Simplified</p>
                <p className="mt-1 text-xs text-slate-200">
                  Convenient cab booking online
                </p>
              </div>
            </div>

            {/* RIGHT PART — Existing promotional content */}
            <div className="py-3 md:py-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0798F2]">
                Web App Experience
              </span>

              <h2 className="page-heading mt-2 mb-4 leading-tight text-[#102A43]">
                Optimized for Any Browser, Mobile or Desktop
              </h2>

              <p className="body-text mb-6 leading-relaxed text-slate-600">
                RideBlue runs smoothly in your browser with no cumbersome app store
                downloads required. Bookmark RideBlue on your mobile home screen
                for convenient cab bookings.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to="/rider/book"
                  className="flex items-center gap-2 rounded-xl bg-[#FFE600] px-6 py-3 text-slate-950 shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-[#ebd300] hover:shadow-lg"
                >
                  <span>Book Instant Cab</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/driver/register"
                  className="rounded-xl border border-[#0798F2]/30 bg-white px-6 py-3 text-[#102A43] transition-all duration-300 hover:border-[#0798F2] hover:bg-[#0798F2] hover:text-white"
                >
                  Join as Driver Partner
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* 9. FINAL BOOKING CALL TO ACTION */}
      <section className="bg-white py-12 sm:py-16">
        <div className="relative isolate mx-auto grid max-w-7xl grid-cols-1 overflow-hidden rounded-3xl md:grid-cols-2">

          {/* LEFT PART — Background image and text */}
          <div className="relative isolate flex min-h-[380px] items-center justify-center overflow-hidden px-6 py-12 sm:px-10">

            {/* Left background image */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center"
              style={{
                backgroundImage: "url('/rideblue_assets/images (1).jpeg')",
              }}
            />

            {/* Left image overlay */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-[#102A43]/80"
            />

            {/* Left content */}
            <div className="max-w-lg text-center text-white">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-[#FFE600]">
                Your Journey Starts Here
              </p>

              <h2 className="page-heading text-white tracking-tight">
                Book Your Ride Online
              </h2>

              <p className="body-text mx-auto mt-4 max-w-md leading-relaxed text-white/90">
                Choose your destination, select your preferred cab, and book
                your next journey with ease. Your next ride is just a few clicks away.
              </p>

              <div className="mt-8 flex justify-center">
                <Link
                  to="/rider/book"
                  className="flex items-center gap-2 rounded-xl bg-[#FFE600] px-8 py-3.5 text-slate-950 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-[#ebd300] hover:shadow-xl active:scale-95"
                >
                  <span>Book a Ride Now</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT PART — Separate image */}
          <div className="relative min-h-[300px] overflow-hidden md:min-h-[480px]">

            {/* Right image: replace with your preferred picture */}
            <img
              src="/rideblue_assets/images (3).jpeg"
              alt="RideBlue car ready for your next journey"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            />

            {/* Optional subtle image overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#102A43]/30 to-transparent" />
          </div>

        </div>
      </section>
    </div>
  );
};
