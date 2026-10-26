# RideBlue deployment guide (current phase)

## Important status

This package is safer than the prior demo-oriented source, but it is **not production-ready**. New booking creation is intentionally blocked until the trusted fare quote/booking flow is implemented and approved pricing is configured. Do not enable live bookings or payments yet.

## 1. Preserve the current deployment

1. Back up the deployed frontend and Supabase database before applying any SQL.
2. Keep the original uploaded ZIP as the untouched rollback artifact.
3. Do not copy a local `.env` into this package or commit secrets.

## 2. Install and build

From the project root in a normal development environment:

```bash
npm ci
npm run build
```

The current audit environment did not contain a usable Vite installation, so a successful production build has not been verified here.

## 3. Environment variables

Use `.env.example` as a template and create a local `.env` yourself. The active root `server.ts` requires server-side Supabase and Razorpay settings. The browser may receive only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

- `SUPABASE_SERVICE_ROLE_KEY` must remain server-only.
- `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` must remain server-only.
- Never place privileged keys in `VITE_*` variables.
- Keep `ENABLE_LIVE_PAYMENTS=false` and `ENABLE_REFUNDS=false`. Use Razorpay sandbox keys until order idempotency, payment verification, webhook retry, refund reconciliation, and RLS tests pass.

## 4. Supabase migration

After taking a database backup, review the existing schema and apply the active migration files in order: `src/supabase/migrations/01_base_schema.sql`, `02_auth_and_profiles.sql`, `03_security_rls_and_state_machine.sql`, then `04_persistent_notifications_and_integrity.sql`.

Migration 04 adds notifications, fare-rule/settings tables, coupon RLS, review integrity checks, GPS-write restrictions and data-cleanup for default-generated ratings. It has not been run against a live database in this session. Review it against the actual deployed schema before applying.

Do not run the separate legacy `server/src/` package against the active database without reconciling its `bookings` schema with the active `rides` schema.

## 5. Before enabling booking or payments

- Approve production fare rules, capacity, included passengers, extra passenger charges, tax, cancellation fees, commission, and effective-version rules.
- Implement and test a server-side fare quote and atomic booking creation operation that validates route distance in a trusted backend.
- Connect the fare admin UI to authorized create/update operations; currently it is read-only.
- Complete server-side coupon redemption, payment/refund ledger, driver earnings and cancellation policy flows.
- Review migrations 01–07 in order and apply them in staging first. Test separate Rider, Driver and Admin accounts with RLS, account switching, booking acceptance races, Razorpay sandbox webhooks/refunds and device GPS. Keep all live feature flags disabled until critical checks pass.

Until those steps are complete, the app deliberately displays unavailable states rather than invented fares, earnings, notifications, or operational records.
