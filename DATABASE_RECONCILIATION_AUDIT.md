# RideBlue Database Reconciliation Audit

**Scope:** Static audit of `RideBlue-Latest-Complete-Phases1-6(2).zip` and the historical SQL text provided with the request. No database connection was made, no SQL was executed, and no application source or migration SQL was changed. The only project changes in the reconciliation package are documentation corrections and a read-only inspection script.

## Executive conclusion

The latest project contains two incompatible database/application models:

- **Active root application:** `src/`, root `server.ts`, and root `package.json`. It uses `public.rides`, `public.drivers`, and a `public.profiles` model where `profiles.user_id` stores `auth.users.id::text`.
- **Legacy separately runnable API:** `server/src/`, `server/package.json`, and root `supabase/schema.sql`. It uses `public.bookings` and `public.driver_profiles`, and a different `profiles` shape where `profiles.id` directly references `auth.users.id`.

These models are not interchangeable. No available evidence proves which SQL files were previously executed in the live Supabase project. Consequently, the actual production schema remains **unknown** until the supplied read-only inspection queries are run against the database.

## Active code evidence

- Root `package.json` uses `dev: tsx server.ts`, `server: tsx server.ts`, and `start: tsx server.ts`. It does not launch `server/src/server.js`.
- `src/supabase/client.ts:3-8` reads only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `src/context/AuthContext.tsx:52-56` looks up the profile by `profiles.user_id = auth user.id`; lines 100-121 use Supabase password auth and reject accounts with missing profiles.
- `src/context/RideContext.tsx:529-533` loads from `rides`; lines 823-842 call `accept_ride_request`; lines 859-893 update `rides`; lines 929-945 check ride ownership/status and duplicate reviews.
- Root `server.ts:18-33` reads server and browser variables, and creates its privileged Supabase client only from `SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY`. Lines 466-482 call `create_ride_with_fare_quote_v2`; payment routes use `payments`, `rides`, `processed_payment_webhooks`, `payment_refunds`, and `financial_audit_events`.
- `src/pages/driver/DriverRegistration.tsx` and `src/context/RideContext.tsx` query `drivers`, not `driver_profiles`.
- `server/src/routes/booking.routes.js`, `server/src/routes/driver.routes.js`, and `server/src/routes/admin.routes.js` contain real executable calls to `bookings` and `driver_profiles`. They are not launched by root scripts, but the separate `server/package.json` makes that API independently runnable.
- Root `README.md` previously instructed users to run `supabase/schema.sql` and configure `client/.env`; this contradicted the active root app and `SUPABASE_SETUP.md`. Documentation has been corrected in this package.

## Conflicting schema definitions

### Root `supabase/schema.sql` — legacy model

- `profiles.id` is `uuid PRIMARY KEY REFERENCES auth.users(id)`; there is no `profiles.user_id` column.
- `driver_profiles` is the driver onboarding/availability table.
- `bookings` stores pickup/destination as text, references `driver_id` to `profiles(id)`, and has its own text status values.
- It installs `on_auth_user_created`, whose `handle_new_user()` inserts `profiles(id, full_name, email, role)`.
- `support_tickets` uses `owner_id` and a different column layout.

### `src/supabase/schema.sql` — active-model snapshot, but not equivalent to migrations 01–07

- Defines `profiles.user_id`, `drivers`, and `rides`, so its broad model matches the root app.
- Its `drivers.profile_id` declaration is not unique in this snapshot, whereas migration 01 declares it unique. Migration 02 uses `ON CONFLICT (profile_id)`, which requires a matching unique constraint/index.
- It has older/more restrictive driver columns, a `rating` default of `5.00`, and other column/default differences. `CREATE TABLE IF NOT EXISTS` in migration 01 does not reconcile an already-existing table's columns, constraints, or defaults.
- It installs a different Auth trigger name (`on_auth_user_created_rideblue`) via the numbered migration. If incompatible signup triggers coexist, signup can fail or create inconsistent profile state.

### Non-numbered SQL under `src/supabase/`

