# RideBlue Supabase Authentication Setup

## 1. Configure environment
1. In the project root, copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Supabase Project Settings → API. Use the publishable/anon key only; never put a service-role key in a Vite app.
3. Keep `VITE_ENABLE_DEMO_AUTH=false` for real authentication.

## 2. Apply SQL safely
Do **not** run `src/supabase/schema.sql` or `src/supabase/auth_migration.sql` as extra setup steps for the active root application. They are overlapping historical snapshots of the active `profiles` / `drivers` / `rides` model and can replace triggers, functions, or policies from the numbered migrations.

- For a fresh staging project, follow `SUPABASE_SETUP.md` and review migrations `src/supabase/migrations/01_base_schema.sql` through `07_gps_payment_security_and_audit.sql` in order.
- For an existing database, first run `sql/inspection/inspect_supabase_state_read_only.sql`. Do not replay migrations blindly; compare live columns, constraints, functions, triggers, and RLS policies with `DATABASE_RECONCILIATION_AUDIT.md` and prepare a database-specific forward migration.
- The root-level `supabase/schema.sql` belongs to the separate legacy API model (`bookings` / `driver_profiles`) and must not be applied to the active database.
- The SQL snapshots and legacy API are retained for audit/rollback context; their presence is not evidence that they were executed in Supabase.

## 3. Configure email links
In Supabase → Authentication → URL Configuration, add your local app URL (for example `http://localhost:3000`) to Site URL / Redirect URLs. Configure SMTP for reliable production email delivery.

## 4. Install and run
```bash
npm install
npm run dev
```

## Notes
- Public sign-up allows rider or driver requests, never admin. Driver approval must still be enforced before accepting rides.
- To provision the first admin, use a trusted Supabase SQL Editor/admin process to update the intended profile role; do not expose admin assignment in the client.
- Demo buttons are shown only when `VITE_ENABLE_DEMO_AUTH=true`. Do not enable demo mode in production. Demo mode is only a UI/testing convenience and must never be used to protect real data.
- Password reset now requires the link sent by Supabase; the reset page cannot be opened as a valid reset flow without a recovery session.
