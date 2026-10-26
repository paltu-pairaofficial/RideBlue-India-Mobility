# RideBlue implementation report

Date: 2026-10-14

## Scope and active architecture

- The active root application is the React/TypeScript app under `src/`, served by the root Express/Vite entry point `server.ts` and root `package.json` scripts.
- The active Supabase schema/migrations used by that frontend are under `src/supabase/` (`profiles`, `drivers`, `rides`, `ride_stops`, `driver_locations`, `payments`, `reviews`, support tables).
- `server/src/` is a separate, dormant legacy API package that uses a different `bookings` schema. It is not imported by the root `server.ts` scripts and must not be deployed as if it were the active backend without reconciling the schema.
- The separate `client/` folder was an unreferenced prototype with local demo dashboards, sample notifications and local-only actions. It was excluded from this updated package to prevent it being run as a parallel demo app. The original uploaded ZIP remains unchanged.

## Changes implemented

### Mock-data removal and account isolation

- Removed `src/data/mockData.ts` from the active source tree.
- Removed localStorage-based operational state persistence from `RideContext` and notifications.
- Cleared role-scoped data when the account changes or signs out, and added dashboard loading/error states so failed queries are not silently presented as empty results.
- Authentication now fails closed when the Supabase profile is missing or cannot be verified.
- Removed fake saved-place coordinates, placeholder driver coordinates, fake driver earnings defaults, hardcoded rating defaults for new profiles, hardcoded commission assumptions, and invented contact details from active screens.
- Removed the simulated SOS banner and replaced unsupported SOS dispatch claims with an explicit unavailable state and a direct `tel:112` action.
- Removed hardcoded fare numbers from the active public and booking UI. The unused client-side fare calculator was deleted. New booking creation is deliberately blocked until approved production fare rules and server-side fare validation are configured; no booking is inserted with an illustrative fare.
- Driver earnings and platform commission are displayed as unavailable until a verified ledger and approved commission configuration exist.
- Saved places, favourite drivers, profile edits and unsupported settings no longer pretend that local-only changes were saved.

### Database and security changes

- Added `src/supabase/migrations/04_persistent_notifications_and_integrity.sql`.
- The migration creates user-owned persistent notifications with RLS and database-triggered notifications for ride events; adds fare-rule and platform-settings tables with admin-only write policies; adds active/valid coupon read policies and admin-only coupon management; and adds guardrails for initial booking state, passenger count and coordinates.
- The migration removes default-generated rating/acceptance metrics where no completed activity exists, prevents direct browser edits to driver GPS coordinates, and validates review ownership against the exact completed ride and assigned driver.
- The root server's admin report now counts only completed rides whose payment status is `paid` for the gross paid-fare figure.
- Driver acceptance uses a conditional update (`status=requested` and `driver_id IS NULL`) and verifies that a row was actually claimed, preventing a stale client from treating a failed claim as successful.
- Notifications are now loaded from Supabase and isolated by `auth.uid()` through RLS.

## Files changed

- `src/context/RideContext.tsx`
- `src/context/NotificationContext.tsx`
- `src/context/AuthContext.tsx`
- `src/types/index.ts`
- `src/data/vehicleCategories.ts`
- `src/data/mockData.ts` (removed)
- `src/utils/fareCalculator.ts` (removed)
- `src/pages/rider/BookARide.tsx`
- `src/pages/rider/SavedPlaces.tsx`
- `src/pages/rider/FavouriteDrivers.tsx`
- `src/pages/rider/RiderProfile.tsx`
- `src/pages/rider/RiderDashboard.tsx`
- `src/pages/rider/RiderNotifications.tsx`
- `src/pages/driver/DriverDashboard.tsx`
- `src/pages/driver/DriverNotifications.tsx`
- `src/pages/driver/EarningsRatings.tsx`
- `src/pages/driver/CompletedTrips.tsx`
- `src/pages/admin/AdminDashboard.tsx`
- `src/pages/admin/AdminReports.tsx`
- `src/pages/admin/RiderManagement.tsx`
- `src/pages/admin/FaresConfiguration.tsx`
- `src/pages/admin/PromotionsManagement.tsx`
- `src/pages/admin/AdminSettings.tsx`
- `src/pages/shared/NotificationsCentre.tsx`
- `src/pages/rider/LiveJourneyTracking.tsx`
- `src/pages/rider/CancelledRides.tsx`
- `src/pages/rider/ActiveRides.tsx`
- `src/pages/rider/RideHistory.tsx`
- `src/pages/rider/PaymentMethods.tsx`
- `src/pages/public/Home.tsx`
- `src/pages/public/Services.tsx`
- `src/pages/public/FAQ.tsx`
- `src/pages/public/Contact.tsx`
- `src/pages/public/PrivacyPolicy.tsx`
- `src/pages/public/HowItWorks.tsx`
- `src/components/layout/AppLayout.tsx`
- `src/components/maps/InteractiveMap.tsx`
- `src/components/visuals/CarHero3D.tsx`
- `src/supabase/migrations/01_base_schema.sql`
- `src/supabase/migrations/04_persistent_notifications_and_integrity.sql` (new)
- `src/supabase/schema.sql`
- `server.ts`
- `server/src/routes/booking.routes.js` (wording only; legacy package)
- `client/` (excluded from updated package; separate prototype, not referenced by root scripts)