- `src/supabase/auth_migration.sql` overlaps migration 02 functions, triggers, and profile policies.
- `src/supabase/razorpay_driver_tracking_migration.sql` overlaps migration 03 functions, triggers, and RLS policies.
- `src/supabase/schema.sql` overlaps migration 01 as a baseline snapshot.
- Do not apply these three as extra migrations after the numbered chain. They are retained for audit context only.

## Numbered migration sequence and material risks

The intended source order is `src/supabase/migrations/01_base_schema.sql` through `07_gps_payment_security_and_audit.sql`. This folder is not the Supabase CLI's conventional `supabase/migrations/` directory, and no root `supabase/config.toml` is present in the ZIP. Do not assume CLI migration history tracks these files.

| Migration | Depends on | Material impact / review requirement |
|---|---|---|
| `01_base_schema.sql` | Empty or reconciled active schema | Creates enums and core tables. `IF NOT EXISTS` avoids some duplicate-object errors but does not upgrade incompatible pre-existing table definitions. |
| `02_auth_and_profiles.sql` | `profiles.user_id`, `drivers.profile_id`, enum types | Creates security helpers and Auth signup trigger. `ON CONFLICT (profile_id)` requires a unique constraint. Must inspect existing `auth.users` triggers and profile columns first. |
| `03_security_rls_and_state_machine.sql` | Core tables and helper functions | Creates GPS/webhook structures, lifecycle triggers, and many RLS policies. Existing policies can remain permissive if not explicitly dropped; inspect actual `pg_policies`. |
| `04_persistent_notifications_and_integrity.sql` | `profiles`, `drivers`, `rides`, auth users | **Changes existing data:** drops rating/acceptance defaults and sets metrics to `NULL` for accounts without trips. Review row counts and existing metric semantics before applying. |
| `05_trusted_fares_and_booking_creation.sql` | `rides`, `fare_rules`, helpers, enum values | Adds fare snapshot/idempotency columns, RPCs, and revokes direct ride insert. It supersedes older direct-insert policies. |
| `06_airport_levies_tolls_assignment.sql` | Fare rules, rides, drivers, notifications and RPC prerequisites | Adds airport/toll tables and replaces/extends booking and acceptance functions. Must confirm function signatures and columns match migration 05 and live schema. |
| `07_gps_payment_security_and_audit.sql` | Payments, rides, processed webhooks, driver locations, helpers | Adds financial columns/refund/audit structures and RLS policies. **Backfills data** by copying `provider_transaction_id` into `provider_order_id` for pending Razorpay rows; verify the meaning of each existing value before running. Adds unique indexes that may fail if existing duplicates exist. |

The “safe/idempotent” comments in migrations 01–03 are not proof of compatibility with a live schema. Re-running `CREATE TABLE IF NOT EXISTS` does not add missing columns or repair conflicting constraints.

## Known object/function dependencies

- `public.current_profile_id()`, `public.is_admin()`, `public.current_driver_id()`, `public.is_approved_driver()` are defined in migration 02 (and duplicated in the older auth snapshot).
- `public.calculate_fare_quote(...)` and `public.create_ride_with_fare_quote(...)` are defined in migration 05.
- `public.calculate_fare_quote_v2(...)`, `public.create_ride_with_fare_quote_v2(...)`, and `public.accept_ride_request(...)` are defined/updated in migration 06; root `server.ts` calls `create_ride_with_fare_quote_v2`.
- `public.record_verified_razorpay_payment(...)` is defined in migration 07 and granted to `service_role`.
- `public.processed_payment_webhooks` is established in migration 03 and extended in migration 07.
- `public.driver_locations` is established in migration 03 and guarded/limited by migration 07.
- Migration 04 and migration 06 both replace `public.emit_ride_notifications()`/its trigger. This is an intentional later replacement only if the migrations are applied in order; applying snapshots independently can leave a different implementation.
- `public.is_admin()` and `public.current_driver_id()` are not guaranteed to exist in production merely because code references them. The inspection script checks actual definitions.

## Authentication error

