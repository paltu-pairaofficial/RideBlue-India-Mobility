import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const migration = fs.readFileSync(path.join(root, 'src/supabase/migrations/06_airport_levies_tolls_assignment.sql'), 'utf8');
const reviewMigration = fs.readFileSync(path.join(root, 'supabase/migrations/07_india_wide_airport_levy_policy.sql'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.ts'), 'utf8');
const context = fs.readFileSync(path.join(root, 'src/context/RideContext.tsx'), 'utf8');
const notifications = fs.readFileSync(path.join(root, 'src/context/NotificationContext.tsx'), 'utf8');

test('airport levy rules are configurable, versioned, effective-dated and not seeded', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.airport_levy_rules/);
  assert.match(migration, /effective_from timestamptz/);
  assert.match(migration, /NEW\.version := OLD\.version \+ 1/);
  assert.match(migration, /Admins manage airport levy rules/);
  assert.doesNotMatch(migration, /INSERT INTO public\.airport_levy_rules/i);
});

test('airport levy uses approved rules and requires review only when explicitly configured', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.calculate_fare_quote_v2/);
  assert.match(reviewMigration, /airport_levy_review_requirements/);
  assert.match(migration + reviewMigration, /airportLevyVerificationRequired/);
  assert.match(server, /quote\.airportLevyVerificationRequired/);
  assert.match(server, /p_expected_airport_levy_rules/);
});

test('tolls are separate actual-cost adjustments and default to pending verification', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.ride_toll_adjustments/);
  assert.match(migration, /DEFAULT 'pending_verification'/);
  assert.match(migration, /UNIQUE \(ride_id, idempotency_key\)/);
  assert.match(server, /\/api\/rides\/:rideId\/tolls/);
  assert.match(server, /pending verification/);
  assert.match(migration, /Only a verified toll adjustment can be settled/);
});

test('driver acceptance is atomic and uses authenticated driver identity, not a client driver ID', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.accept_ride_request/);
  assert.match(migration, /WHERE user_id = auth\.uid\(\)::text AND role = 'driver'/);
  assert.match(migration, /v_driver\.approval_status <> 'approved' OR v_driver\.is_online IS DISTINCT FROM true/);
  assert.match(migration, /WHERE id = p_ride_id AND status = 'requested' AND driver_id IS NULL/);
  assert.match(migration, /guard_atomic_ride_acceptance/);
  assert.match(context, /rpc\('accept_ride_request'/);
  assert.doesNotMatch(context, /\.update\(\{[\s\S]{0,120}status: 'accepted'/);
});

test('request notifications only target online approved matching vehicle categories', () => {
  assert.match(migration, /d\.approval_status = 'approved' AND d\.is_online = true AND d\.vehicle_category = NEW\.vehicle_category/);
  assert.match(migration, /Riders and eligible drivers can view relevant rides/);
});

test('notification realtime subscription is filtered to the signed-in account', () => {
  assert.match(notifications, /recipient_user_id=eq\.\$\{accountId\}/);
  assert.match(notifications, /setNotifications\(\[\]\)/);
});
