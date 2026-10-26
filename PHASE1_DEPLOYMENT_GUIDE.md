# Supabase setup for the active RideBlue application

## Important: do not apply this to production without a backup
The active frontend and API are at the project root (`src/`, root `server.ts`, and root `package.json`). The `client/` and `server/` subdirectories in older archives are legacy/prototype components and are not the active booking API.

## Apply database migrations in order
Use the SQL files under `src/supabase/migrations/` in this exact order in a development Supabase project first:
1. `01_base_schema.sql`
2. `02_auth_and_profiles.sql`
3. `03_security_rls_and_state_machine.sql`
4. `04_persistent_notifications_and_integrity.sql`
5. `05_trusted_fares_and_booking_creation.sql`

Back up the database and inspect existing objects before applying to any live project. The migrations do not insert sample pricing values. Do not apply migration 05 until migrations 01-04 have been reviewed and successfully applied.

## Environment configuration
Copy `.env.example` to `.env` for the root application. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`. The service-role key is server-only and must never be exposed through a `VITE_` variable.

Generate a cryptographically random `FARE_QUOTE_SECRET` of at least 32 characters. Configure `ROUTING_SERVICE_URL` to a trusted OSRM-compatible route service and `GEOCODING_SERVICE_URL` to a trusted Photon-compatible geocoding service. Named addresses are independently geocoded by the server before routing; the browser's coordinates are not used for named-address fare calculations. The included public OSRM and Photon endpoints are suitable only for development; production should use contracted, monitored providers with documented usage limits and service guarantees.

Keep `ENABLE_LIVE_BOOKING=false` and `VITE_ENABLE_LIVE_BOOKING=false` until the migration, trusted route calculations, quote signing, idempotency, RLS, and booking tests have passed. The server enforces the flag even if the frontend is modified. Do not enable booking simply because the page renders.

## Configure pricing
Sign in using an account whose `profiles.role` is already `admin`. Open Admin → Fare Configuration and enter business-approved values for each vehicle category. Do not activate a rule until base fare, distance/time rates, minimum fare, passenger capacity, included passengers, extra-passenger fee, tax rate, cancellation fee, and commission rate are approved. The app does not seed production prices. Saving a rule increments its pricing version; quotes and booking creation reject stale versions.

## Routing and quote flow
The browser's route preview is for display only. `/api/fare-quote` independently requests a route from the configured routing service, validates the input, loads the active Supabase fare rule, and returns a short-lived signed quote. `/api/bookings` verifies that quote and calls the atomic `create_ride_with_fare_quote` database function. The function recalculates the fare from the persisted active rule, stores the fare breakdown/version and intermediate stops in one transaction, creates the ride as `requested`, and enforces request idempotency.

## Tests and release gate
Run `npm ci`, `npm run lint`, `npm test`, and `npm run build`. Then test with separate Rider and Admin accounts against a non-production Supabase project. Verify capacity limits, fare calculations, stale quote rejection, duplicate idempotency keys, unauthorized fare-rule writes, and requested initial status. Keep both booking flags false until these checks pass. A real routing provider and working Supabase project are required for live integration tests.

## Important fare limitations
The current Phase 1 quote includes configured base, distance, time, minimum fare, extra passengers, and configured tax. Toll/airport levies, waiting fees, surcharges and coupon redemption are not included until an approved policy and trusted provider are configured. Do not enable live bookings for journeys that require toll pricing until the toll policy is decided and implemented.
