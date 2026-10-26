# RideBlue Phases 3–6 Deployment Guide

## 1. Back up and stage first

- Keep `RideBlue-pre-phase3-6-backup.tar.gz` as the rollback source archive.
- Take a fresh Supabase backup before applying schema changes.
- Use a staging Supabase project. Do not run migration 07 against production without reviewing its SQL and testing it in staging.
- Confirm migrations 01–06 are already applied in order. Apply `src/supabase/migrations/07_gps_payment_security_and_audit.sql` only after validating the current schema and policy names.
- Do not run the legacy `src/supabase/razorpay_driver_tracking_migration.sql` as a replacement for migrations 03/07 without reviewing it; it is a legacy standalone migration.

## 2. Install dependencies and verify the source

From the project root:

```bash
npm ci
npm run lint
npm test
npm run build
```

If the lockfile installation fails, resolve that first; do not deploy a partial `node_modules` folder. The implementation session could not complete `npm ci`, and the build/type-check remain blocked until dependencies are available.

## 3. Environment variables

Configure these in the server environment only where indicated. Use test credentials in staging.

**Frontend build environment:**

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` if the frontend and Express API are deployed on different origins
- `VITE_ENABLE_LIVE_BOOKING=false`

**Express server environment:**

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only; never prefix with `VITE_`)
- `FARE_QUOTE_SECRET` (random secret of at least 32 characters)
- `RAZORPAY_KEY_ID` (sandbox key in staging)
- `RAZORPAY_KEY_SECRET` (server only)
- `RAZORPAY_WEBHOOK_SECRET` (server only)
- `ROUTING_SERVICE_URL`
- `GEOCODING_SERVICE_URL`
- `ENABLE_LIVE_BOOKING=false`
- `ENABLE_LIVE_PAYMENTS=false`
- `ENABLE_REFUNDS=false`
- `NODE_ENV`, `PORT`, and `CLIENT_ORIGIN` as appropriate

Do not put service-role keys, Razorpay secrets, quote-signing secrets, or webhook secrets in frontend variables or commit `.env` files.

## 4. Staging database checks

After migration 07 is applied to staging:

- Verify all existing migrations 01–06 and 07 are recorded in the migration history.
- Verify `payments.provider_order_id`, `provider_payment_id`, `idempotency_key`, `captured_at`, and `reconciliation_status` exist.
- Verify the `payment_refunds`, `financial_audit_events`, and `public_driver_directory` objects exist.
- Verify `record_verified_razorpay_payment` is executable only by `service_role`.
- Verify public users cannot read all approved driver profiles, driver documents, or current GPS from the driver table.
- Verify riders can read only the safe driver directory and assigned active-trip location; drivers can read their own driver record and assigned active-trip location; admins can access authorized operational records.
- Verify browser roles cannot directly mutate payment/refund/financial audit rows or driver GPS rows.
- Confirm there are no existing duplicate provider orders or unresolved pending payment reservations that would prevent creation of the new unique indexes.

## 5. GPS test with separate devices

1. Sign in as an approved, online driver in Device/Browser A.
2. Sign in as the rider assigned to that trip in Device/Browser B.
3. Grant location permission on the driver device and start an active assigned trip.
4. Confirm the driver's coordinates and capture timestamp update in the active trip location record.
5. Confirm Device B shows the last recorded timestamp and updates only when new GPS data arrives.
6. Deny location permission and verify the driver sees an error, while the rider sees stale/offline status rather than marker animation.
7. Disable network on Device A and verify the last point becomes stale.
8. Try reading the ride location with an unrelated rider and try posting coordinates as an unassigned driver; both must be rejected.
9. Complete/cancel the trip and verify location access stops and no new updates are accepted.

Do not treat browser emulation as proof of physical-device GPS behavior. Test on actual devices and document OS/browser background limits.

## 6. Razorpay sandbox tests

1. Keep `ENABLE_LIVE_PAYMENTS=false` until the sandbox test checklist passes.
2. Configure a Razorpay test key, secret and webhook secret in the server environment only.
3. Use test payment instruments provided by Razorpay; never use real payment details.
4. Verify order creation creates one pending payment record with the matching `provider_order_id` before the order is returned to the browser.
5. Retry the same idempotency key and verify the same order is returned. Attempt concurrent requests and verify no duplicate reservation/order is created.
6. Test successful capture, failed payment, bad signature, wrong amount, wrong currency, wrong ride/order, duplicate webhook event, failed webhook processing and provider timeout.
7. Verify the atomic RPC updates payment and ride status together and is idempotent for the same captured payment.
8. Configure and approve the `refund_policy` in Admin Settings. Keep `ENABLE_REFUNDS=false` until reviewed. Then test partial/full refund requests, duplicate idempotency keys, provider pending/processed/failed states, and webhook retries in sandbox.
9. Verify refund status is not marked completed unless Razorpay or a verified provider webhook confirms completion. Reconcile ambiguous provider timeouts before retrying.

## 7. Enablement gate

Only after staging tests pass:

- Review and approve actual fare, airport, toll and refund policy values. Do not seed sample rates.
- Apply the reviewed migrations to production through your normal migration process and verify the resulting schema.
- Run the critical end-to-end tests with separate Rider, Driver and Admin accounts.
- Keep `ENABLE_LIVE_BOOKING`, `VITE_ENABLE_LIVE_BOOKING`, `ENABLE_LIVE_PAYMENTS`, and `ENABLE_REFUNDS` false if any critical check remains unverified.
- Enable one feature at a time and monitor API errors, webhook retries, unresolved payment reservations, GPS staleness and refund reconciliation.

## 8. Rollback

Migration 07 is additive and avoids dropping business tables, but policy replacements and new indexes/functions affect access. Do not blindly reverse it in production. If a release fails, disable live flags first, deploy the previous source archive, inspect migration 07 effects and use a reviewed rollback plan that preserves payment/refund audit records. Restore from the database backup only under an approved recovery plan.
