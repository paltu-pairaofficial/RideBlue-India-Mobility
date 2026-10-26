import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync('server.ts', 'utf8');

test('live booking is disabled unless explicitly enabled', () => {
  assert.match(
    server,
    /const ENABLE_LIVE_BOOKING = process\.env\.ENABLE_LIVE_BOOKING === 'true'/
  );

  assert.match(
    server,
    /app\.post\(['"]\/api\/bookings['"][\s\S]*?if\s*\(!ENABLE_LIVE_BOOKING\)\s*return res\.status\(503\)/
  );
});
