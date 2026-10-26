# RideBlue SQL execution order

IMPORTANT: This package has not been executed against the live Supabase database. Back up the database and review each script before execution.

1. `rideblue_auth_helpers_repair.sql` — creates/replaces only `public.is_admin()` and `public.current_driver_id()` after checking expected columns. The user reported this script executed successfully in Supabase on 2026-10-15.
2. `rideblue_reconciliation_forward_03_07.sql (v3 dependency-order fix)` — forward migration bundle based on active migrations 03–07. It has a preflight that may stop if the live columns or enum values do not match. If it stops, do not bypass the preflight; save the full error and inspect the reported mismatch.
3. Run `../inspection/inspect_supabase_state_read_only.sql` sections individually to verify resulting objects.

Do not execute the legacy `supabase/schema.sql` against the active root application. It defines the incompatible `bookings` / `driver_profiles` model.

The helper repair does not create booking/fare functions. The forward bundle does not include migrations 01–02 and does not prove that booking, GPS, Razorpay, or refunds work end to end. Live database, build, device GPS, and payment sandbox verification remain outstanding.


Dependency-order correction in v3: `public.is_approved_driver()` is now defined after preflight and before migration 03 policies/triggers reference it. This fixes the specific missing-function ordering error shown in the user's screenshot; it does not establish that all other live-schema prerequisites pass.
