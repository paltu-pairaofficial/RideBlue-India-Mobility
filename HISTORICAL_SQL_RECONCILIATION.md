# RideBlue Historical SQL Reconciliation

This classifies the SQL statements included in the request. They are historical evidence only; none was executed by this audit. The live database must be inspected to determine whether any effect is already present.

| Supplied statement | Classification | Why / safe handling |
|---|---|---|
| Join `auth.users` to `profiles` on `profiles.user_id = auth.users.id::text` for a registered email | Read-only diagnostic; schema-dependent | Matches the active migrations' identity model. It fails against the legacy root schema, whose `profiles` table has `id = auth.users.id` and no `user_id`. Use only for the account you intend to inspect; results contain personal data. |
| Select an Auth user by email and return `id`, `email`, `email_confirmed_at` | Read-only diagnostic; personal data | Can confirm current Auth-user presence/confirmation but does not prove any other SQL was executed. Do not share unnecessary email/ID output. |
| Update `public.profiles.role` to `admin` and change profile details for a specific user | Privileged mutation; do not repeat blindly | This can elevate an account. It only matches the active schema if `user_id` and `email` columns exist and match. Verify the current account/profile mapping and role read-only first. If already admin, repeating is unnecessary. If not, use an approved, audited administrator-provisioning procedure. |
| Update `auth.users.email_confirmed_at` directly | Privileged Auth mutation; avoid direct repetition | It bypasses the normal Supabase Auth confirmation workflow. Inspect the current state read-only; use Supabase Auth dashboard or an authorized Admin API if confirmation is genuinely required. |
| Insert a missing profile as `rider` from `auth.users` with `NOT EXISTS` | Conditional data repair; requires verification | It assumes the active `profiles.user_id` schema and `user_role` enum. The migration 02 Auth trigger should normally create the profile. Check whether the profile is actually missing and whether the trigger is working before repairing. Unique email constraints and concurrent signup can still cause conflicts. Do not run automatically. |
| Create policy `"Riders can insert own rides"` allowing `status IN ('requested','accepted')` | Unsafe/outdated and superseded by migration 05 | It allows direct client inserts with an initial `accepted` status and conflicts with migration 05, which drops old direct-insert policies and revokes `INSERT` from `anon`/`authenticated` so booking creation uses a trusted server/RPC. The statement also is not idempotent if the same policy already exists. Do not run. |

## How to tell what has already happened

The uploaded statements do not contain execution receipts or a database snapshot. To classify actual state:

- Use the read-only catalog queries in `sql/inspection/inspect_supabase_state_read_only.sql`.
- Compare profile identity columns, role distribution counts, Auth trigger definitions, policies, and migration-history records.
- If the CLI migration-history table is absent or incomplete, do not infer that a migration was never applied: SQL Editor executions may not be recorded in the CLI migration ledger.
- Do not re-run administrator or Auth updates simply because they appear in the uploaded historical text.
