# RideBlue Architecture

```text
Browser
  └── React + Vite + TypeScript
       ├── Supabase JS client (Auth/session)
       ├── shared UI tokens/components
       └── REST API client with Supabase access token
              │
              ▼
       Express API (/api/v1)
       ├── Supabase JWT verification
       ├── profile role authorization
       ├── request validation
       └── business logic
              │
              ▼
       Supabase PostgreSQL
       ├── profiles
       ├── driver_profiles
       ├── bookings
       └── support_tickets
       + RLS policies

Supabase Auth manages identities and password flows. PostgreSQL stores application data.
The Supabase service-role key must remain server-only and should not be used for normal
user-scoped queries. The starter uses the caller's access token for user-scoped database
operations so RLS can enforce the signed-in user's permissions.
```
