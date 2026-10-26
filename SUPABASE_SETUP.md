# Supabase setup for the active RideBlue application

## Important: do not apply this to production without a backup
The active frontend and API are at the project root (`src/`, root `server.ts`, and root `package.json`). The `client/` and `server/` subdirectories in older archives are legacy/prototype components and are not the active booking API.

## Canonical database model and migration sequence

The active root application (`src/`, root `server.ts`, root `package.json`) uses `public.profiles` with `profiles.user_id = auth.users.id::text`, plus `public.drivers` and `public.rides`. The root `supabase/schema.sql` is a separate legacy model using `public.bookings` and `public.driver_profiles`; do not apply it to the active database.

### Fresh staging database
Review and apply the numbered files under `src/supabase/migrations/` in order:
1. `01_base_schema.sql`
2. `02_auth_and_profiles.sql`
3. `03_security_rls_and_state_machine.sql`
4. `04_persistent_notifications_and_integrity.sql`
5. `05_trusted_fares_and_booking_creation.sql`
6. `06_airport_levies_tolls_assignment.sql`
7. `07_gps_payment_security_and_audit.sql`

The non-numbered files `src/supabase/schema.sql`, `src/supabase/auth_migration.sql`, and `src/supabase/razorpay_driver_tracking_migration.sql` overlap the numbered chain and are reference snapshots, not extra migrations to run. The chain is stored outside Supabase CLI's conventional `supabase/migrations/` path; do not assume CLI migration history records these files.

### Existing database
Do not replay the chain automatically. First run `sql/inspection/inspect_supabase_state_read_only.sql` and compare its results with `DATABASE_RECONCILIATION_AUDIT.md`. The live schema, triggers, policies, function definitions and migration history must determine a database-specific, forward-only reconciliation plan. Back up before any production change. Migrations 04 and 07 include data updates/backfills, so they are not strictly schema-only.

## Environment configuration
Copy `.env.example` to `.env` for the root application. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`. The service-role key is server-only and must never be exposed through a `VITE_` variable.

Generate a cryptographically random `FARE_QUOTE_SECRET` of at least 32 characters. Configure `ROUTING_SERVICE_URL` to a trusted OSRM-compatible route service and `GEOCODING_SERVICE_URL` to a trusted Photon-compatible geocoding service. Named addresses are independently geocoded by the server before routing; the browser's coordinates are not used for named-address fare calculations. The included public OSRM and Photon endpoints are suitable only for development; production should use contracted, monitored providers with documented usage limits and service guarantees.

Keep `ENABLE_LIVE_BOOKING=false`, `VITE_ENABLE_LIVE_BOOKING=false`, `ENABLE_LIVE_PAYMENTS=false`, and `ENABLE_REFUNDS=false` until migrations 01–07 have been reviewed and tested in staging, trusted route calculations and quote signing pass, RLS is verified with separate roles, and Razorpay sandbox and GPS tests pass. The server enforces the flag even if the frontend is modified. Do not enable booking simply because the page renders.

## Configure pricing
Sign in using an account whose `profiles.role` is already `admin`. Open Admin → Fare Configuration and enter business-approved values for each vehicle category. Do not activate a rule until base fare, distance/time rates, minimum fare, passenger capacity, included passengers, extra-passenger fee, tax rate, cancellation fee, and commission rate are approved. The app does not seed production prices. Saving a rule increments its pricing version; quotes and booking creation reject stale versions.

## Routing and quote flow
The browser's route preview is for display only. `/api/fare-quote` independently requests a route from the configured routing service, validates the input, loads the active Supabase fare rule, and returns a short-lived signed quote. `/api/bookings` verifies that quote and calls the atomic `create_ride_with_fare_quote` database function. The function recalculates the fare from the persisted active rule, stores the fare breakdown/version and intermediate stops in one transaction, creates the ride as `requested`, and enforces request idempotency.

## Tests and release gate
Run `npm ci`, `npm run lint`, `npm test`, and `npm run build`. Then test with separate Rider and Admin accounts against a non-production Supabase project. Verify capacity limits, fare calculations, stale quote rejection, duplicate idempotency keys, unauthorized fare-rule writes, and requested initial status. Keep both booking flags false until these checks pass. A real routing provider and working Supabase project are required for live integration tests.

## Important fare limitations
The current Phase 1 quote includes configured base, distance, time, minimum fare, extra passengers, and configured tax. Toll/airport levies, waiting fees, surcharges and coupon redemption are not included until an approved policy and trusted provider are configured. Do not enable live bookings for journeys that require toll pricing until the toll policy is decided and implemented.


## Migration 07 — GPS, payment ledger, refunds and account isolation

`src/supabase/migrations/07_gps_payment_security_and_audit.sql` adds separate Razorpay order/payment references, retryable webhook processing fields, a refund ledger, financial audit events, an atomic payment reconciliation function, active-trip GPS guards, and a limited approved-driver directory. Review the migration against your actual schema and privileges before applying. It has not been applied to production.
