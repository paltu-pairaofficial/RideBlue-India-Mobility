import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('GPS update requires authenticated assigned active trip and validates telemetry', () => {
  const server = read('server.ts');
  assert.match(server, /\/api\/location\/update/);
  assert.match(server, /driver\.approval_status !== 'approved'/);
  assert.match(server, /!Number\.isFinite\(capturedAt\)/);
  assert.match(server, /Math\.abs\(Date\.now\(\) - capturedAt\) > 60000/);
  assert.match(server, /accuracy > 100/);
  assert.match(server, /\.in\('status', \['accepted', 'driver_arriving', 'in_progress'\]\)/);
});

test('GPS reader reports stale location and migration limits visibility to active trip participants', () => {
  const server = read('server.ts');
  const migration = read('src/supabase/migrations/07_gps_payment_security_and_audit.sql');
  assert.match(server, /locationStale: locationIsStale/);
  assert.match(server, /locationAgeSeconds/);
  assert.match(migration, /Authorized active trip participants can view location/);
  assert.match(migration, /r\.status IN \('accepted','driver_arriving','in_progress'\)/);
});

test('Razorpay reconciliation verifies order identity and uses atomic database function', () => {
  const server = read('server.ts');
  const migration = read('src/supabase/migrations/07_gps_payment_security_and_audit.sql');
  assert.match(server, /ENABLE_LIVE_PAYMENTS/);
  assert.match(server, /provider_order_id/);
  assert.match(server, /record_verified_razorpay_payment/);
  assert.match(server, /processing_status: 'failed'/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.record_verified_razorpay_payment/);
  assert.match(migration, /idx_payments_provider_order_unique/);
});

test('Refunds require explicit feature flag, admin authorization, configured policy and idempotency', () => {
  const server = read('server.ts');
  const migration = read('src/supabase/migrations/07_gps_payment_security_and_audit.sql');
  assert.match(server, /ENABLE_REFUNDS/);
  assert.match(server, /refund_policy/);
  assert.match(server, /profile\?\.role !== 'admin'/);
  assert.match(server, /payment_refunds/);
  assert.match(migration, /UNIQUE \(payment_id, idempotency_key\)/);
  assert.match(migration, /Participants can read refunds/);
  assert.match(migration, /No direct refund mutations/);
});

test('Payment webhook records failures for retry and validates exact order, amount and currency', () => {
  const server = read('server.ts');
  assert.match(server, /provider_order_id', orderId/);
  assert.match(server, /storedPayment\.currency !== currency/);
  assert.match(server, /processing_status: 'failed'/);
  assert.match(server, /refund\.processed/);
});


test('Rider directory does not query private driver documents or GPS coordinates', () => {
  const context = read('src/context/RideContext.tsx');
  const migration = read('src/supabase/migrations/07_gps_payment_security_and_audit.sql');
  assert.match(context, /from\('public_driver_directory'\)/);
  assert.match(migration, /CREATE OR REPLACE VIEW public\.public_driver_directory/);
  assert.match(migration, /Drivers and admins view private driver rows/);
  assert.match(migration, /Authorized active trip participants can view location/);
});

test('Auth and notification requests guard against stale cross-account responses', () => {
  const auth = read('src/context/AuthContext.tsx');
  const notifications = read('src/context/NotificationContext.tsx');
  const rides = read('src/context/RideContext.tsx');
  assert.match(auth, /accountLoadSequence/);
  assert.match(notifications, /refreshSequence/);
  assert.match(notifications, /eq\('recipient_user_id', user\.id\)/);
  assert.match(rides, /refreshSequence/);
});
