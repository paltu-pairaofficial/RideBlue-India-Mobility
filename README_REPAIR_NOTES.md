# RideBlue repair notes

## Which database schema is active?
The active root application is launched by the root `package.json` and `server.ts`. It uses `profiles.user_id` plus `drivers`, `rides`, and `payments`. The legacy `server/src` API and `supabase/schema.sql` use `bookings` and `driver_profiles`; these are incompatible models. Do not execute `supabase/schema.sql` against the active app database.

## SQL files
- `sql/inspection/inspect_supabase_state_read_only.sql`: read-only inspection. Run statements/sections individually. Section 14 only counts known active core tables; optional legacy tables are commented out so missing legacy tables don't break the query.
- `sql/reconciliation/rideblue_reconciliation_forward_03_07.sql`: guarded forward migration derived from active migrations 03–07. It checks key active-model columns/functions/enums before applying changes in a transaction. Backfills that could reinterpret historical ratings or Razorpay IDs were intentionally omitted. Back up first. If preflight or any statement errors, stop and share the exact error.
- `src/supabase/migrations/01_base_schema.sql` and `02_auth_and_profiles.sql` represent the active baseline. Do not blindly replay them on a populated production database.

## Verification state
Contract/lifecycle tests run in this environment: 26 passed. The production build and `npm run lint` were not verified successfully because dependencies were not installed correctly in this Linux environment. The guarded SQL has not been executed against live Supabase. Real device GPS and Razorpay sandbox behavior remain externally unverified.
