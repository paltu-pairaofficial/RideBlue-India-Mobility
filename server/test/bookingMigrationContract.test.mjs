import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(path.join(process.cwd(), 'src/supabase/migrations/05_trusted_fares_and_booking_creation.sql'), 'utf8');

test('booking RPC is service-role-only and direct browser inserts are revoked', () => {
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.create_ride_with_fare_quote[\s\S]*FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.create_ride_with_fare_quote[\s\S]*TO service_role/i);
  assert.match(migration, /REVOKE INSERT ON public\.rides FROM anon, authenticated/i);
});

test('new bookings are requested, and only current active pricing versions can be used', () => {
  assert.match(migration, /'requested'::public\.ride_status/);
  assert.match(migration, /v_rule\.version <> p_pricing_version/);
  assert.match(migration, /p_passenger_count > v_rule\.max_passengers/);
});

test('idempotency is unique and retries with a different request fingerprint are rejected', () => {
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_rides_idempotency_key_unique/);
  assert.match(migration, /idempotency_fingerprint IS DISTINCT FROM p_request_fingerprint/);
  assert.match(migration, /ON CONFLICT \(idempotency_key\)[\s\S]*DO NOTHING RETURNING \* INTO v_ride/);
});

test('offline drivers are not eligible to receive or accept new requests', () => {
  assert.match(migration, /d\.approval_status = 'approved' AND d\.is_online = true/);
});

test('pricing is configurable but migration does not seed production fare records', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.bump_fare_rule_version/);
  assert.match(migration, /NEW\.version := OLD\.version \+ 1/);
  assert.doesNotMatch(migration, /INSERT INTO public\.fare_rules/i);
});
