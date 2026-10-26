# RideBlue forward reconciliation SQL (migrations 03–07)

This file targets the active root application schema (`profiles.user_id`, `drivers`, `rides`, `payments`), not the legacy `bookings` / `driver_profiles` schema.

Before running:
1. Back up the Supabase project.
2. Review the SQL and run only against the intended RideBlue project.
3. The script begins with a preflight that checks core columns, helper functions, and required enum labels. If incompatible, it raises an exception before migration statements execute.
4. The script runs in one transaction. If any statement fails, do not manually commit; report the exact error and inspect whether the SQL editor rolled back the transaction.
5. The migration intentionally omits the prior data rewrites that set old ratings/acceptance rates to NULL and the speculative backfill from `provider_transaction_id` into `provider_order_id`.
6. It does not seed fare rules or platform settings; approved operational pricing must be configured separately by an authorized admin.

Important limitation: this SQL has been derived from the uploaded project's migrations and statically reviewed, but has not been executed against the user's live Supabase database. A successful run still needs post-migration verification. If preflight fails, stop and share the exact error; do not run the legacy `supabase/schema.sql`.
