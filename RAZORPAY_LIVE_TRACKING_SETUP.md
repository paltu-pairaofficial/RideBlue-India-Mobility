# Razorpay + Supabase GPS integration

## Added in this update
- Express backend in `server.ts`.
- `POST /api/payments/create-order`: amount is read from a persisted Supabase `rides` row owned by the signed-in rider.
- `POST /api/payments/verify`: validates Checkout HMAC, then queries Razorpay and only marks paid when payment is captured and amount/currency match.
- `POST /api/payments/webhook`: verifies Razorpay webhook signature against raw body and records event IDs to deduplicate.
- `POST /api/location/update`: validates Supabase session, driver role, active ride assignment, and Indian coordinate bounds before saving GPS.
- `GET /api/location/ride/:rideId`: only ride participants/admin can read location.
- SQL migration for GPS table and webhook deduplication table.

## Critical status / limitation
This is **not yet end-to-end complete**. Existing booking flow still uses `RideContext.createBooking()` local state; it does not persist rides into `public.rides` and therefore does not provide the database UUID these secured endpoints require. The current booking/payment UI also has not been wired to launch Razorpay Checkout and call `/api/payments/verify`, and ActiveTrip/LiveJourneyTracking still need to be connected to the API using that persisted ride UUID. Do not claim payment or live GPS is working until that UI/database bridge is implemented and tested.

## Setup
1. Copy `.env.example` to `.env`; fill Supabase credentials and Razorpay **test** credentials. Keep `SUPABASE_SERVICE_ROLE_KEY`, Razorpay secret and webhook secret server-only. Never commit `.env`.
2. Review and apply `src/supabase/razorpay_driver_tracking_migration.sql` in a development Supabase project.
3. Run `npm install`; run API with `npm run server` and Vite in another terminal with `npm run dev`.
4. Set Razorpay webhook to `https://YOUR_PUBLIC_API_HOST/api/payments/webhook` and configure `payment.captured`; set matching webhook secret.
5. Persist ride before checkout and pass its Supabase UUID to all payment/location endpoints. Test with two authenticated devices and Razorpay test mode before production.
