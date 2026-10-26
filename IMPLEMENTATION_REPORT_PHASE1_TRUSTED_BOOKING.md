# RideBlue Phase 1 — Trusted Fare Calculation and Booking Creation

Date: 2026-10-14

## Why booking creation was blocked

`src/context/RideContext.tsx` contained a deliberate unconditional error after input validation: it stated that approved production fare rules and server-side fare validation were not configured. No ride insert was attempted. `BookARide.tsx` also kept its fare state permanently null, while `FaresConfiguration.tsx` was read-only. The booking confirmation screen presented a newly created request as “Trip Confirmed & Driver Assigned” and showed fabricated fallback driver details.

## Implementation

- Added authenticated `POST /api/fare-quote` and `POST /api/bookings` routes in the active root `server.ts`.
- The quote route checks that the authenticated Supabase profile is a Rider, validates location inputs, independently geocodes named addresses server-side, resolves a road route through the configured OSRM-compatible service, and asks the single PostgreSQL `calculate_fare_quote` function to calculate amounts from the active persistent `fare_rules` record.
- Fare calculation uses configured base fare, rate per kilometre, rate per minute, minimum fare, included passengers, extra-passenger fee, tax, passenger capacity and pricing version. No rates are seeded or hardcoded. Quote tokens are HMAC-signed, bound to the authenticated rider, and expire after five minutes.
- Booking creation verifies the signed quote and user binding, validates payment method, scheduled time and UUID idempotency key, then calls the service-role-only `create_ride_with_fare_quote` database function.
- The database function recalculates the amount using the same SQL fare function, checks the active pricing version and vehicle capacity, creates the ride and stops in one transaction, saves the full fare/configuration snapshot and idempotency fingerprint, and always starts the booking as `requested` with no assigned driver.
- Added a unique idempotency index and rejection of key reuse with a different request fingerprint. Direct authenticated/anonymous ride inserts are revoked and the old rider insert policies are dropped. Client-side route and fare snapshots are immutable after creation. Driver eligibility checks now require both approved status and online availability.
- Added an admin editing workflow for persistent fare rules. Writes are subject to Supabase RLS and the database increments rule versions on edits. Existing rules are shown from Supabase; new rules start with blank values and inactive status.
- Updated the rider booking UI to request server quotes, show a fare breakdown/loading/error state, reject incomplete scheduled-date/time inputs, and prevent stale quotes from being used. Removed the fake promo code controls and hardcoded ₹40 cancellation claim from the booking screen.
- Updated booking confirmation and live tracking so a `requested` ride is described as a request, not a confirmed/assigned trip. Driver details and tracking actions appear only when a real driver assignment exists. Removed fabricated driver fallbacks and false paid/confirmed wording from the rider history receipt.
- Removed hardcoded seat capacities from vehicle marketing configuration/screens so fare-rule capacity is authoritative. Replaced hardcoded 5% GST labels and unapproved cancellation/toll claims with configured-tax wording and explicit not-configured states.
- Added migration `src/supabase/migrations/05_trusted_fares_and_booking_creation.sql`. It has **not** been applied to any database.

## Changed files

- `server.ts`
- `src/context/RideContext.tsx`
- `src/pages/rider/BookARide.tsx`
- `src/pages/rider/BookingConfirmation.tsx`
- `src/pages/rider/RideHistory.tsx`
- `src/pages/rider/LiveJourneyTracking.tsx`
- `src/pages/public/TermsConditions.tsx`
- `src/pages/admin/FaresConfiguration.tsx`
- `src/pages/public/Home.tsx`
- `src/pages/public/Services.tsx`
- `src/data/vehicleCategories.ts`
- `src/types/index.ts`
- `src/supabase/migrations/05_trusted_fares_and_booking_creation.sql` (new)
- `.env.example`
- `SUPABASE_SETUP.md`
- `package.json`
- `server/test/fareCalculationContract.test.mjs` (new static contract tests)
- `server/test/bookingMigrationContract.test.mjs` (new static migration/security tests)

## Test results

- `node --test server/test/fareCalculationContract.test.mjs server/test/bookingMigrationContract.test.mjs server/test/rideLifecycle.test.js`: **13 passed, 0 failed**. These include fare SQL contract, idempotency/security migration assertions, and existing ride-lifecycle tests. SQL checks are static contract tests, not live PostgreSQL execution.
- `node --experimental-strip-types --test tests/integrations.test.ts`: **passed**; its existing suite reports **22 passing security/payment/GPS assertions**. These are existing integration-style checks and were not executed against live Supabase/Razorpay services.
- TypeScript/TSX syntax transpilation: **76 files checked, 0 syntax diagnostics**. This is a syntax check, not full semantic type checking.
- `npm run build`: **blocked/fails in this environment** because Vite is not installed (`vite: not found`). Attempted dependency installation did not complete in this environment.
- `npm run lint`: **blocked/fails** because the incomplete dependency tree does not contain `vite/client` type definitions.
- No live database migration, authenticated account flow, geocoding/routing provider, or booking transaction was executed. Those are required before release.

## Required configuration and release gate

1. Back up the target Supabase database and review/apply migrations 01–05 in order in a development project first. Do not apply migration 05 to production without review and a backup.
2. Configure root `.env` with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `FARE_QUOTE_SECRET` (random, at least 32 characters), `GEOCODING_SERVICE_URL`, and `ROUTING_SERVICE_URL`.
3. Replace public Photon/OSRM development endpoints with contracted, monitored production providers before release.
4. An authorized Admin must enter and activate approved values for each vehicle category. The implementation deliberately supplies no default prices.
5. Both `ENABLE_LIVE_BOOKING` and `VITE_ENABLE_LIVE_BOOKING` remain `false`. Do not enable until the migration has been tested, `npm ci`, build/lint pass, and end-to-end booking tests pass with separate Rider/Admin/approved-online Driver accounts.
6. Toll charges, waiting fees, surcharges, and coupon redemption are not included in the Phase 1 fare calculation because no approved toll/waiting/discount policy or trusted toll provider is configured. Confirm the intended toll policy before enabling live bookings. Cancellation fee and commission are configurable rule fields and snapshotted, but cancellation billing and driver earnings are separate later work.
7. Razorpay sandbox, refunds, real GPS and multi-device behavior remain unverified and are not certified by this phase.

## Status

The trusted quote and booking code paths and migration are implemented, but **live bookings remain disabled**. This is not a production-ready certification.
