# RideBlue API — Supabase edition

Express API using Supabase Auth and Supabase PostgreSQL.

## Run
Configure `server/.env` from `.env.example`, then run:

```bash
npm install
npm run dev
npm test
```

`GET /api/v1/health` does not require Supabase credentials. Data endpoints require `SUPABASE_URL` and `SUPABASE_ANON_KEY`; admin and approved-driver operations additionally require `SUPABASE_SERVICE_ROLE_KEY`.

## Security model
- Public signup/sign-in and password recovery use Supabase Auth from the frontend.
- Express verifies Supabase access tokens and loads the authoritative `profiles` row.
- User-scoped operations use the caller's access token so PostgreSQL RLS applies.
- Service-role operations are server-only and are used only after Express checks the user's role, ownership, driver approval and availability.
- Public registration creates a rider only. Provision driver/admin roles through a trusted operator process.
- The service-role key must never be included in frontend variables, logs, source control or public documentation.

## Implemented route groups
- Auth/profile lookup.
- Booking create/list/detail/cancel.
- Driver onboarding, availability, incoming requests, ride acceptance and trip status.
- Admin overview, booking moderation, driver review, rider list and support queue/status.
- User support-ticket creation/list.

## Known limitations
- Driver request listing is a prototype queue and does not geographically match riders and drivers.
- No GPS tracking, geocoding, routing/ETA, payment gateway, private document upload, email/push delivery or emergency escalation is connected.
- Admin fare configuration, promotions, support replies, account suspension and reports remain incomplete.
- Live Supabase/RLS integration tests are not part of the current offline verification. See `PROJECT_AUDIT_AND_REMAINING_WORK.md`.
