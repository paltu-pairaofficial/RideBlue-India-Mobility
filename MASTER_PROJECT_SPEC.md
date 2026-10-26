# RideBlue Master Project Specification

## Product vision
Build a reliable, accessible, responsive cab-booking platform for West Bengal with Rider, Driver and Admin role experiences. It starts as an MVP and must not imply real dispatch, GPS, fares or payments until those integrations exist.

## Approved architecture
- Frontend: React + TypeScript + Vite + Tailwind CSS v4
- Backend: Node.js + Express
- Database: Supabase PostgreSQL
- Authentication: Supabase Auth
- Data access security: Row Level Security (RLS), explicit ownership checks and backend role authorization

## User roles
- Guest: browse public pages, register/sign in, read help and policy pages.
- Rider: create booking requests, view their booking history, cancel eligible requests and submit support tickets.
- Driver: submit onboarding details, manage approved availability and view assigned trips.
- Admin: review drivers, manage booking states, view records, configure fare rules, respond to support and review reports.

Authorization must be enforced by backend checks and database policies, not merely by hiding frontend links.

## Core user journeys
1. Guest → Register → Sign in → Rider dashboard.
2. Rider → Enter pickup/destination → Select vehicle → Review → Submit booking → Confirmation/history.
3. Rider → View/cancel eligible booking.
4. Driver → Submit onboarding profile → Admin review → Driver tools after approval.
5. Admin → Review operational summary and manage bookings/drivers through protected endpoints.
6. Authenticated user → Submit support request → See ticket status.

## Functional modules
### Public
Home, Services, How It Works, About, Contact, FAQ, Help Centre, Privacy Policy and Terms. Keep West Bengal focus and make indicative fares/availability clear.

### Authentication
Supabase Auth email/password. The client receives and refreshes user sessions using Supabase. The Express backend verifies Supabase access tokens and loads role/profile data. Password reset and email verification delivery require Supabase Auth settings and configured email delivery.

### Rider
Booking form, vehicle category, booking request lifecycle, booking history, detail and cancellation. Saved places, favourite drivers, payments and reviews are planned follow-up modules.

### Driver
Onboarding, vehicle details, verification status, availability and trip lifecycle. Private document storage requires Supabase Storage private buckets and appropriate policies.

### Admin
Overview, booking management, driver approvals, rider/account management, fare rules, promotions, support, reports and settings. Admin APIs require server-side role checks; sensitive actions should be audited.

### Support
Authenticated users create and list support tickets. Never request passwords, OTPs or full card details in support descriptions.

## API outline
Prefix `/api/v1`
- `GET /health`
- `GET /auth/me`
- `POST /bookings`
- `GET /bookings/my`
- `GET /bookings/:id`
- `PATCH /bookings/:id/cancel`
- `POST /drivers/onboarding`
- `GET /drivers/me`
- `PATCH /drivers/availability`
- `GET /admin/overview`
- `GET /admin/bookings`
- `PATCH /admin/bookings/:id/status`
- `GET /admin/drivers/pending`
- `PATCH /admin/drivers/:id/review`
- `POST /support/tickets`
- `GET /support/tickets/my`

## Data model
- `profiles`: Supabase Auth user id, display name, email, role, phone, status.
- `driver_profiles`: driver id, licence metadata, vehicle metadata, verification status, availability.
- `bookings`: rider id, optional driver id, pickup, destination, vehicle category, requested time, indicative fare, status, cancellation metadata.
- `support_tickets`: owner id, category, subject, description, status, assigned admin.
- Planned: `fare_rules`, `reviews`, `saved_places`, `payments`, `notifications`.

## Delivery phases
1. Foundation: Supabase schema/RLS, auth, shared design system.
2. Booking MVP: create/list/detail/cancel, indicative fare rules.
3. Driver operations: onboarding, verification and trip lifecycle.
4. Admin operations: booking/driver moderation, support and fare config.
5. Integrations: maps, notifications, payments and dispatch.
6. Hardening: tests, rate limits, monitoring, accessibility and deployment.

## Acceptance checklist
- [ ] Supabase Auth is used; no custom password database.
- [ ] Public registration creates only riders.
- [ ] API rejects missing/invalid Supabase access tokens.
- [ ] Rider cannot access admin APIs.
- [ ] RLS prevents reading or mutating other users' records.
- [ ] Booking transitions are validated server-side.
- [ ] Inter and approved design tokens are applied consistently.
- [ ] Mobile layouts have no horizontal overflow.
- [ ] Live services are not represented as active until integrated.
