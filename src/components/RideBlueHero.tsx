
import { useState, type FormEvent } from "react";
import {
  CarFront,
  Tag,
  ShieldCheck,
  Headphones,
  Clock,
  Plane,
  MapPin,
  LocateFixed,
  Route,
  ArrowRight,
  Zap,
  BadgeCheck,
} from "lucide-react";

type RideType = "cab" | "rental" | "airport";

type RideDetails = {
  pickup: string;
  destination: string;
  rideType: RideType;
};

type RideBlueHeroProps = {
  onFindRide: (details: RideDetails) => void;
};

function RideBlueHero({ onFindRide }: RideBlueHeroProps) {
  const [rideType, setRideType] = useState<RideType>("cab");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!pickup.trim() || !destination.trim()) {
      setError("Please enter both pickup and destination locations.");
      return;
    }

    if (
      pickup.trim().toLowerCase() ===
      destination.trim().toLowerCase()
    ) {
      setError("Pickup and destination must be different.");
      return;
    }

    setError("");

    onFindRide({
      pickup: pickup.trim(),
      destination: destination.trim(),
      rideType,
    });
  };

  const features = [
    {
      icon: CarFront,
      title: "Ride Anytime",
      description: "Get a ride in minutes, anywhere in the city.",
      color: "bg-sky-100 text-sky-600",
    },
    {
      icon: Tag,
      title: "Affordable Fares",
      description: "Transparent pricing with no hidden charges.",
      color: "bg-amber-100 text-amber-600",
    },
    {
      icon: ShieldCheck,
      title: "Safe & Secure",
      description: "Verified drivers and real-time trip updates.",
      color: "bg-sky-100 text-sky-600",
    },
    {
      icon: Headphones,
      title: "Support Tickets",
      description: "We're here whenever you need us.",
      color: "bg-sky-100 text-sky-600",
    },
  ];

  return (
    <section className="relative overflow-hidden border-b border-amber-100 bg-[#FFFBF2] py-12 sm:py-16 lg:py-20">

      {/* Blurred city background */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <img
          src="/rideblue_assets/rideblue-city-car.png"
          alt=""
          className="rideblue-city-car absolute left-0 top-0 h-full w-[140%] max-w-none object-cover blur-[3px] opacity-20"
        />
      </div>


      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Left: Heading and booking form */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
              <span>Safe</span>
              <span className="text-sky-400">•</span>
              <span>Reliable</span>
              <span className="text-sky-400">•</span>
              <span>Affordable</span>
            </div>

            <div className="space-y-3">
              <h1 className="max-w-xl text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Your Ride.
                <br />
                <span className="text-sky-500">
                  Our Priority.
                </span>
              </h1>

              <p className="max-w-lg text-base leading-7 text-slate-600 sm:text-lg">
                Book a comfortable, safe and affordable ride
                anytime, anywhere with RideBlue.
              </p>
            </div>

            {/* Booking card */}
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-6">
              {/* Ride type tabs */}
              <div className="mb-5 flex flex-wrap gap-5 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setRideType("cab")}
                  className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${rideType === "cab"
                    ? "border-sky-500 text-sky-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                >
                  <CarFront size={17} />
                  Book a Ride
                </button>

                <button
                  type="button"
                  onClick={() => setRideType("rental")}
                  className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${rideType === "rental"
                    ? "border-sky-500 text-sky-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                >
                  <Clock size={16} />
                  Rent a Car
                </button>

                <button
                  type="button"
                  onClick={() => setRideType("airport")}
                  className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${rideType === "airport"
                    ? "border-sky-500 text-sky-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                >
                  <Plane size={16} />
                  Airport Ride
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Pickup */}
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 transition focus-within:border-sky-400 focus-within:bg-white">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white">
                    <MapPin size={17} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="sr-only">
                      Pickup location
                    </span>
                    <input
                      value={pickup}
                      onChange={(event) =>
                        setPickup(event.target.value)
                      }
                      placeholder="Enter pickup location"
                      autoComplete="street-address"
                      required
                      className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-500"
                    />
                  </span>

                  <LocateFixed
                    size={17}
                    className="shrink-0 text-slate-400"
                  />
                </label>

                {/* Destination */}
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 transition focus-within:border-sky-400 focus-within:bg-white">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-400 text-slate-950">
                    <MapPin size={17} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="sr-only">
                      Destination
                    </span>
                    <input
                      value={destination}
                      onChange={(event) =>
                        setDestination(event.target.value)
                      }
                      placeholder="Enter destination"
                      required
                      className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-500"
                    />
                  </span>

                  <Route
                    size={17}
                    className="shrink-0 text-slate-400"
                  />
                </label>

                {error && (
                  <p
                    role="alert"
                    className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFE600] px-5 py-3.5 font-bold text-slate-950 shadow-sm transition hover:bg-yellow-400 hover:shadow-md active:scale-[0.99]"
                >
                  Find a Ride
                  <ArrowRight size={19} />
                </button>
              </form>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-slate-600 sm:text-sm">
              <span className="flex items-center gap-1.5">
                <Zap size={15} className="text-amber-500" />
                Instant Booking
              </span>

              <span className="flex items-center gap-1.5">
                <BadgeCheck
                  size={16}
                  className="text-sky-500"
                />
                Verified Drivers
              </span>

              <span className="flex items-center gap-1.5">
                <Headphones
                  size={15}
                  className="text-slate-400"
                />
                Support Tickets
              </span>
            </div>
          </div>

          {/* Right: RideBlue car photo */}
          <div className="relative mx-auto w-full max-w-2xl pb-5 lg:pb-0">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border-4 border-white bg-slate-100 shadow-2xl shadow-slate-900/10">
              <img
                src="/rideblue_assets/rideblue-car.png"
                alt="White RideBlue sedan in a modern city"
                className="h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-transparent" />

              {/* Driver information card */}
              ```tsx
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-xl border border-white/70 bg-white/95 p-2 shadow-lg backdrop-blur sm:left-5 sm:top-5">

                <div className="flex h-8 w-10 items-center justify-center rounded-full bg-slate-900 text-10px font-bold text-white">
                  RB
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-900">
                    RideBlue Driver
                  </p>
                  <p className="text-xs text-amber-600">
                    ★ Trusted fleet
                  </p>
                </div>
              </div>

              {/* Route status card */}
              <div className="absolute bottom-0 right-2 w-36 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl sm:bottom-1 sm:right-5 sm:w-44">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">
                    Your Journey
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>

                <div className="relative flex h-10 items-center justify-center overflow-hidden rounded-xl bg-sky-50">
                  <svg
                    viewBox="0 0 180 64"
                    className="h-full w-full"
                    fill="none"
                    role="img"
                    aria-label="Illustrative route graphic"
                  >
                    <path
                      d="M18 46 C45 46 40 14 77 18 S118 52 160 17"
                      stroke="#BAE6FD"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M18 46 C45 46 40 14 77 18 S118 52 160 17"
                      stroke="#0798F2"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="18"
                      cy="46"
                      r="6"
                      fill="#FACC15"
                      stroke="white"
                      strokeWidth="2"
                    />
                    <circle
                      cx="160"
                      cy="17"
                      r="7"
                      fill="#0798F2"
                      stroke="white"
                      strokeWidth="2"
                    />
                  </svg>
                </div>

                <p className="mt-2 text-[11px] text-slate-500">
                  Live tracking available during eligible trips
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Four feature cards */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {features.map(
            ({ icon: Icon, title, description, color }) => (
              <div
                key={title}
                className="group flex items-start gap-3 rounded-2xl border border-white bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}
                >
                  <Icon size={20} />
                </span>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {description}
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </div>

    </section>
  );
}

export default RideBlueHero;
