# RideBlue Phases 3–6 Implementation Report

## Scope and safety

This update continues the Phase 2 source package. It preserves the existing React/Vite frontend, Express `server.ts`, Supabase `rides` schema, and migrations 01–06. The pre-change project was archived before edits as `RideBlue-pre-phase3-6-backup.tar.gz` outside the source tree. No live Supabase database was connected to or modified.

**Release gates remain closed:** `ENABLE_LIVE_BOOKING=false`, `ENABLE_LIVE_PAYMENTS=false`, and `ENABLE_REFUNDS=false` are the documented defaults. Do not enable them until the migration is reviewed and applied in staging and all external integration tests pass.

## Findings from the current source

- Driver GPS writes already used `navigator.geolocation.watchPosition`, but server validation did not require a fresh device timestamp or bound accuracy, and it duplicated precise GPS coordinates into `drivers.current_lat/current_lng`.
- The rider tracking page polled the authenticated location endpoint. It needed to clear the old marker when no location is available and show connectivity errors as stale tracking rather than leaving stale data looking live.
- GPS reads were participant-checked in Express, but terminal ride statuses could still return historical location; database read policy also needed to stop exposing locations outside active trips.
- Razorpay webhook idempotency inserted the event row before processing and treated any insert error as a completed duplicate. A processing failure could therefore be acknowledged permanently. Captured payment handling did not verify the exact stored order, amount and currency before updating payment and ride status.
- Payment verification updated the payment and ride in separate operations with best-effort rollback. The project did not retain separate Razorpay order and payment identifiers.
- Payment order creation did not require an idempotency key before contacting Razorpay and did not fail closed when the payment row could not be saved.
- The driver directory policy allowed all authenticated users to query complete approved-driver rows, including fields that should be private. The profiles policy also allowed all approved driver profiles to be queried.
- Account-switch handling cleared data, but in-flight profile, ride and notification requests could still resolve out of order and overwrite newer-session state.
- Refunds had no durable refund request ledger or policy-gated initiation workflow.

## Changes by phase

### Phase 3 — GPS

- `server.ts`: GPS updates now require a finite capture timestamp within 60 seconds, accuracy no worse than 500 metres, valid optional heading/speed, approved driver status, and an active assigned trip. The read endpoint reports location age/staleness and returns no historical coordinates after the trip is terminal. Errors no longer return internal exception text.
- `src/pages/driver/ActiveTrip.tsx`: sends the device's actual `GeolocationPosition.timestamp`, does not upload while the tab is hidden, and distinguishes unavailable GPS from timeout.
- `src/pages/rider/LiveJourneyTracking.tsx`: clears the marker when no location exists and shows a tracking error/stale state on request failure.
- `src/context/RideContext.tsx`: no longer fetches or stores duplicated current GPS fields from the general driver directory.
- Migration 07: adds a database trigger to reject stale/future GPS records and writes that do not belong to the assigned driver on an active ride. Location reads are limited to active-trip participants and administrators.

### Phase 4 — Payments and financial management

- `server.ts`: added `ENABLE_LIVE_PAYMENTS` and `ENABLE_REFUNDS` fail-closed flags. Order creation requires a valid UUID idempotency key, reserves it in Supabase before the provider request, reuses a persisted pending order where possible, and refuses to return an order unless its database record is saved. Only online-method rides may start a Razorpay order.
- `server.ts`: webhook events now have processing/processed/failed handling; failed events can be retried instead of being silently treated as completed duplicates. Captured events must match a stored provider order, ride, INR currency and exact amount.
- Migration 07: stores separate provider order/payment references, adds payment idempotency indexes, a `payment_refunds` ledger, financial audit events, and the service-role-only `record_verified_razorpay_payment` function to update payment and ride state atomically.
- `server.ts`: admin-initiated refunds require `ENABLE_REFUNDS=true`, an authenticated admin, a captured payment, a reason, an idempotency key, sufficient refundable balance, and an explicitly enabled/documented `refund_policy` in `platform_settings`. Provider responses that are uncertain are held for reconciliation; they are not reported as completed.
- `src/pages/admin/AdminSettings.tsx`: adds an administrator form for documenting and saving the refund policy. No policy amounts or policy text are prefilled.
- Refund webhooks update persistent refund/payment/ride records only when they match stored refund/payment identifiers and amounts.

### Phase 5 — Security and account isolation

