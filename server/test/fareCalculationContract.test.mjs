import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migration = fs.readFileSync(path.join(root, 'src/supabase/migrations/05_trusted_fares_and_booking_creation.sql'), 'utf8');
const migration06 = fs.readFileSync(path.join(root, 'src/supabase/migrations/06_airport_levies_tolls_assignment.sql'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.ts'), 'utf8');

test('fare quote endpoint uses the single database fare calculator', () => {
  assert.match(server, /db\.rpc\('calculate_fare_quote_v2_at'/);
  assert.match(server, /p_effective_at:\s*effectiveAt/);
  assert.match(migration06, /CREATE OR REPLACE FUNCTION public\.calculate_fare_quote_v2/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.calculate_fare_quote/);
  assert.match(migration, /v_fare := public\.calculate_fare_quote\(/);
});

test('shared calculator uses persisted base, distance, time, minimum, and passenger rules', () => {
  assert.match(migration, /v_distance := round\(p_distance_km \* v_rule\.rate_per_km, 2\)/);
  assert.match(migration, /v_time := round\(p_duration_minutes \* v_rule\.rate_per_minute, 2\)/);
  assert.match(migration, /greatest\(0, p_passenger_count - v_rule\.included_passengers\) \* v_rule\.additional_passenger_fee/);
  assert.match(migration, /greatest\(v_rule\.minimum_fare, v_base \+ v_distance \+ v_time \+ v_extra\)/);
  assert.match(migration, /round\(v_subtotal \* v_rule\.tax_rate, 2\)/);
});

test('quote and booking reject stale pricing versions and over-capacity requests', () => {
  assert.match(migration, /v_rule\.version <> p_expected_version/);
  assert.match(migration, /v_rule\.version <> p_pricing_version/);
  assert.match(migration, /p_passenger_count > v_rule\.max_passengers/);
});

test('fare configuration remains unseeded and returns a versioned breakdown', () => {
  assert.doesNotMatch(migration, /INSERT INTO public\.fare_rules/i);
  assert.match(migration, /'pricingVersion', v_rule\.version/);
  assert.match(migration, /'commissionRate', v_rule\.commission_rate/);
  assert.match(migration, /'cancellationFee', v_rule\.cancellation_fee/);
});
