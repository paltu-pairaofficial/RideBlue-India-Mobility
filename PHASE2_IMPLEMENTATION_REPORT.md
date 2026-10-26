# RideBlue Phase 1 Enhancement + Phase 2 — Implementation Report

## Scope completed in source

This update builds on the existing RideBlue source and `rides` schema. It does not replace the application or create operational sample data.

### Confirmed changes

- `server.ts`
  - Fare quotes now call `calculate_fare_quote_v2` after server-side address resolution and OSRM-compatible route calculation.
  - Signed quote payloads include applicable airport levy rule snapshots, the pricing version, passenger count, route, fare breakdown, and a flag that blocks booking if an airport levy appears applicable but no active approved rule matches.
  - Booking creation calls `create_ride_with_fare_quote_v2`; the database recomputes the current fare and airport levy snapshot transactionally.
  - Added authenticated endpoints to record actual-cost toll adjustments and for administrators to verify/reject them. New toll records remain pending and are not added to the fare or earnings ledger.
- `src/supabase/migrations/06_airport_levies_tolls_assignment.sql`
  - Adds effective windows to fare rules, configurable airport levy rules, separate toll adjustment records, RLS policies, versioning, actual-cost toll RPCs, airport-aware fare calculation, booking RPC v2, atomic driver acceptance, and eligible-driver request filtering.
  - Does not seed fare rules, airport rules, tolls, rides, or users.
- `src/context/RideContext.tsx`
  - Driver acceptance uses `accept_ride_request` instead of trusting a client-supplied driver ID in a direct update.
  - Ride mapping exposes the stored airport levy separately from the total.
- `src/context/NotificationContext.tsx`
  - Realtime subscriptions are filtered to the signed-in recipient and old account notifications are cleared on account changes.
- `src/pages/admin/FaresConfiguration.tsx`
  - Adds fare-rule effective dates and embeds the airport levy configuration UI.
- `src/pages/admin/AirportLevyConfiguration.tsx`
  - New administrator interface for airport matching terms, endpoint rule, vehicle category, approved amount, tax treatment, active flag, and effective dates.
- `src/components/RideTollAdjustments.tsx`
  - New shared panel showing pending, verified, and settled amounts. Drivers can report actual tolls; administrators can verify/reject; riders can view their own ride's records. It does not mark a toll as paid or settled.
- `src/pages/rider/BookARide.tsx`, `src/pages/rider/BookingConfirmation.tsx`, `src/pages/rider/ActiveRides.tsx`, `src/pages/driver/ActiveTrip.tsx`, `src/pages/driver/CompletedTrips.tsx`, `src/pages/admin/BookingManagement.tsx`, `src/types/index.ts`
  - Show the airport levy separately and present tolls as additional actual-cost adjustments.
- `server/test/fareCalculationContract.test.mjs`, `server/test/phase2-contract.test.mjs`, `package.json`
  - Update fare calculator contract checks and add Phase 2 source-contract tests.

## Database behavior

- New rides continue to start in `requested` state with no driver assigned.
- Driver acceptance derives the driver from `auth.uid()`, verifies approved/online status and vehicle-category match, and updates only an unassigned requested ride. The update is atomic.
- A guard trigger rejects direct `requested -> accepted` updates unless performed by the atomic acceptance RPC.
- Only the most-specific matching airport rule is selected for each pickup/drop-off endpoint; no rate is invented when no matching rule exists.
- Airport levy rule changes are versioned and the signed quote's expected rules are compared at booking time.
- Road tolls are stored separately and default to `pending_verification`. Verification does not settle/collect a toll. Settlement is restricted to service-role payment reconciliation; no public toll-payment workflow is implemented in this change.
- Driver request visibility and request notifications are filtered by approval, online state, and vehicle category.
- Notifications continue to use the existing `notifications` table and Realtime publication; client subscriptions are recipient-filtered.

## Tests executed

- `node --experimental-strip-types tests/integrations.test.ts`: **22 passed, 0 failed**.
- `node --test server/test/fareCalculationContract.test.mjs server/test/bookingMigrationContract.test.mjs server/test/rideLifecycle.test.js server/test/phase2-contract.test.mjs`: **19 passed, 0 failed**.
- TypeScript transpile/syntax validation with TypeScript `transpileModule`: **94 source/test files checked, 0 syntax diagnostics**.

## Checks blocked / not performed

- `npm test` could not start because local `tsx` is not installed (`tsx: not found`).
- `npm run build` could not start because local `vite` is not installed (`vite: not found`).
- `tsc --noEmit` is blocked because the project dependency `vite/client` is unavailable. Syntax transpilation is not a semantic type check.
- `npm ci --ignore-scripts --no-audit --no-fund` did not complete in the execution window; no dependency install was completed.
- No PostgreSQL client or configured Supabase connection was available, so migration 06 was not applied or executed against a database. Static contract tests do not validate SQL runtime behavior.
- No live route/geocoding provider, three real authenticated role accounts, Razorpay sandbox, or device GPS test was run.

## Important limitations

- The toll workflow records and verifies amounts, but does not collect toll payments or settle driver earnings. It deliberately does not claim that collection works.
- Airport detection uses configured match terms and server geocoder evidence (`aeroway`, airport/aerodrome indicators). A journey whose geocoder result and address text do not expose airport evidence may require manual rule/address configuration; test the actual airports used in production.
- The `taxable` airport-levy flag is an explicit admin decision. Confirm tax treatment with the business/accounting owner before activating any rule.
- Fare rules and airport levy rules must be entered with business-approved values. No production prices have been seeded.
- Live bookings must remain disabled until migration 06 is reviewed/applied in a staging database, SQL/runtime tests pass, all required fare and airport rules are approved, and end-to-end booking/acceptance tests pass.
