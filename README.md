
# RideBlue — Full-Stack Cab Booking & Fleet Management Platform

RideBlue is a modern, responsive cab-booking and ride management web application connecting **Riders**, **Drivers**, and **Administrators** across West Bengal, India.

---

## 1. Technology Stack

- **Frontend:** React.js 19, Vite, TypeScript, Tailwind CSS v4, React Router 7, Lucide React
- **Mapping & Routing:** Leaflet, OpenStreetMap, OSRM routing algorithms
- **State & Synchronisation:** React Context Architecture with LocalStorage synchronisation and real-time state transitions
- **Backend & Database Architecture:** Node.js, Express.js REST API layer, Supabase PostgreSQL Relational Schema with Row Level Security (RLS)
- **Payments:** Stripe test payment integration patterns and Cash on Destination settlement
- **Typography & Brand:** Inter typography, Bright Blue (`#0798F2`), Warm Cream (`#FFF8E7`), Yellow CTA (`#FFE600`), Deep Navy (`#102A43`), and Clean White (`#FFFFFF`)

---

## 2. Complete 50-Page Inventory

### A. Public Website (9 pages)
1. **Home (`/`)**: Approved split hero layout, quick booking form, 3D car visual, popular West Bengal routes with sample fares, 5 vehicle categories, How It Works, Why RideBlue, service protections, and web app promotion.
2. **Services (`/services`)**: City commutes, CCU Airport transfers, intercity highway rides, and corporate fleet.
3. **How It Works (`/how-it-works`)**: Tabbed interactive walkthrough for Passengers and Driver Partners.
4. **About Us (`/about`)**: Safety philosophy, driver empowerment, and Salt Lake Sector V operations hub.
5. **Contact (`/contact`)**: Working inquiry form, verified phone helpline, email, and office address.
6. **FAQ (`/faq`)**: Categorised, searchable accordion for fares, cancellations, tolls, and lost items.
7. **Help Centre (`/help-centre`)**: Knowledge base and entry point to ticket creation.
8. **Privacy Policy (`/privacy`)**: Transparent data handling, GPS telemetry, and driver document privacy.
9. **Terms & Conditions (`/terms`)**: Passenger terms, cancellation compensation windows, and West Bengal legal jurisdiction.

### B. Authentication (4 pages)
10. **Sign In (`/auth/sign-in`)**: Shared branded login with password visibility toggle, error handling, and 1-click demo role switchers.
11. **Create Account (`/auth/create-account`)**: Passenger and Driver registration (Admin creation restricted).
12. **Forgot Password (`/auth/forgot-password`)**: Recovery instructions transmission.
13. **Reset Password (`/auth/reset-password`)**: Security credential update.

### C. Rider Workflows (15 pages)
14. **Book a Ride (`/rider/book`)**: Multi-step booking engine with multi-stop intermediate waypoints.
15. **Vehicle Selection (`/rider/vehicles`)**: Economy, Sedan, SUV, XL, and Airport Transfer categories.
16. **Review & Confirm (`/rider/review`)**: Itemized fare breakdown, GST, toll fees, and coupon application.
17. **Booking Confirmation (`/rider/confirmation/:bookingId`)**: Confirmed trip reference, driver details, and receipt summary.
18. **Live Journey Tracking (`/rider/tracking/:bookingId`)**: Interactive Leaflet GPS tracking, driver marker, route polyline, live simulation controls, SOS trigger, and trip sharing.
19. **Rider Dashboard (`/rider/dashboard`)**: Active trip monitor, stats, and shortcuts.
20. **Upcoming Rides (`/rider/upcoming`)**: Scheduled airport and outstation bookings.
21. **Active Rides (`/rider/active`)**: Current in-progress trips.
22. **Ride History (`/rider/history`)**: Past journeys with downloadable official GST tax invoice and driver rating.
23. **Cancelled Rides (`/rider/cancelled`)**: Cancellation log with fee and refund tracking.
24. **Saved Places (`/rider/saved-places`)**: Home, Office, Airport, and custom shortcuts.
25. **Favourite Drivers (`/rider/favourite-drivers`)**: Preferred high-rated driver pool.
26. **Rider Profile (`/rider/profile`)**: Personal credentials, verified mobile, and emergency contact.
27. **Payment Methods (`/rider/payments`)**: Stripe card manager and cash preferences.
28. **Rider Notifications (`/rider/notifications`)**: Passenger alerts with unread badge.