- Migration 07: replaces broad approved-driver row access with owner/admin access and adds a limited `public_driver_directory` view for approved vehicle/name/rating information. Removes global approved-driver profile visibility. Sensitive driver documents, contact fields and precise driver GPS are not part of the public directory.
- `src/context/RideContext.tsx`: riders load the safe directory view; drivers load their own private driver record; admins load driver records under the existing admin RLS checks. Assigned rider trip views enrich driver display data from the safe view rather than requiring broad private-row access.
- `src/context/AuthContext.tsx`: uses a sequence guard to prevent a stale profile lookup from restoring a previous account after switching or signing out.
- `src/context/NotificationContext.tsx`: stale notification responses are ignored after session changes, and marking a notification read also filters by the authenticated recipient ID.
- Existing server-side auth, ride ownership checks, fare quote signing, atomic driver acceptance and toll RPC authorization are preserved.

### Phase 6 — Integration and release gates

- Added `server/test/phase3-6-contract.test.mjs` and included it in the project test script.
- Added `.env.example` entries for `ENABLE_LIVE_PAYMENTS`, `ENABLE_REFUNDS`, Razorpay sandbox variables, routing/geocoding variables and the quote secret.
- Live booking, payment and refund flows remain disabled by default.

## Changed files

- `server.ts`
- `src/supabase/migrations/07_gps_payment_security_and_audit.sql` (new)
- `src/context/AuthContext.tsx`
- `src/context/NotificationContext.tsx`
- `src/context/RideContext.tsx`
- `src/pages/driver/ActiveTrip.tsx`
- `src/pages/rider/LiveJourneyTracking.tsx`
- `src/pages/admin/AdminSettings.tsx`
- `.env.example`
- `server/.env.example`
- `server/test/phase3-6-contract.test.mjs` (new)
- `package.json`
- `PAYMENTS_AND_TRACKING_STATUS.md`
- `SUPABASE_SETUP.md`
- `DEPLOYMENT_GUIDE.md`
- `PHASE3_6_IMPLEMENTATION_REPORT.md` (new)
- `PHASE3_6_DEPLOYMENT_GUIDE.md` (new)

## Tests and commands actually executed

1. `node --test server/test/fareCalculationContract.test.mjs server/test/bookingMigrationContract.test.mjs server/test/rideLifecycle.test.js server/test/phase2-contract.test.mjs server/test/phase3-6-contract.test.mjs` — **26 passed, 0 failed**.
2. `node --experimental-strip-types tests/integrations.test.ts` — **22 passed, 0 failed**. Node printed its experimental type-stripping warning.
3. TypeScript `transpileModule` syntax scan over project TypeScript/TSX — last run before final doc edits: **80 files, 0 syntax diagnostics**. A final syntax scan is required after any further code edits.
4. `npm run build` — **blocked**: `vite: not found` because dependencies are not installed in this environment.
5. `npm run lint` — **blocked**: `tsc --noEmit` reports `TS2688: Cannot find type definition file for 'vite/client'`.
6. `npm ci --ignore-scripts --no-audit --no-fund` — did not complete within the execution window; no dependency install was completed.

The contract tests inspect source and migration contracts. They are not a substitute for PostgreSQL execution, authenticated integration tests, provider sandbox tests, or real-device GPS tests.

## Not verified / remaining blockers

- Migration 07 has not been executed by PostgreSQL or applied to Supabase. Check existing grants, duplicate provider IDs, enum values, function ownership, view privileges, and migration ordering in a staging database first.
- No configured Supabase instance or separate authenticated Rider/Driver/Admin accounts were available. RLS and RPC behavior therefore remain unverified at runtime.
- No Razorpay sandbox credentials were used. Order creation, captured/failed/refund webhook replay, provider timeouts, and reconciliation need sandbox verification.
- No physical-device or independent-browser GPS session was run. Browser permission, background throttling, poor connectivity, and location accuracy need real testing.
- Refund completion is reported only after a provider response or verified webhook confirms it. A timeout or unmatched webhook remains in `requires_review`/failed processing and needs operator reconciliation. Do not retry a refund blindly.
- Refund policy configuration must be approved by the business owner and entered by an admin. `ENABLE_REFUNDS` must remain false until policy review and sandbox tests pass.
- The existing schema does not yet provide a complete earnings/commission ledger. Do not report driver earnings or platform commission as settled financial results until a versioned commission policy and settlement process are implemented.
- Toll verification remains separate from toll collection and driver earnings settlement; there is no live toll collection workflow in this phase.
- GPS in a browser is device-provided and can be spoofed on a compromised client. Server validation limits stale and malformed updates but cannot cryptographically prove physical GPS provenance.
- The existing in-memory rate limiter is process-local and should be replaced with a shared limiter for horizontally scaled production deployments.

## Production decision

**Not production-ready yet.** Keep all live flags disabled until migration 07 passes staging execution, build/type checks pass, RLS is tested with separate roles, Razorpay sandbox payment/refund flows pass, GPS is verified on separate devices, and critical end-to-end scenarios pass.
