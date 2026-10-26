# RideBlue Payments and GPS Tracking Status

## Current source implementation

- Driver GPS uses the device geolocation API; the Express endpoint requires an approved driver, an assigned active trip, fresh capture timestamp, valid geographic coordinates and bounded accuracy.
- Rider tracking polls the authenticated endpoint and receives last-update age/staleness. Historical GPS is not returned after a trip is terminal.
- GPS is stored in `driver_locations`; new migration 07 adds a database guard for active-trip assignment and timestamp validity. The general driver directory no longer needs duplicate current GPS fields.
- Razorpay order creation, server signature verification, raw-body webhook signature validation and provider status lookup exist. The new code adds payment idempotency reservation, separate order/payment IDs, retryable webhook processing states and atomic database reconciliation.
- Refund requests are admin-initiated only, require a server feature flag and an explicitly enabled/documented `refund_policy`, and are tracked in a persistent refund ledger. Uncertain provider outcomes require reconciliation.
- Migration 07 tightens driver/profile visibility and adds a safe public driver directory view. Auth, ride and notification loading now guard against stale cross-account responses.

## Release status

**Not production-ready / not externally verified.** `ENABLE_LIVE_BOOKING`, `ENABLE_LIVE_PAYMENTS`, and `ENABLE_REFUNDS` must remain false until migrations 01–07 have been reviewed and applied in staging, the build and type checks pass, role-based RLS tests pass, Razorpay sandbox payment/refund tests pass, and GPS is tested on separate real devices.

No live Supabase, Razorpay sandbox, physical-device GPS, refund-provider or production deployment test was run during the implementation session. Source contract tests passing does not prove those external integrations work.

## Known limitations

- GPS cannot be cryptographically proven genuine when submitted by a browser; client spoofing remains possible on compromised devices.
- Toll records remain separate actual-cost adjustments and do not collect payment or settle driver earnings.
- A complete versioned driver-earnings/platform-commission ledger is still required before showing financial settlement as complete.
- Refund requests whose provider outcome is ambiguous are held for reconciliation; operators must not blindly retry them.
- Production rate limiting should use a shared store instead of process-local memory when horizontally scaled.