`src/supabase/client.ts:3-8` creates the browser client only when both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present. The supplied ZIP includes `.env.example`, not a real `.env`, so the error “Supabase authentication is not configured…” is expected until the developer creates a local root `.env` with the correct project URL and public anon/publishable key, then restarts Vite. Do not put service-role or payment secrets in any `VITE_` variable.

## Historical SQL classification

See `HISTORICAL_SQL_RECONCILIATION.md`. The uploaded SQL text proves only that queries were supplied; it does not prove they were executed.

## Correct setup policy

### Fresh staging database
1. Create/choose a non-production Supabase project.
2. Run the read-only inspection script first to confirm the target is actually fresh.
3. Review and apply the numbered migration files 01–07 in order, recording checksums and actual execution results in a migration ledger.
4. Validate functions, triggers, RLS, publication membership, and Auth signup before testing bookings.
5. Keep booking/payment/refund flags disabled until all staging checks pass.

### Existing production database
1. Do not run migrations 01–07 blindly and do not run either schema snapshot.
2. Run `sql/inspection/inspect_supabase_state_read_only.sql` in sections. Save the result sets without exporting unnecessary personal data.
3. Compare the live state to expected objects and identify which historical SQL effects are already reflected.
4. Back up the database and test restore/recovery procedures.
5. Only then prepare a database-specific, forward-only reconciliation migration. The package intentionally does not include a write migration because the current live schema and applied migration history are unknown.

## What remains unverified

- No Supabase connection or SQL execution was performed.
- Whether any uploaded historical SQL was executed cannot be inferred from the files.
- The current production tables, constraints, functions, triggers, policies, grants, Realtime membership, and migration history are unknown until the inspection queries are run.
- The local `.env` is intentionally absent from the ZIP; live auth cannot be verified from the archive alone.


## Files changed in this reconciliation pass

No TypeScript/JavaScript application files and no numbered or historical migration SQL were changed. The live database was not accessed.

- Updated `README.md` Supabase setup instructions to identify the active root app and explicitly avoid the legacy schema.
- Updated `SUPABASE_AUTH_SETUP.md` to stop instructing users to run overlapping schema/auth snapshots.
- Updated `SUPABASE_SETUP.md` with the canonical 01–07 sequence, fresh-staging versus existing-database paths, and the non-numbered snapshot warning.
- Added `DATABASE_RECONCILIATION_AUDIT.md`.
- Added `HISTORICAL_SQL_RECONCILIATION.md`.
- Added `PRODUCTION_DATABASE_RECONCILIATION_CHECKLIST.md`.
- Added `sql/inspection/inspect_supabase_state_read_only.sql`.

## Local verification executed during this pass

Working directory: the extracted contents of `RideBlue-Latest-Complete-Phases1-6(2).zip`.

- `node --version` → `v22.16.0`
- `npm --version` → `10.9.2`
- `node_modules` → absent
- `node --test server/test/fareCalculationContract.test.mjs server/test/bookingMigrationContract.test.mjs server/test/rideLifecycle.test.js server/test/phase2-contract.test.mjs server/test/phase3-6-contract.test.mjs` → **26 passed, 0 failed**. These are source-contract/lifecycle tests, not live database tests.
- `npm run lint` → failed with `TS2688: Cannot find type definition file for 'vite/client'`.
- `npm run build` → failed before compilation with `sh: 1: vite: Permission denied`.
- `npm test` → failed before its configured tests began with `sh: 1: tsx: Permission denied`.

The ZIP contains `package.json` and `package-lock.json`, but no `node_modules`. The dependency-installation state is therefore not verified by this pass. The three npm-script failures above do not establish source-level compiler errors; dependencies must be installed successfully before a full diagnosis.

## Package verification

The reconciliation ZIP was created from the uploaded latest project, not from the pre-change backup. Archive integrity check passed. It preserves `package.json`, `package-lock.json`, source, tests and migrations 01–07; excludes `node_modules`, `dist`, `.git`, and real `.env` files. It includes the documentation corrections and read-only inspection script.
