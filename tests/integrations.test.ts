import crypto from 'node:crypto';

// Minimal test runner without external framework dependencies
let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

// 1. EqualHex & Signature Verification
function equalHex(a: string, b: string): boolean {
  if (!/^[a-f\d]+$/i.test(a) || !/^[a-f\d]+$/i.test(b) || a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return equalHex(signature, expected);
}

// 2. Webhook Signature Verification
function verifyWebhookSignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return equalHex(signature, expected);
}

// 3. Coordinate Validator for India Fleet
function validateGpsBounds(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 6.0 && lat <= 37.5 && lng >= 68.0 && lng <= 97.5;
}

// 4. Booking Ownership & Authorization Rule
interface TestRide {
  id: string;
  riderId: string;
  driverId?: string;
  status: string;
  totalFare: number;
  paymentStatus: string;
}

function canRiderPayRide(ride: TestRide, requesterProfileId: string): { allowed: boolean; reason?: string } {
  if (ride.riderId !== requesterProfileId) {
    return { allowed: false, reason: 'Ride does not belong to requester.' };
  }
  if (ride.paymentStatus === 'paid') {
    return { allowed: false, reason: 'Already paid.' };
  }
  if (ride.status === 'cancelled') {
    return { allowed: false, reason: 'Cannot pay for cancelled ride.' };
  }
  const amountPaise = Math.round(ride.totalFare * 100);
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) {
    return { allowed: false, reason: 'Invalid fare amount.' };
  }
  return { allowed: true };
}

function canDriverUpdateGps(ride: TestRide, driverId: string): boolean {
  return ride.driverId === driverId && ['accepted', 'driver_arriving', 'in_progress'].includes(ride.status);
}

function canUserReadRideLocation(ride: TestRide, userId: string, role: string, userDriverId?: string): boolean {
  if (role === 'admin') return true;
  if (ride.riderId === userId) return true;
  if (userDriverId && ride.driverId === userDriverId) return true;
  return false;
}

// 5. In-Memory Webhook Idempotency Store
class WebhookDeduplicator {
  private seen = new Set<string>();

  processEvent(eventId: string): 'processed' | 'duplicate' {
    if (this.seen.has(eventId)) {
      return 'duplicate';
    }
    this.seen.add(eventId);
    return 'processed';
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   RideBlue Integration & Security Verification Suite');
  console.log('======================================================\n');

  // Group 1: Razorpay Payment Signature Tests
  console.log('1. Payment Signatures & HMAC Security:');
  const secret = 'rzp_test_secret_1234567890';
  const orderId = 'order_OE7834bcde1234';
  const paymentId = 'pay_PX9876543210';
  const validSig = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

  assert(
    verifyRazorpaySignature(orderId, paymentId, validSig, secret),
    'Valid Razorpay HMAC signature is accepted'
  );

  assert(
    !verifyRazorpaySignature(orderId, paymentId, 'tampered_signature_hex_0000', secret),
    'Tampered signature is rejected'
  );

  assert(
    !verifyRazorpaySignature(orderId, paymentId, 'not-a-valid-hex-string', secret),
    'Malformed non-hex signature rejected without unhandled crash'
  );

  assert(
    !verifyRazorpaySignature('wrong_order_id', paymentId, validSig, secret),
    'Signature for mismatched order ID is rejected'
  );

  // Group 2: Webhook Idempotency & Raw-Body Verification
  console.log('\n2. Webhook Verification & Idempotency:');
  const webhookSecret = 'whsec_9876543210abcdef';
  const webhookBody = Buffer.from(JSON.stringify({ event: 'payment.captured', id: 'evt_test_101' }), 'utf-8');
  const validWebhookSig = crypto.createHmac('sha256', webhookSecret).update(webhookBody).digest('hex');

  assert(
    verifyWebhookSignature(webhookBody, validWebhookSig, webhookSecret),
    'Raw-body webhook HMAC-SHA256 signature validates'
  );

  assert(
    !verifyWebhookSignature(webhookBody, 'invalid_sig', webhookSecret),
    'Invalid webhook signature is rejected'
  );

  const dedupe = new WebhookDeduplicator();
  assert(
    dedupe.processEvent('evt_test_101') === 'processed',
    'First webhook event transmission processes successfully'
  );
  assert(
    dedupe.processEvent('evt_test_101') === 'duplicate',
    'Replayed duplicate webhook event ID is safely detected as duplicate'
  );

  // Group 3: Booking Ownership & Authorization
  console.log('\n3. Booking Ownership & Payment Authorization:');
  const riderProfileId = 'prof-rider-001';
  const attackerProfileId = 'prof-rider-999';

  const testRide: TestRide = {
    id: 'b5674c05-9989-4fae-9d21-f8a42533c301',
    riderId: riderProfileId,
    driverId: 'drv-partner-001',
    status: 'accepted',
    totalFare: 350,
    paymentStatus: 'pending',
  };

  assert(
    canRiderPayRide(testRide, riderProfileId).allowed,
    'Legitimate ride owner is authorized to initiate payment'
  );

  assert(
    !canRiderPayRide(testRide, attackerProfileId).allowed,
    'Attacker attempting to pay/manipulate another user ride is blocked'
  );

  const paidRide: TestRide = { ...testRide, paymentStatus: 'paid' };
  assert(
    !canRiderPayRide(paidRide, riderProfileId).allowed,
    'Double payment on already paid ride is prevented'
  );

  const cancelledRide: TestRide = { ...testRide, status: 'cancelled' };
  assert(
    !canRiderPayRide(cancelledRide, riderProfileId).allowed,
    'Payment on cancelled ride is prevented'
  );

  // Group 4: Driver GPS Telemetry & Tracking Authorization
  console.log('\n4. Driver GPS Tracking & Participant Authorization:');
  assert(
    validateGpsBounds(22.5726, 88.3639),
    'Kolkata GPS coordinate (22.5726, 88.3639) is within India bounds'
  );
  assert(
    validateGpsBounds(22.5857, 88.3426),
    'Howrah Station GPS coordinate (22.5857, 88.3426) is within India bounds'
  );
  assert(
    !validateGpsBounds(51.5074, -0.1278),
    'London GPS coordinate is rejected outside India operational boundary'
  );
  assert(
    !validateGpsBounds(NaN, 88.3639),
    'Non-finite GPS latitude is rejected'
  );

  assert(
    canDriverUpdateGps(testRide, 'drv-partner-001'),
    'Assigned driver on active accepted trip can upload GPS'
  );

  assert(
    !canDriverUpdateGps(testRide, 'drv-unrelated-999'),
    'Unassigned driver cannot upload GPS for another ride'
  );

  const completedRide: TestRide = { ...testRide, status: 'completed' };
  assert(
    !canDriverUpdateGps(completedRide, 'drv-partner-001'),
    'GPS updates stopped after ride status is completed'
  );

  assert(
    canUserReadRideLocation(testRide, riderProfileId, 'rider'),
    'Passenger on the ride can read driver location'
  );
  assert(
    canUserReadRideLocation(testRide, 'any-admin-id', 'admin'),
    'System administrator can read ride location'
  );
  assert(
    !canUserReadRideLocation(testRide, 'unrelated-user', 'rider'),
    'Unrelated user cannot read private ride GPS'
  );

  console.log('\n------------------------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

void runTests();
