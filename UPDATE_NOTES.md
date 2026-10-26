# RideBlue update notes

## Changes in this update
- Fixed TypeScript errors caused by malformed JSX comments in `LiveJourneyTracking.tsx`.
- Replaced legacy `stripe` payment-method values with the supported `razorpay` value.
- Hardened passenger-to-driver reviews:
  - ratings are 1–5 stars;
  - only the rider who owns a database-confirmed completed journey can rate the assigned driver;
  - an existing review blocks a second submission;
  - database errors are shown instead of displaying a false success;
  - review status is reloaded from Supabase so the completed journey no longer offers a second rating.
- Added a unique review-per-journey index to the security migration and a database trigger to recalculate the driver's average profile rating from passenger reviews.
- Preserved the real GPS flow: the driver's Active Trip page sends device GPS to the authenticated server endpoint, and the rider's journey page polls the server for the assigned ride's latest recorded coordinates.
- The package excludes `node_modules`, `.git`, and `.env`. The `.env` file is intentionally not included because it can contain private API keys. Use `.env.example` to configure your own local environment.

## Setup after extracting
1. Open the project folder in VS Code.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and fill in your own Supabase and Razorpay credentials. Never share `.env`.
4. Apply the Supabase migration files in the documented order. The review uniqueness/average-rating changes are in `src/supabase/migrations/03_security_rls_and_state_machine.sql` and `src/supabase/razorpay_driver_tracking_migration.sql`.
5. Run `npm run lint`, then `npm run build`, then `npm run dev`.

## Verification status
`npm run lint` passed in the available environment after the code fixes. A production build and integration tests could not be completed in this environment because the uploaded ZIP's `node_modules` contains Windows-native binaries, while the verification environment is Linux. Run `npm install` on your own machine and repeat the commands above.

Real GPS tracking requires HTTPS (except localhost), browser location permission, an authenticated approved driver assigned to an active ride, working Supabase credentials, and the SQL migrations applied. Real Razorpay checkout additionally requires valid Razorpay credentials and webhook configuration. These external account/device flows cannot be certified solely by static code checks.
