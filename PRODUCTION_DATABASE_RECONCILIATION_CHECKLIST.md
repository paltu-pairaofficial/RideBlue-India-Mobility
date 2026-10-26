# RideBlue Production Database Reconciliation Checklist

## Before SQL changes
- [ ] Identify the exact Supabase project/environment in the dashboard; do not paste credentials.
- [ ] Run the read-only inspection SQL and save results.
- [ ] Confirm whether `profiles` has `user_id`, whether `profiles.id` references `auth.users.id`, and whether both active and legacy table families exist.
- [ ] Inspect all triggers on `auth.users`; identify whether `on_auth_user_created` and `on_auth_user_created_rideblue` both exist.
- [ ] Inspect enum values, especially `payment_method`, `ride_status`, `vehicle_category`, and `user_role`.
- [ ] Inspect constraints and unique indexes required by `ON CONFLICT` clauses.
- [ ] Inspect function signatures/definitions for `current_profile_id`, `is_admin`, `current_driver_id`, fare quote/booking RPCs, `accept_ride_request`, and payment reconciliation.
- [ ] Inspect RLS policies and table grants; do not assume a policy list in source matches production.
- [ ] Inspect Realtime publication membership.
- [ ] Check `supabase_migrations.schema_migrations` if it exists. Manual SQL Editor execution may not be recorded there.
- [ ] Take a backup and confirm restore/recovery procedures before any production change.
- [ ] Keep `ENABLE_LIVE_BOOKING`, `VITE_ENABLE_LIVE_BOOKING`, `ENABLE_LIVE_PAYMENTS`, and `ENABLE_REFUNDS` false.

## Fresh staging
- [ ] Confirm no legacy or partially created RideBlue schema objects exist.
- [ ] Review migrations 01–07 in order; do not apply non-numbered schema/auth/tracking snapshots as extra steps.
- [ ] Apply one migration at a time in staging, capture output, verify postconditions, and record checksum and timestamp.
- [ ] Test Auth signup, profile creation, admin role lookup, driver onboarding, ride creation, atomic acceptance, GPS authorization, payments, and notifications with test accounts.
- [ ] Resolve all migration warnings/errors before production planning.

## Existing production
- [ ] Do not replay migrations blindly.
- [ ] Do not drop or recreate `profiles`, `rides`, `drivers`, `payments`, `auth.users`, or any user data.
- [ ] Produce a database-specific forward migration only after reviewing inspection results.
- [ ] For any data backfill, first run a SELECT preview, capture expected affected row counts, and document recovery.
- [ ] Never copy `provider_transaction_id` into `provider_order_id` unless the actual meaning of the existing values is confirmed.
- [ ] Verify postconditions after each approved change.
- [ ] Keep live flags disabled until security and integration tests pass.