## Tests run

- TypeScript/TSX syntax transpilation: **90 source files checked, 0 syntax diagnostics**. This is a syntax check, not a full semantic TypeScript build.
- `node --test server/test/rideLifecycle.test.js`: **4 passed, 0 failed**.
- `npm run build`: **not passed**; the environment reports `vite: not found`. The extracted `node_modules` is incomplete, and dependencies could not be restored in this session. Run `npm ci` and then `npm run build` in a normal development environment.
- `node --test tests/integrations.test.ts`: could not run because Node's test runner does not load this `.ts` test file directly in the current environment. It was not counted as a passing test.
- No Supabase migration was applied to a live project. No real Rider/Driver/Admin accounts, Razorpay sandbox, webhook, or physical-device GPS session were available for end-to-end verification.

## Important incomplete work — do not deploy as production-ready

1. **Booking creation is intentionally disabled.** The UI does not show invented prices, and the context refuses to insert a booking until a trusted server-side fare calculation flow consumes approved `fare_rules`. Migration 04 adds the configuration table but does not yet implement the fare-quote/create-booking RPC or connect the admin editor to it.
2. **Fare rules and platform settings are read-only in the current admin UI.** Approved business values must be entered through a reviewed admin workflow; no sample values are seeded.
3. **Promotions are read from Supabase but creation/editing and server-side redemption validation are not implemented.** Do not use coupons in production.
4. **Driver earnings, platform commission, refunds and cancellation fees are not production-ready.** They remain unavailable rather than being calculated from invented 88%/12% rules or a hardcoded zero fee.
5. **Rider profile updates, saved places and favourite drivers are disabled until account-scoped persistence/geocoding is implemented.**
6. **Emergency dispatch is not integrated.** RideBlue does not claim to notify police or emergency contacts; the UI points to 112 directly.
7. **GPS has authenticated server endpoints and the driver page uses device geolocation, but live multi-device behavior has not been verified.** Migration 04 must be applied before the new GPS-write guard is active.
8. **Razorpay server-side order/signature/webhook code exists, but this pass did not verify it against Razorpay sandbox credentials or complete refund reconciliation.** Do not enable live payments until sandbox and idempotency tests pass.
9. **The legacy `server/src/` package uses a different `bookings` schema from the active `rides` schema.** Do not run it as the active API until it is reconciled or removed in a separately reviewed change.

## Required next steps

1. Back up the live Supabase database, then review and apply migrations `01`, `02`, `03`, and `04` in order in the correct Supabase project.
2. Configure the root `.env` from `.env.example` with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and Razorpay sandbox secrets. Never commit `.env` or expose service-role/payment secrets to the browser.
3. Implement the trusted fare quote and booking RPC/API using approved fare rules, server-verified route distance, passenger allowances, tax and commission versioning before re-enabling booking.
4. Complete promotions, financial ledger/refunds, cancellation policy, profile/saved-place persistence and admin setting writes.
5. Run `npm ci`, `npm run build`, automated integration tests, and end-to-end checks with separate Rider, Driver and Admin accounts; test Razorpay sandbox and real device GPS.
