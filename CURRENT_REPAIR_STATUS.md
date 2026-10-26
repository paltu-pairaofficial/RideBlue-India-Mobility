# RideBlue repair status (2026-10-15)

## Confirmed from uploaded files and supplied live object inventory
- Active root app uses `profiles.user_id`, `drivers`, `rides`, and `payments`.
- The separately runnable legacy API/schema uses `bookings` and `driver_profiles` and is not interchangeable with the root app's model.
- User's read-only inventory showed core active tables (`profiles`, `drivers`, `rides`, `payments`) exist, while these expected active objects were missing: `driver_locations`, `processed_payment_webhooks`, `notifications`, `fare_rules`, `platform_settings`, `airport_levy_rules`, `ride_toll_adjustments`, `payment_refunds`, `financial_audit_events`, `public_driver_directory`; `bookings` and `driver_profiles` are legacy objects and are not to be created for the active root app.
- Fixed two SQL function comparisons in migrations 04 and 06 from `NEW.status = 'rejected'` to `NEW.status::text = 'rejected'`, because the declared `ride_status` enum does not include `rejected`; this avoids a runtime enum-cast failure in notification code.
- Added a preflight-gated forward SQL bundle based on migrations 03–07. It makes named policy recreation idempotent, and omits data backfills that could reinterpret existing metrics/payment identifiers.

## Tests actually run in this environment
- `node --test server/test/fareCalculationContract.test.mjs server/test/bookingMigrationContract.test.mjs server/test/rideLifecycle.test.js server/test/phase2-contract.test.mjs server/test/phase3-6-contract.test.mjs`: **26 passed, 0 failed**.
- `npm run lint`: **failed before project type-check** with `TS2688: Cannot find type definition file for 'vite/client'` because dependencies are not installed correctly in this environment.
- Live Supabase SQL execution: **not performed**.
- Production build: **not verified**.
- Real-device GPS and Razorpay sandbox: **not verified**.

## Before calling production-ready
- Review current RLS policy list for older differently named permissive policies.
- Execute the guarded reconciliation SQL against a backed-up database only after reviewing the preflight assumptions.
- Run post-migration read-only inspection and test signup, booking RPC, GPS authorization, Razorpay sandbox, and refund behavior.

## SQL run order note
- Added `sql/reconciliation/rideblue_auth_helpers_repair.sql` and `sql/reconciliation/RUN_ORDER.md` to preserve the targeted helper repair and execution order in the package.
- The user reported the helper repair returned `Success. No rows returned` in Supabase. This confirms the SQL statements executed, not that booking/fare functions or the full migration are complete.