### D. Driver Workflows (10 pages)
29. **Driver Registration (`/driver/register`)**: Onboarding for DL, RC, PUC, and vehicle details.
30. **Driver Profile (`/driver/profile`)**: Driver credentials and fleet vehicle information.
31. **Vehicle Documents (`/driver/documents`)**: RC permit, commercial DL, and insurance audit logs.
32. **Verification Status (`/driver/verification`)**: Pending, Approved, Rejected, and Correction Required statuses with strict ride acceptance enforcement.
33. **Driver Dashboard (`/driver/dashboard`)**: Online/offline toggle, earnings summaries, and rating score.
34. **Availability & Requests (`/driver/requests`)**: Live incoming ride simulation cards with countdown timer and accept/reject actions.
35. **Active Trip (`/driver/active-trip`)**: Lifecycle progression (Arrived at Pickup &rarr; Start Journey &rarr; Complete Trip) and cash collection instructions.
36. **Completed Trips (`/driver/completed-trips`)**: Trips log with net driver payout (~88%).
37. **Earnings & Ratings (`/driver/earnings`)**: Weekly revenue breakdown and passenger feedback.
38. **Driver Notifications (`/driver/notifications`)**: Real-time dispatch and verification notifications.

### E. Admin Workflows (9 pages)
39. **Admin Dashboard (`/admin/dashboard`)**: Command console with live active trip counts, revenue, and queue counters.
40. **Booking Management (`/admin/bookings`)**: Searchable, filterable booking database with inspection modal.
41. **Driver Approvals (`/admin/driver-approvals`)**: Application review interface with Approve, Reject, and Correction actions.
42. **Rider Management (`/admin/riders`)**: Passenger standing and account safety audits.
43. **Fare Configuration (`/admin/fares`)**: Vehicle category rate editor (base, per km, per min, cancellation fees).
44. **Promotions Management (`/admin/promotions`)**: Coupon code creator with discounts, caps, and activation toggles.
45. **Support Management (`/admin/tickets`)**: Support queue with response threads and status transitions.
46. **Reports (`/admin/reports`)**: Fleet category revenue share and regional demand analytics.
47. **Admin Settings (`/admin/settings`)**: Platform commission, emergency dispatch hotline, and geofence radius.

### F. Shared Authenticated Pages (3 pages)
48. **Notifications Centre (`/notifications`)**: Global notification feed with mark-all-as-read.
49. **Support Ticket List (`/support`)**: Help desk ticket creation and active requests.
50. **Support Ticket Details (`/support/:ticketId`)**: Discussion thread between user and support operations.

---

## 3. Key Business Rules & Security Enforcements

1. **Role Protection:** Public registration cannot create Admin accounts.
2. **Driver Verification Rule:** Drivers with `pending`, `rejected`, or `correction_required` status cannot go online or accept rides.
3. **Payment Parity:** Cash payment and online card options receive equal dispatch prominence.
4. **Transparent Pricing:** Base fare, distance charges, travel time, airport tolls, and 5% transport GST are itemized clearly prior to booking confirmation.
5. **Simulated GPS & Geolocation:** Prototype maps and GPS simulation are clearly watermarked as demonstrations with live simulation controls for easy portfolio review.

---

## 4. Running the Project

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Compile and type check
npm run lint

