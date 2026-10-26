# RideBlue Phase 2 Deployment Guide

## 1. Preserve and review

1. Keep the original project ZIP unchanged.
2. A pre-change source backup is provided separately as `RideBlue-pre-phase2-backup.tar.gz`.
3. Back up the target Supabase database before applying any migration.
4. Review `src/supabase/migrations/06_airport_levies_tolls_assignment.sql` against the live schema. Do not apply it automatically to production.

## 2. Migration order

This project keeps migrations in `src/supabase/migrations/`:

1. `01_base_schema.sql`
2. `02_auth_and_profiles.sql`
3. `03_security_rls_and_state_machine.sql`
4. `04_persistent_notifications_and_integrity.sql`
5. `05_trusted_fares_and_booking_creation.sql`
6. `06_airport_levies_tolls_assignment.sql`

If migrations 01–05 have already been applied, review and apply only migration 06 through your approved migration process. Do not rerun destructive or schema-replacement scripts without reviewing their effects. The migration adds no sample fares, airports, tolls, riders, drivers, bookings, or transactions.

## 3. Server environment

Configure server-only variables in the deployment environment. Do not put service-role or Razorpay secrets in any `VITE_` variable.

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `FARE_QUOTE_SECRET` (random secret, at least 32 characters)
- `ROUTING_SERVICE_URL` (trusted OSRM-compatible route service)
- `GEOCODING_SERVICE_URL` (server-side address geocoder)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` when payment is configured
- `ENABLE_LIVE_BOOKING=false` until all release checks pass
- `VITE_ENABLE_LIVE_BOOKING=false` until all release checks pass

The browser needs only the existing public Supabase URL/key and `VITE_API_BASE_URL` as appropriate for the deployment. Never expose `SUPABASE_SERVICE_ROLE_KEY`, `FARE_QUOTE_SECRET`, or Razorpay secrets to the frontend.

## 4. Business configuration

After the migration has been applied to staging:

1. Sign in as a verified administrator.
2. Configure each vehicle fare rule with approved values and an effective window. Keep rules inactive until approved.
3. Configure airport levy rules using specific airport codes/names and reliable address match terms. Select pickup/drop-off behavior, vehicle category, approved levy amount, tax treatment, effective window, and active status.
4. Test each production airport address against the quote endpoint. A possible airport journey without an applicable active rule is flagged and booking is blocked rather than silently quoted without a required levy.
5. Do not create sample production fare or airport rows.

## 5. Toll process

- The assigned driver can record the actual amount and description after a toll is incurred.
- New records are `pending_verification` and use an idempotency key.
- An administrator can verify or reject a pending record.
- Verification is not proof of payment. No toll payment collection or settlement workflow is included here; settlement remains restricted to trusted service-role reconciliation.
- Do not include pending/verified tolls in paid fare or settled driver earnings.

## 6. Release gates

Keep both live-booking flags false until all are true:

- Migration 06 is applied and verified in staging.
- Fare rules and applicable airport levy policies are approved and active.
- `npm ci` completes in the target environment.
- `npm test`, `npm run lint`, and `npm run build` pass.
- A Rider can quote and create a persisted `requested` ride; retries do not duplicate it.
- Two eligible drivers race to accept one request and only one succeeds; an offline, unapproved, or wrong-category driver is rejected.
- Rider, driver, and admin accounts see the same database status and correct authorized data.
- Toll recording remains pending until admin verification; no unverified amount is treated as paid or earnings.
- Test with the Razorpay sandbox and real device/browser GPS if those features are part of the release.

Do not enable live booking solely because source-contract tests pass. SQL and end-to-end tests remain mandatory.