# Build production bundle
npm run build
```

---

## 5. Demo Accounts

For instant portfolio demonstration, use the One-Click Switcher in the top bar or sign in with:
- **Rider:** `rahul.rider@rideblue.in`
- **Driver (Approved):** `subhash.driver@rideblue.in`
- **Driver (Pending):** `amitava.driver@rideblue.in`
- **Admin:** `admin@rideblue.in`


## Pan-India Location Search and Routing Update

- Booking pickup, intermediate stops, and destination now use Photon search with an India bounding box.
- GPS remains optional; users can type and select a location manually.
- Unselected typed text is marked invalid and cannot be used for routing or booking.
- Driving route distance, duration, and route geometry are requested from OSRM. No synthetic route or random coordinates are generated for arbitrary typed addresses.
- A booking fare is shown only after valid OSRM route data is returned.
- The prototype uses public Photon and OSRM endpoints, which have no uptime guarantee and are not suitable as production infrastructure without reviewing service policies and selecting reliable hosting.
=======
# RideBlue — Full-Stack Cab Booking Platform

RideBlue is a responsive cab-booking platform for journeys across West Bengal.

## Stack
- Frontend: React, Vite, TypeScript, React Router, Tailwind CSS v4
- Backend: Node.js, Express
- Database: Supabase PostgreSQL
- Authentication: Supabase Auth (email/password)
- Authorization: backend role checks + PostgreSQL Row Level Security (RLS)
- UI: Inter typography and approved RideBlue palette

## Prerequisites
- Node.js 20+ (Node 22 LTS recommended)
- A Supabase project

## Supabase setup — canonical active application

**Do not run `supabase/schema.sql` for the root application.** That file belongs to a separate legacy API model using `public.bookings` and `public.driver_profiles`, with a different `public.profiles` identity model. The active root application uses `public.rides`, `public.drivers`, and `profiles.user_id` linked to `auth.users.id::text`.

1. Read `SUPABASE_SETUP.md` and `SUPABASE_AUTH_SETUP.md`.
2. For a **fresh staging database**, inspect and apply `src/supabase/migrations/01_base_schema.sql` through `07_gps_payment_security_and_audit.sql` in order, reviewing each migration's preconditions and postconditions. Do not run the separate snapshots `src/supabase/schema.sql`, `src/supabase/auth_migration.sql`, or `src/supabase/razorpay_driver_tracking_migration.sql` as additional migrations.
3. For an **existing database**, do not replay migrations 01–07 blindly. First run the read-only checks in `sql/inspection/inspect_supabase_state_read_only.sql`, compare the results with `DATABASE_RECONCILIATION_AUDIT.md`, and prepare a database-specific forward migration.
4. Copy the root `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the browser, plus server-only variables described in `.env.example`. Do not use `client/.env` for the active root app.
5. Never expose `SUPABASE_SERVICE_ROLE_KEY`, database credentials, `FARE_QUOTE_SECRET`, or Razorpay secrets through a `VITE_` variable.
6. Keep live booking, payment, and refund switches disabled until the database state, RLS, build, and provider sandbox flows are verified.

The numbered migration files are currently stored under `src/supabase/migrations/`, not the Supabase CLI's conventional `supabase/migrations/` path. The current setup is a reviewed/manual sequence; do not assume CLI migration history tracks these files automatically.

## Backend unit tests

From `server/`, run:

```bash
npm test
```

The built-in Node test runner covers basic ride lifecycle and authorization decision helpers. These are unit tests only; they do not replace integration tests against Supabase.

## Run locally
Terminal 1:
```bash
cd server
npm install
npm run dev
```
Terminal 2:
```bash
cd client
npm install
npm run dev
```
Open the Vite URL printed in the terminal (normally `http://localhost:5173`).

## Included starter functionality
- Responsive public homepage and shared design system
- Register and sign-in using Supabase Auth
- Current user/session lookup
- Booking request creation and rider booking list
- Driver onboarding, approval-gated availability, incoming requests and trip-status endpoints
- Admin overview, booking/driver review, rider listing and support queue endpoints
- Support ticket creation and list endpoints
- Password recovery UI and rider booking history/cancellation
- PostgreSQL schema with RLS policies

## Not production-ready yet
Live GPS tracking, geographic driver dispatch, payment gateway, map/geocoding, refunds, private driver document uploads, full CRUD for every planned screen, production monitoring and complete automated tests still need provider setup and implementation. Some planned pages are currently limitation/placeholder screens; see PROJECT_AUDIT_AND_REMAINING_WORK.md. Never claim a payment, booking dispatch or GPS position is real unless a connected service confirms it.

## Security
- Never commit `.env`.
- Never put the Supabase service-role key in frontend variables.
- Keep RLS enabled on every user-data table.
- Admins must be provisioned through a controlled process; public registration always creates a rider.
- Review the policies in `supabase/schema.sql` before production use.

