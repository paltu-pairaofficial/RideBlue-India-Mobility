import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');

// Trust proxy for rate limiting behind reverse proxies
app.set('trust proxy', 1);

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAZORPAY_KEY = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK = process.env.RAZORPAY_WEBHOOK_SECRET;
const FARE_QUOTE_SECRET = process.env.FARE_QUOTE_SECRET;
const ENABLE_LIVE_BOOKING = process.env.ENABLE_LIVE_BOOKING === 'true';
const ENABLE_LIVE_PAYMENTS = process.env.ENABLE_LIVE_PAYMENTS === 'true';
const ENABLE_REFUNDS = process.env.ENABLE_REFUNDS === 'true';
const ROUTING_SERVICE_URL = (process.env.ROUTING_SERVICE_URL || 'https://router.project-osrm.org').replace(/\/$/, '');
const GEOCODING_SERVICE_URL = (process.env.GEOCODING_SERVICE_URL || 'https://photon.komoot.io').replace(/\/$/, '');

const db = SUPABASE_URL && SUPABASE_SERVICE
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

// Lightweight in-memory rate limiter per IP / token
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = (req.headers.authorization || req.ip || 'anon') + ':' + req.baseUrl + req.path;
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({ error: `Too many requests. Please wait ${retryAfter}s.` });
    }

    entry.count += 1;
    next();
  };
}

// Clean up stale rate limits periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);

// Timing-safe hexadecimal string comparison
function equalHex(a: string, b: string): boolean {
  if (!/^[a-f\d]+$/i.test(a) || !/^[a-f\d]+$/i.test(b) || a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

// Authenticated session middleware using Supabase Auth
interface AuthenticatedRequest extends Request {
  user?: any;
}

async function auth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON || !db) {
      return res.status(503).json({
        error: 'Supabase server configuration is missing. Ensure SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are set.'
      });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    }

    const client = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
    }

    req.user = data.user;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Authentication verification failed: ' + (err?.message || 'unknown') });
  }
}

// Helper to look up profile and verify ride ownership
async function getRiderRide(rideId: string, userId: string) {
  if (!db) return null;
  const { data: profile } = await db
    .from('profiles')
    .select('id, role')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) return null;

  const { data: ride } = await db
    .from('rides')
    .select('id, booking_code, rider_id, driver_id, total_fare, payment_status, payment_method, status')
    .eq('id', rideId)
    .eq('rider_id', profile.id)
    .maybeSingle();

  return ride;
}

// ==========================================
// 1. Health & Config Check
// ==========================================
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'RideBlue API',
    supabaseConfigured: !!(SUPABASE_URL && SUPABASE_SERVICE),
    razorpayConfigured: !!(RAZORPAY_KEY && RAZORPAY_SECRET),
    webhookConfigured: !!RAZORPAY_WEBHOOK,
    livePaymentsEnabled: ENABLE_LIVE_PAYMENTS,
    refundsEnabled: ENABLE_REFUNDS,
    environment: process.env.NODE_ENV || 'development',
  });
});

// ==========================================
// 2. Payments: Razorpay Webhook (Raw body)
// Must be mounted before express.json()
// ==========================================
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!db || !RAZORPAY_WEBHOOK) {
      return res.status(503).send('Webhook service not configured on server.');
    }

    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    const signature = String(req.headers['x-razorpay-signature'] || '');
    const expected = crypto.createHmac('sha256', RAZORPAY_WEBHOOK).update(raw).digest('hex');

    if (!equalHex(signature, expected)) {
      return res.status(400).send('Invalid webhook signature.');
    }

    try {
      const event = JSON.parse(raw.toString('utf-8'));
      const eventId = String(req.headers['x-razorpay-event-id'] || event?.id || '');

      if (!eventId) {
        return res.status(400).send('Missing event identifier.');
      }

      // Claim the event before processing. Failed claims are retryable; completed events are idempotent.
      const { error: claimError } = await db
        .from('processed_payment_webhooks')
        .insert({ event_id: eventId, event_type: String(event.event || 'unknown'), processing_status: 'processing', attempts: 1 });
      if (claimError) {
        const { data: prior } = await db.from('processed_payment_webhooks')
          .select('processing_status, processed_at, attempts')
          .eq('event_id', eventId).maybeSingle();
        if (prior?.processing_status === 'processed') return res.status(200).send('duplicate');
        const processedAt = prior?.processed_at ? new Date(prior.processed_at).getTime() : 0;
        if (prior?.processing_status === 'processing' && Date.now() - processedAt < 120000) return res.status(200).send('processing');
        const { data: retryRows, error: retryError } = await db.from('processed_payment_webhooks')
          .update({ processing_status: 'processing', attempts: Number(prior?.attempts || 0) + 1, last_error: null, processed_at: new Date().toISOString() })
          .eq('event_id', eventId).neq('processing_status', 'processed').select('event_id');
        if (retryError || !retryRows?.length) return res.status(503).send('Webhook event could not be claimed for retry.');
      }

      try {
        if (event.event === 'payment.captured' || event.event === 'payment.failed') {
          const payment = event.payload?.payment?.entity;
          const rideId = String(payment?.notes?.ride_id || '');
          const orderId = String(payment?.order_id || '');
          const providerPaymentId = String(payment?.id || '');
          const amount = Number(payment?.amount);
          const currency = String(payment?.currency || '');
          if (!rideId || !orderId || !providerPaymentId || !Number.isSafeInteger(amount) || amount <= 0 || currency !== 'INR') {
            throw new Error('Webhook payment payload is incomplete or invalid.');
          }
          const { data: storedPayment, error: lookupError } = await db.from('payments')
            .select('id, ride_id, amount, currency, status, provider_order_id')
            .eq('ride_id', rideId).eq('provider', 'razorpay').eq('provider_order_id', orderId).maybeSingle();
          if (lookupError) throw new Error('Could not load the matching stored payment order.');
          if (!storedPayment) throw new Error('No stored payment matches the provider order.');
          if (storedPayment.currency !== currency || Math.round(Number(storedPayment.amount) * 100) !== amount) {
            throw new Error('Webhook amount or currency does not match the stored payment order.');
          }
          if (event.event === 'payment.captured') {
            const { data: reconciliation, error: reconcileError } = await db.rpc('record_verified_razorpay_payment', {
              p_ride_id: rideId, p_order_id: orderId, p_payment_id: providerPaymentId,
              p_amount_paise: amount, p_currency: currency,
            });
            if (reconcileError) throw new Error('Captured payment could not be atomically reconciled.');
            if (reconciliation?.ok !== true) {
              if (reconciliation?.reason === 'amount_or_currency_mismatch') {
                const { error: mismatchEventError } = await db.from('processed_payment_webhooks').update({ processing_status: 'processed', processed_at: new Date().toISOString(), last_error: 'Payment mismatch recorded for manual reconciliation.' }).eq('event_id', eventId);
                if (mismatchEventError) throw new Error('Payment mismatch was recorded but webhook audit finalization failed.');
                return res.status(200).send('payment_mismatch_recorded_for_reconciliation');
              }
              throw new Error('Captured payment could not be atomically reconciled.');
            }
          } else if (storedPayment.status === 'pending') {
            const { error: failError } = await db.from('payments').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', storedPayment.id).eq('status', 'pending');
            if (failError) throw new Error('Payment failure could not be persisted.');
          }
        }
        if (event.event === 'refund.processed' || event.event === 'refund.failed') {
          const refund = event.payload?.refund?.entity;
          const providerRefundId = String(refund?.id || '');
          const providerPaymentId = String(refund?.payment_id || '');
          const amountPaise = Number(refund?.amount);
          if (!providerRefundId || !providerPaymentId || !Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
            throw new Error('Refund webhook payload is incomplete or invalid.');
          }
          const { data: refundRow, error: refundLookupError } = await db.from('payment_refunds')
            .select('id, payment_id, ride_id, amount, status')
            .eq('provider_refund_id', providerRefundId).maybeSingle();
          if (refundLookupError) throw new Error('Could not locate the stored refund request.');
          if (!refundRow) throw new Error('Refund webhook does not match a stored refund request.');
          const { data: refundPayment, error: refundPaymentError } = await db.from('payments')
            .select('id, provider_payment_id, amount').eq('id', refundRow.payment_id).maybeSingle();
          if (refundPaymentError || !refundPayment) throw new Error('Refund payment record is unavailable.');
          if (Math.round(Number(refundRow.amount) * 100) !== amountPaise || refundPayment.provider_payment_id !== providerPaymentId) {
            throw new Error('Refund amount or payment reference mismatch.');
          }
          const isCompleted = event.event === 'refund.processed';
          const { error: refundUpdateError } = await db.from('payment_refunds').update({
            status: isCompleted ? 'completed' : 'failed',
            completed_at: isCompleted ? new Date().toISOString() : null,
            provider_updated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            failure_reason: isCompleted ? null : 'Razorpay reported refund failure.',
          }).eq('id', refundRow.id).in('status', ['requested', 'processing', 'requires_review']);
          if (refundUpdateError) throw new Error('Refund state could not be persisted.');
          await db.from('financial_audit_events').insert({
            ride_id: refundRow.ride_id, payment_id: refundRow.payment_id, refund_id: refundRow.id,
            event_type: 'refund_updated', provider_reference: providerRefundId, amount: Number(refundRow.amount),
            currency: 'INR', details: { status: isCompleted ? 'completed' : 'failed' },
          });
          if (isCompleted) {
            const { data: paymentRow } = await db.from('payments').select('id, ride_id, amount').eq('id', refundRow.payment_id).maybeSingle();
            if (paymentRow) {
              const { data: completedRefunds } = await db.from('payment_refunds').select('amount').eq('payment_id', paymentRow.id).eq('status', 'completed');
              const refundedTotal = (completedRefunds || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
              const fullyRefunded = refundedTotal >= Number(paymentRow.amount);
              await db.from('payments').update({ refund_amount: refundedTotal, status: fullyRefunded ? 'refunded' : 'paid', updated_at: new Date().toISOString() }).eq('id', paymentRow.id);
              if (fullyRefunded) await db.from('rides').update({ payment_status: 'refunded', refund_status: 'completed' }).eq('id', paymentRow.ride_id);
            }
          }
        }
        // Unknown but correctly signed events are acknowledged after being durably recorded.
        const { error: doneError } = await db.from('processed_payment_webhooks').update({ processing_status: 'processed', processed_at: new Date().toISOString(), last_error: null }).eq('event_id', eventId);
        if (doneError) throw new Error('Webhook processed but its idempotency record could not be finalized.');
      } catch (processingError: any) {
        await db.from('processed_payment_webhooks').update({ processing_status: 'failed', last_error: String(processingError?.message || 'processing failed').slice(0, 500), processed_at: new Date().toISOString() }).eq('event_id', eventId);
        throw processingError;
      }
      return res.status(200).send('ok');
    } catch (err: any) {
      console.error('Webhook processing failed; provider retry may be required.');
      return res.status(500).send('Webhook processing failed.');
    }
  }
);

// Apply JSON parsing for remaining API routes
app.use(express.json({ limit: '100kb' }));

// ==========================================
// Trusted fare quotes and booking creation
// The browser never supplies an authoritative distance or fare.
// ==========================================
type QuotePoint = { address: string; lat: number; lng: number; isAirport?: boolean };
type QuotePayload = {
  scheduledFor: string | null;
  userId: string;
  pickup: QuotePoint;
  destination: QuotePoint;
  stops: QuotePoint[];
  vehicleCategory: string;
  passengerCount: number;
  distanceKm: number;
  durationMinutes: number;
  pricingVersion: number;
  maxPassengers: number;
  includedPassengers: number;
  fare: { baseFare: number; distanceCharge: number; timeCharge: number; extraPassengerCharge: number; subtotal: number; taxes: number; total: number; currency: 'INR'; airportLevyAmount: number; airportLevyRules: any[]; airportLevyVerificationRequired: boolean; tollCharges: null; tollPolicy: string };
  airportLevyRules: any[];
  airportLevyAmount: number;
  airportLevyVerificationRequired: boolean;
  expiresAt: number;
};
const VEHICLE_CATEGORIES = new Set(['economy', 'sedan', 'suv', 'xl', 'airport_transfer']);
const PAYMENT_METHODS = new Set(['cash', 'razorpay', 'upi']);
function isCoordinatePoint(value: any): value is QuotePoint {
  return !!value && typeof value.address === 'string' && value.address.trim().length > 0 && value.address.trim().length <= 500 &&
    Number.isFinite(value.lat) && Number.isFinite(value.lng) && value.lat >= 6 && value.lat <= 37.5 && value.lng >= 68 && value.lng <= 97.5;
}
function signQuote(payload: QuotePayload): string | null {
  if (!FARE_QUOTE_SECRET || FARE_QUOTE_SECRET.length < 32) return null;
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', FARE_QUOTE_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}
function verifyQuote(token: string): QuotePayload | null {
  if (!FARE_QUOTE_SECRET || FARE_QUOTE_SECRET.length < 32 || typeof token !== 'string') return null;
  const [encoded, suppliedSignature, extra] = token.split('.');
  if (!encoded || !suppliedSignature || extra) return null;
  const expected = crypto.createHmac('sha256', FARE_QUOTE_SECRET).update(encoded).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(suppliedSignature, 'base64url'); } catch { return null; }
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as QuotePayload;
    if (!payload.userId || !Number.isFinite(payload.expiresAt) || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch { return null; }
}
async function getRiderProfile(userId: string) {
  if (!db) return null;
  const { data, error } = await db.from('profiles').select('id, role, user_id').eq('user_id', userId).maybeSingle();
  if (error || !data || data.role !== 'rider') return null;
  return data;
}


async function resolveTrustedPoint(point: QuotePoint): Promise<QuotePoint> {
  const gpsMatch = point.address.match(
    /^Selected GPS location \((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)$/i
  );

  if (gpsMatch) {
    const lat = Number(gpsMatch[1]);
    const lng = Number(gpsMatch[2]);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < 6 || lat > 37.5 ||
      lng < 68 || lng > 97.5
    ) {
      throw new Error('The current GPS point is outside the supported India service area.');
    }

    return { ...point, lat, lng, isAirport: false };
  }

  const url = new URL('/api/', `${GEOCODING_SERVICE_URL}/`);
  url.searchParams.set('q', point.address);
  url.searchParams.set('limit', '5');
  url.searchParams.set('lang', 'en');
  url.searchParams.set('bbox', '68.0,6.0,97.5,37.5');

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'RideBlueBooking/1.0 (server-side route validation)',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error('Address validation service is unavailable. Please try again.');
  }

  const result = await response.json() as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
      properties?: {
        country?: string;
        name?: string;
        city?: string;
        state?: string;
        osm_key?: string;
        osm_value?: string;
        type?: string;
        category?: string;
      };
    }>;
  };

  const candidates = result.features || [];

  const feature = candidates.find((item) => {
    const coords = item.geometry?.coordinates;
    const props = item.properties;
    return !!coords &&
      Number.isFinite(coords[0]) &&
      Number.isFinite(coords[1]) &&
      coords[1] >= 6 && coords[1] <= 37.5 &&
      coords[0] >= 68 && coords[0] <= 97.5 &&
      (!props?.country || props.country.toLowerCase() === 'india');
  });

  if (!feature?.geometry?.coordinates) {
    throw new Error(`Could not validate address "${point.address}". Please select a location suggestion and try again.`);
  }

  const [lng, lat] = feature.geometry.coordinates;
  const props = feature.properties || {};
  const airportText = [
    props.name,
    props.osm_key,
    props.osm_value,
    props.type,
    props.category,
  ].filter(Boolean).join(' ');

  const isAirport = /airport|aerodrome/i.test(airportText);

  return { ...point, lat, lng, isAirport };
}


async function getTrustedRoute(points: QuotePoint[]) {
  if (points.length < 2 || points.length > 4) throw new Error('A route must have pickup, destination, and no more than two intermediate stops.');
  const coords = points.map((point) => `${point.lng},${point.lat}`).join(';');
  const response = await fetch(`${ROUTING_SERVICE_URL}/route/v1/driving/${coords}?overview=false&steps=false`, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('The routing service is unavailable. Please try again.');
  const result = await response.json() as { code?: string; routes?: Array<{ distance: number; duration: number }> };
  const route = result.routes?.[0];
  if (result.code !== 'Ok' || !route || !Number.isFinite(route.distance) || !Number.isFinite(route.duration) || route.distance <= 0 || route.duration <= 0) {
    throw new Error('No valid driving route was found for these locations.');
  }
  return { distanceKm: Math.round((route.distance / 1000) * 100) / 100, durationMinutes: Math.max(1, Math.round(route.duration / 60)) };
}
async function buildFareQuote(userId: string, body: any): Promise<QuotePayload> {
  if (!db) throw new Error('Supabase server configuration is missing.');
  const pickup = body?.pickup;
  const destination = body?.destination;
  const stops = Array.isArray(body?.stops) ? body.stops : [];
  const category = String(body?.vehicleCategory || '');
  const passengerCount = Number(body?.passengerCount);
  if (!isCoordinatePoint(pickup) || !isCoordinatePoint(destination) || !stops.every(isCoordinatePoint) || stops.length > 2) {
    throw new Error('Choose valid pickup, destination, and intermediate stop suggestions.');
  }
  if (!VEHICLE_CATEGORIES.has(category)) throw new Error('Select a supported vehicle category.');
  if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 8) throw new Error('Passenger count must be between 1 and 8.');

  const scheduledFor: string | null = (() => {
    if (body?.scheduledFor == null || body.scheduledFor === '') {
      return null;
    }

    const parsed = new Date(body.scheduledFor);

    if (
      !Number.isFinite(parsed.getTime()) ||
      parsed.getTime() < Date.now() - 60_000
    ) {
      throw new Error('Scheduled pickup time must be a valid future time.');
    }

    return parsed.toISOString();
  })();

  const effectiveAt = scheduledFor ?? new Date().toISOString();

  console.log('[FARE DEBUG] category:', category);
  console.log('[FARE DEBUG] effective time:', effectiveAt);
  const { data: rule, error: ruleError } = await db
    .from('fare_rules')
    .select('*')
    .eq('vehicle_category', category)
    .eq('active', true)
    .lte('effective_from', effectiveAt)
    .or(`effective_until.is.null,effective_until.gt.${effectiveAt}`)
    .order('effective_from', { ascending: false })
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (ruleError) {
    console.error('[FARE DEBUG] Rule query failed:', ruleError);
    throw new Error(`Approved fare rules could not be loaded: ${ruleError.message}`);
  }

  console.log('[FARE DEBUG] Selected rule:', rule
    ? { category: rule.vehicle_category, version: rule.version }
    : null);

  if (!rule) {
    throw new Error(
      `Production pricing is not configured for ${category.replace('_', ' ')}. No booking can be created.`
    );
  }

  console.log('[FARE DEBUG] Starting pickup validation');
  const resolvedPickup = await resolveTrustedPoint(pickup);
  console.log('[FARE DEBUG] Pickup validation completed');

  console.log('[FARE DEBUG] Starting destination validation');
  const resolvedDestination = await resolveTrustedPoint(destination);
  console.log('[FARE DEBUG] Destination validation completed');

  console.log('[FARE DEBUG] Starting stop validation');
  const resolvedStops = await Promise.all(
    stops.map(resolveTrustedPoint)
  );
  console.log('[FARE DEBUG] Stop validation completed');

  console.log('[FARE DEBUG] Starting OSRM route calculation');
  const route = await getTrustedRoute([
    resolvedPickup,
    ...resolvedStops,
    resolvedDestination,
  ]);
  console.log('[FARE DEBUG] OSRM route calculation completed');

  const { data: latestRule, error: latestRuleError } = await db
    .from('fare_rules')
    .select('*')
    .eq('vehicle_category', category)
    .eq('active', true)
    .lte('effective_from', effectiveAt)
    .or(`effective_until.is.null,effective_until.gt.${effectiveAt}`)
    .order('effective_from', { ascending: false })
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestRuleError || !latestRule || Number(latestRule.version) !== Number(rule.version)) throw new Error('Pricing changed while the route was being calculated. Request a fresh quote.');
  const { data: calculated, error: calculationError } =
    await db.rpc('calculate_fare_quote_v2_at', {
      p_vehicle_category: category,
      p_passenger_count: passengerCount,
      p_distance_km: route.distanceKm,
      p_duration_minutes: route.durationMinutes,
      p_expected_version: Number(latestRule.version),
      p_pickup_address: resolvedPickup.address,
      p_destination_address: resolvedDestination.address,
      p_effective_at: effectiveAt,
    });
  if (calculationError || !calculated) throw new Error(calculationError?.message || 'Trusted fare calculation is unavailable.');
  const airportLevyRules = Array.isArray(calculated.airportLevyRules)
    ? calculated.airportLevyRules
    : [];

  const fare = {
    baseFare: Number(calculated.baseFare),
    distanceCharge: Number(calculated.distanceCharge),
    timeCharge: Number(calculated.timeCharge),
    extraPassengerCharge: Number(calculated.extraPassengerCharge),
    subtotal: Number(calculated.subtotal),
    taxes: Number(calculated.taxes),
    total: Number(calculated.total),
    currency: 'INR' as const,
    airportLevyAmount: Number(calculated.airportLevyAmount || 0),
    airportLevyRules,
    airportLevyVerificationRequired: Boolean(
      calculated.airportLevyVerificationRequired
    ),
    tollCharges: null,
    tollPolicy: String(
      calculated.tollPolicy ||
      'Actual tolls are additional and require verification.'
    ),
  };

  if (![fare.baseFare, fare.distanceCharge, fare.timeCharge, fare.extraPassengerCharge, fare.subtotal, fare.taxes, fare.total].every((value) => Number.isFinite(value) && value >= 0)) throw new Error('Trusted fare calculation returned invalid values.');
  return {
    userId,
    scheduledFor,
    pickup: resolvedPickup,
    destination: resolvedDestination,
    stops: resolvedStops,
    vehicleCategory: category,
    passengerCount,
    ...route,
    pricingVersion: Number(calculated.pricingVersion),
    maxPassengers: Number(calculated.maxPassengers),
    includedPassengers: Number(calculated.includedPassengers),
    airportLevyAmount: fare.airportLevyAmount,
    airportLevyRules: fare.airportLevyRules,
    airportLevyVerificationRequired: fare.airportLevyVerificationRequired,
    fare,
    expiresAt: Date.now() + 5 * 60 * 1000
  };
}

app.post('/api/fare-quote', rateLimit(20, 60000), auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!FARE_QUOTE_SECRET || FARE_QUOTE_SECRET.length < 32) return res.status(503).json({ error: 'Fare quote signing is not configured. Set FARE_QUOTE_SECRET to a random secret of at least 32 characters.' });
    if (!await getRiderProfile(req.user.id)) return res.status(403).json({ error: 'Only authenticated rider accounts can request a fare quote.' });
    const quote = await buildFareQuote(req.user.id, req.body);
    const quoteToken = signQuote(quote);
    if (!quoteToken) return res.status(503).json({ error: 'Fare quote signing is unavailable.' });
    return res.json({ quoteToken, pricingVersion: quote.pricingVersion, vehicleCategory: quote.vehicleCategory, passengerCount: quote.passengerCount, maxPassengers: quote.maxPassengers, includedPassengers: quote.includedPassengers, distanceKm: quote.distanceKm, durationMinutes: quote.durationMinutes, fare: quote.fare, airportLevyAmount: quote.airportLevyAmount, airportLevyRules: quote.airportLevyRules, airportLevyVerificationRequired: quote.airportLevyVerificationRequired, tollPolicy: quote.fare.tollPolicy, expiresAt: new Date(quote.expiresAt).toISOString() });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message || 'Unable to calculate a trusted fare quote.' });
  }
});

app.post('/api/bookings', rateLimit(8, 60000), auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!ENABLE_LIVE_BOOKING) return res.status(503).json({ error: 'Live booking creation is disabled until the fare and booking flow has been verified. Set ENABLE_LIVE_BOOKING=true only after applying reviewed migrations 05 and 06 and completing the required integration tests.' });
    if (!db) return res.status(503).json({ error: 'Supabase server configuration is missing.' });
    const quote = verifyQuote(req.body?.quoteToken);
    if (!quote) return res.status(400).json({ error: 'Fare quote is invalid or expired. Request a new quote.' });
    if (quote.userId !== req.user.id) return res.status(403).json({ error: 'This fare quote belongs to a different account.' });
    if (quote.airportLevyVerificationRequired) return res.status(409).json({ error: 'This journey may require an airport levy, but no applicable approved rule could be determined. Ask an administrator to configure the airport rule before booking.' });
    const idempotencyKey = String(req.body?.idempotencyKey || '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) return res.status(400).json({ error: 'A valid booking request ID is required.' });
    const paymentMethod = String(req.body?.paymentMethod || '');
    if (!PAYMENT_METHODS.has(paymentMethod)) return res.status(400).json({ error: 'Select a supported payment method.' });
    let scheduledFor: string | null = null;
    if (req.body?.scheduledFor) {
      const parsed = new Date(req.body.scheduledFor);
      if (!Number.isFinite(parsed.getTime()) || parsed.getTime() < Date.now() - 60_000) return res.status(400).json({ error: 'Scheduled pickup time must be a valid future time.' });
      scheduledFor = parsed.toISOString();

    }
    if (scheduledFor !== quote.scheduledFor) {
      return res.status(409).json({
        error: 'Pickup time differs from the quoted journey. Request a fresh fare quote.'
      });
    }
    const requestFingerprint = crypto.createHash('sha256').update(JSON.stringify({ quoteToken: req.body.quoteToken, paymentMethod, scheduledFor })).digest('hex');
    const { data, error } = await db.rpc('create_ride_with_fare_quote_v2', {
      p_auth_user_id: req.user.id,
      p_idempotency_key: idempotencyKey,
      p_request_fingerprint: requestFingerprint,
      p_pickup: quote.pickup,
      p_destination: quote.destination,
      p_stops: quote.stops,
      p_vehicle_category: quote.vehicleCategory,
      p_passenger_count: quote.passengerCount,
      p_distance_km: quote.distanceKm,
      p_duration_minutes: quote.durationMinutes,
      p_pricing_version: quote.pricingVersion,
      p_payment_method: paymentMethod,
      p_expected_airport_levy: quote.airportLevyAmount || 0,
      p_expected_airport_levy_rules: quote.airportLevyRules || [],
      p_scheduled_for: scheduledFor,
    });
    if (error) {
      const conflict = /pricing changed|fare rule|airport levy rules changed/i.test(error.message);
      return res.status(conflict ? 409 : 400).json({ error: conflict ? 'Pricing or airport levy rules changed after this quote. Request a fresh quote before booking.' : error.message });
    }
    const ride = Array.isArray(data) ? data[0] : data;
    if (!ride?.id) return res.status(500).json({ error: 'The booking operation returned no saved ride. Please check your bookings before retrying.' });
    return res.status(201).json({ id: ride.id, bookingCode: ride.booking_code, status: ride.status, totalFare: Number(ride.total_fare), pricingVersion: ride.pricing_version });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Booking creation failed.' });
  }
});

// Actual-cost toll adjustments are separate from the quoted ride fare. They remain pending until an admin verifies them.
app.post('/api/rides/:rideId/tolls', rateLimit(10, 60000), auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON) return res.status(503).json({ error: 'Supabase user-scoped API configuration is missing.' });
    const rideId = String(req.params.rideId || '');
    const { amount, details, recordingSource, sourceReference, idempotencyKey } = req.body || {};
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rideId) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(idempotencyKey || '')) ||
      !Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount) > 100000 || typeof details !== 'string' || details.trim().length < 3) {
      return res.status(400).json({ error: 'Provide a valid ride, idempotency key, positive toll amount and description.' });
    }
    const callerDb = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: String(req.headers.authorization || '') } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await callerDb.rpc('record_ride_toll_adjustment', {
      p_ride_id: rideId, p_amount: Number(amount), p_details: details.trim(), p_recording_source: String(recordingSource || 'driver_report'),
      p_source_reference: sourceReference || null, p_idempotency_key: idempotencyKey,
    });
    if (error) return res.status(/not found|only the assigned|administrator|invalid|authentication|reused/i.test(error.message) ? 400 : 500).json({ error: error.message });
    return res.status(201).json({ adjustment: data, message: 'Toll recorded as pending verification. It has not been added to paid fare or verified driver earnings.' });
  } catch (error: any) { return res.status(500).json({ error: error?.message || 'Could not record toll adjustment.' }); }
});

app.patch('/api/tolls/:adjustmentId/verify', rateLimit(20, 60000), auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON) return res.status(503).json({ error: 'Supabase user-scoped API configuration is missing.' });
    const adjustmentId = String(req.params.adjustmentId || ''); const decision = String(req.body?.decision || '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(adjustmentId) || !['verified', 'rejected'].includes(decision)) return res.status(400).json({ error: 'A valid toll adjustment and verification decision are required.' });
    const callerDb = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: String(req.headers.authorization || '') } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await callerDb.rpc('review_ride_toll_adjustment', { p_adjustment_id: adjustmentId, p_decision: decision });
    if (error) return res.status(/administrator|pending|decision/i.test(error.message) ? 403 : 500).json({ error: error.message });
    return res.json({ adjustment: data });
  } catch (error: any) { return res.status(500).json({ error: error?.message || 'Could not review toll adjustment.' }); }
});

// ==========================================
// 3. Payments: Create Order
// ==========================================
app.post(
  '/api/payments/create-order',
  rateLimit(15, 60000),
  auth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!ENABLE_LIVE_PAYMENTS) {
        return res.status(503).json({ error: 'Online payments are disabled until Razorpay sandbox verification and payment reconciliation tests pass.' });
      }
      if (!RAZORPAY_KEY || !RAZORPAY_SECRET || !db) {
        return res.status(503).json({
          error: 'Razorpay payment gateway or Supabase database is not configured. Define RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and SUPABASE_SERVICE_ROLE_KEY.',
        });
      }

      const rideId = String(req.body?.rideId || '').trim();
      if (!/^[\da-f-]{36}$/i.test(rideId)) {
        return res.status(400).json({ error: 'Valid UUID rideId is required.' });
      }

      const ride = await getRiderRide(rideId, req.user.id);
      if (!ride) {
        return res.status(404).json({ error: 'Ride not found or does not belong to this account.' });
      }

      if (['paid', 'refunded'].includes(String(ride.payment_status))) {
        return res.status(409).json({ error: 'This ride is already paid or refunded and cannot start another payment.' });
      }
      if (!['razorpay', 'upi'].includes(String(ride.payment_method))) {
        return res.status(409).json({ error: 'This booking does not use an online Razorpay payment method.' });
      }

      if (ride.status === 'cancelled') {
        return res.status(400).json({ error: 'Cannot process payment for a cancelled ride.' });
      }

      const amountPaise = Math.round(Number(ride.total_fare) * 100);
      if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) {
        return res.status(400).json({ error: 'Invalid fare calculation for online payment.' });
      }
      const idempotencyKey = String(req.body?.idempotencyKey || '');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
        return res.status(400).json({ error: 'A valid payment idempotency key is required.' });
      }
      const { data: priorOrder, error: priorOrderError } = await db.from('payments')
        .select('provider_order_id, amount, currency, status')
        .eq('ride_id', rideId).eq('provider', 'razorpay').eq('idempotency_key', idempotencyKey).maybeSingle();
      if (priorOrderError) return res.status(500).json({ error: 'Could not check existing payment request.' });
      if (priorOrder) {
        if (Number(priorOrder.amount) !== Number(ride.total_fare) || priorOrder.currency !== 'INR') {
          return res.status(409).json({ error: 'Payment idempotency key was reused with different booking details.' });
        }
        if (priorOrder.status !== 'pending' || !priorOrder.provider_order_id) {
          return res.status(409).json({ error: 'This payment request may still be processing or requires reconciliation. Refresh payment status before retrying.' });
        }
        return res.json({ keyId: RAZORPAY_KEY, orderId: priorOrder.provider_order_id, amount: amountPaise, currency: 'INR' });
      }
      const { data: existingPendingOrder, error: pendingOrderError } = await db.from('payments')
        .select('provider_order_id, amount, currency, status')
        .eq('ride_id', rideId).eq('provider', 'razorpay').eq('status', 'pending')
        .not('provider_order_id', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (pendingOrderError) return res.status(500).json({ error: 'Could not check for an existing pending payment.' });
      if (existingPendingOrder?.provider_order_id) {
        if (Number(existingPendingOrder.amount) !== Number(ride.total_fare) || existingPendingOrder.currency !== 'INR') {
          return res.status(409).json({ error: 'Existing payment amount differs from the current booking. Contact support before retrying.' });
        }
        return res.json({ keyId: RAZORPAY_KEY, orderId: existingPendingOrder.provider_order_id, amount: amountPaise, currency: 'INR' });
      }

      // Reserve the payment idempotency key before contacting the provider. Concurrent retries cannot create two orders.
      const { data: reservedPayment, error: reserveError } = await db.from('payments').insert({
        ride_id: rideId, amount: Number(ride.total_fare), currency: 'INR', provider: 'razorpay',
        idempotency_key: idempotencyKey, status: 'pending',
      }).select('id').single();
      if (reserveError || !reservedPayment) {
        return res.status(409).json({ error: 'This payment request may already be processing. Refresh payment status before retrying.' });
      }

      // Call Razorpay Orders API
      const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY}:${RAZORPAY_SECRET}`).toString('base64');
      const rpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: `ride_${rideId.slice(0, 18)}_${idempotencyKey.slice(0, 8)}`,
          notes: {
            ride_id: rideId,
            booking_code: ride.booking_code,
          },
        }),
      });

      const orderData: any = await rpRes.json();
      if (!rpRes.ok) {
        await db.from('payments').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', reservedPayment.id).eq('status', 'pending');
        return res.status(502).json({ error: orderData?.error?.description || 'Razorpay order creation failed.' });
      }

      // Persist exact provider order against the reserved payment request before returning it.
      const { data: savedOrder, error: dbError } = await db.from('payments').update({
        provider_transaction_id: orderData.id, provider_order_id: orderData.id, updated_at: new Date().toISOString(),
      }).eq('id', reservedPayment.id).eq('status', 'pending').select('id').single();
      if (dbError || !savedOrder) {
        console.error('Provider order exists but local order persistence failed; reconciliation is required.');
        return res.status(500).json({ error: 'The payment order could not be safely recorded. Contact support before retrying.' });
      }

      res.json({
        keyId: RAZORPAY_KEY,
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
      });
    } catch (err: any) {
      console.error('Order creation error:', err);
      res.status(500).json({ error: 'Payment order creation failed: ' + (err?.message || 'internal error') });
    }
  }
);

// ==========================================
// 4. Payments: Verify Signature Server-Side
// ==========================================

app.post(
  '/api/payments/verify',
  rateLimit(20, 60000),
  auth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!ENABLE_LIVE_PAYMENTS) {
        return res.status(503).json({ error: 'Online payments are disabled until Razorpay sandbox verification and payment reconciliation tests pass.' });
      }
      if (!RAZORPAY_KEY || !RAZORPAY_SECRET || !db) {
        return res.status(503).json({
          error: 'Payment gateway configuration is missing.',
        });
      }

      const {
        rideId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = req.body || {};

      if (
        typeof rideId !== 'string' ||
        typeof razorpay_order_id !== 'string' ||
        typeof razorpay_payment_id !== 'string' ||
        typeof razorpay_signature !== 'string' ||
        !/^[\da-f-]{36}$/i.test(rideId) ||
        !/^order_[\da-z]+$/i.test(razorpay_order_id) ||
        !/^pay_[\da-z]+$/i.test(razorpay_payment_id) ||
        !/^[a-f\d]{64}$/i.test(razorpay_signature)
      ) {
        return res.status(400).json({
          error: 'Invalid or missing payment verification details.',
        });
      }

      // 1. Verify that this ride belongs to the signed-in rider.
      const ride = await getRiderRide(rideId, req.user.id);

      if (!ride) {
        return res.status(404).json({
          error: 'Ride not found or account mismatch.',
        });
      }

      if (ride.status === 'cancelled') {
        return res.status(400).json({
          error: 'Cannot verify payment for a cancelled ride.',
        });
      }

      // 2. Verify the signature using the server-side secret.
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (!equalHex(razorpay_signature, expectedSignature)) {
        return res.status(400).json({
          error: 'Invalid payment signature.',
        });
      }

      // 3. Confirm this exact Razorpay order belongs to
      //    this ride and has a pending payment record.
      const { data: payment, error: paymentLookupError } = await db
        .from('payments')
        .select('id, amount, currency, status, provider_transaction_id, provider_order_id, provider_payment_id')
        .eq('ride_id', rideId)
        .eq('provider', 'razorpay')
        .eq('provider_order_id', razorpay_order_id)
        .maybeSingle();

      if (paymentLookupError) {
        console.error('Payment lookup failed:', paymentLookupError);
        return res.status(500).json({
          error: 'Could not verify the stored payment order.',
        });
      }

      if (!payment) {
        return res.status(409).json({
          error: 'No matching payment order exists for this ride.',
        });
      }

      if (payment.status !== 'pending' && !(payment.status === 'paid' && payment.provider_payment_id === razorpay_payment_id)) {
        return res.status(409).json({ error: 'Payment is not pending or does not match the already recorded payment.' });
      }

      const expectedAmountPaise = Math.round(
        Number(ride.total_fare) * 100
      );

      if (
        !Number.isSafeInteger(expectedAmountPaise) ||
        expectedAmountPaise < 100 ||
        Math.round(Number(payment.amount) * 100) !== expectedAmountPaise ||
        payment.currency !== 'INR'
      ) {
        return res.status(409).json({
          error: 'Stored payment amount or currency does not match the ride.',
        });
      }

      // 4. Ask Razorpay for the authoritative payment details.
      const authHeader =
        'Basic ' +
        Buffer.from(`${RAZORPAY_KEY}:${RAZORPAY_SECRET}`).toString('base64');

      const paymentRes = await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(
          razorpay_payment_id
        )}`,
        {
          headers: { Authorization: authHeader },
        }
      );

      if (!paymentRes.ok) {
        console.error(
          'Razorpay payment lookup failed:',
          paymentRes.status
        );

        return res.status(502).json({
          error: 'Could not verify payment status with Razorpay.',
        });
      }

      const paymentEntity: any = await paymentRes.json();

      // Only a captured payment is accepted as paid.
      if (
        paymentEntity.order_id !== razorpay_order_id ||
        paymentEntity.status !== 'captured' ||
        paymentEntity.currency !== 'INR' ||
        Number(paymentEntity.amount) !== expectedAmountPaise
      ) {
        return res.status(409).json({
          error: 'Payment is not captured or its order, amount, or currency does not match.',
        });
      }

      // 5. Reconcile payment and ride status atomically in PostgreSQL.
      const { data: reconciliation, error: reconciliationError } = await db.rpc('record_verified_razorpay_payment', {
        p_ride_id: rideId,
        p_order_id: razorpay_order_id,
        p_payment_id: razorpay_payment_id,
        p_amount_paise: Number(paymentEntity.amount),
        p_currency: String(paymentEntity.currency),
      });
      if (reconciliationError) {
        console.error('Atomic payment reconciliation failed.');
        return res.status(500).json({ error: 'Payment was verified with Razorpay but could not be atomically recorded. Please contact support before retrying.' });
      }
      if (reconciliation?.ok !== true) return res.status(409).json({ error: 'Provider amount or currency did not match the stored order. The mismatch was recorded for manual reconciliation.' });

      return res.json({
        verified: true,
        status: 'paid',
        paymentId: razorpay_payment_id,
      });
    } catch (err: any) {
      console.error('Verification error:', err);

      return res.status(500).json({
        error: 'Payment verification failed. Please try again or contact support.',
      });
    }
  }
);


// ==========================================
// 5. Refunds: admin initiated, policy-gated and provider-reconciled
// ==========================================
app.post('/api/admin/payments/:paymentId/refunds', rateLimit(5, 60000), auth, async (req: AuthenticatedRequest, res: Response) => {
  if (!ENABLE_REFUNDS) return res.status(503).json({ error: 'Refund initiation is disabled until the approved refund policy and sandbox workflow are configured.' });
  if (!db || !RAZORPAY_KEY || !RAZORPAY_SECRET) return res.status(503).json({ error: 'Refund provider or database configuration is unavailable.' });
  try {
    const paymentId = String(req.params.paymentId || '');
    const idempotencyKey = String(req.body?.idempotencyKey || '');
    const reason = String(req.body?.reason || '').trim();
    const amount = Number(req.body?.amount);
    if (!/^[0-9a-f-]{36}$/i.test(paymentId) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey) || !Number.isFinite(amount) || amount <= 0 || amount > 1000000 || reason.length < 5 || reason.length > 1000) {
      return res.status(400).json({ error: 'Valid payment ID, idempotency key, positive refund amount and reason are required.' });
    }
    const { data: profile } = await db.from('profiles').select('role').eq('user_id', req.user.id).maybeSingle();
    if (profile?.role !== 'admin') return res.status(403).json({ error: 'Administrator privileges required.' });
    const { data: refundPolicy, error: refundPolicyError } = await db.from('platform_settings').select('setting_value').eq('setting_key', 'refund_policy').maybeSingle();
    if (refundPolicyError || !refundPolicy || refundPolicy.setting_value?.enabled !== true || String(refundPolicy.setting_value?.policy_text || '').trim().length < 20) {
      return res.status(503).json({ error: 'No enabled, administrator-approved refund policy is configured. Refund initiation remains disabled.' });
    }
    const policyMax = Number(refundPolicy.setting_value?.max_refund_amount);
    if (Number.isFinite(policyMax) && policyMax > 0 && amount > policyMax) return res.status(400).json({ error: 'Refund amount exceeds the configured per-refund policy limit.' });
    const { data: payment, error: paymentError } = await db.from('payments')
      .select('id, ride_id, amount, currency, status, provider, provider_payment_id')
      .eq('id', paymentId).maybeSingle();
    if (paymentError || !payment) return res.status(404).json({ error: 'Payment record not found.' });
    if (payment.provider !== 'razorpay' || payment.status !== 'paid' || !payment.provider_payment_id || payment.currency !== 'INR') return res.status(409).json({ error: 'Only a captured and reconciled Razorpay payment can be refunded.' });
    const { data: priorRefund } = await db.from('payment_refunds').select('id, amount, status, provider_refund_id')
      .eq('payment_id', payment.id).eq('idempotency_key', idempotencyKey).maybeSingle();
    if (priorRefund) {
      if (Number(priorRefund.amount) !== Math.round(amount * 100) / 100) return res.status(409).json({ error: 'Refund idempotency key was reused with a different amount.' });
      return res.status(200).json({ refund: priorRefund, message: 'Existing refund request returned; no second provider request was made.' });
    }
    const { data: priorAmounts, error: refundsError } = await db.from('payment_refunds').select('amount').eq('payment_id', payment.id).in('status', ['requested', 'processing', 'completed', 'requires_review']);
    if (refundsError) return res.status(500).json({ error: 'Could not validate the refundable balance.' });
    const reserved = (priorAmounts || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
    const refundAmount = Math.round(amount * 100) / 100;
    if (refundAmount > Number(payment.amount) - reserved) return res.status(409).json({ error: 'Refund amount exceeds the remaining refundable balance.' });
    const { data: refund, error: insertError } = await db.from('payment_refunds').insert({
      payment_id: payment.id, ride_id: payment.ride_id, provider: 'razorpay', idempotency_key: idempotencyKey,
      amount: refundAmount, currency: 'INR', reason, status: 'requested', requested_by: req.user.id,
    }).select('id, amount, status').single();
    if (insertError || !refund) return res.status(409).json({ error: 'Refund request could not be recorded. Refresh before retrying.' });
    await db.from('financial_audit_events').insert({ ride_id: payment.ride_id, payment_id: payment.id, refund_id: refund.id, event_type: 'refund_requested', amount: refundAmount, currency: 'INR', actor_user_id: req.user.id, details: { reason } });
    try {
      const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY}:${RAZORPAY_SECRET}`).toString('base64');
      const providerRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(payment.provider_payment_id)}/refund`, {
        method: 'POST', headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(refundAmount * 100), notes: { ride_id: payment.ride_id, refund_request_id: refund.id, reason } }),
        signal: AbortSignal.timeout(15000),
      });
      const providerRefund: any = await providerRes.json();
      if (!providerRes.ok || !providerRefund?.id) {
        await db.from('payment_refunds').update({ status: 'requires_review', failure_reason: 'Provider response requires reconciliation.', updated_at: new Date().toISOString() }).eq('id', refund.id).eq('status', 'requested');
        return res.status(502).json({ error: 'Refund request could not be confirmed by the provider. It is held for reconciliation; do not submit another refund.' });
      }
      const complete = providerRefund.status === 'processed';
      const { data: updatedRefund, error: updateError } = await db.from('payment_refunds').update({
        provider_refund_id: providerRefund.id, status: complete ? 'completed' : 'processing',
        provider_updated_at: new Date().toISOString(), completed_at: complete ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
      }).eq('id', refund.id).select('id, amount, status, provider_refund_id').single();
      if (updateError || !updatedRefund) return res.status(500).json({ error: 'Provider refund exists but local state needs reconciliation.' });
      if (complete) {
        const { data: allCompleted } = await db.from('payment_refunds').select('amount').eq('payment_id', payment.id).eq('status', 'completed');
        const total = (allCompleted || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
        await db.from('payments').update({ refund_amount: total, status: total >= Number(payment.amount) ? 'refunded' : 'paid', updated_at: new Date().toISOString() }).eq('id', payment.id);
        if (total >= Number(payment.amount)) await db.from('rides').update({ payment_status: 'refunded', refund_status: 'completed' }).eq('id', payment.ride_id);
        await db.from('financial_audit_events').insert({ ride_id: payment.ride_id, payment_id: payment.id, refund_id: refund.id, event_type: 'refund_updated', provider_reference: providerRefund.id, amount: refundAmount, currency: 'INR', actor_user_id: req.user.id, details: { status: complete ? 'completed' : 'processing' } });
      }
      return res.status(202).json({ refund: updatedRefund, message: complete ? 'Provider confirmed refund completion.' : 'Refund is processing; completion will be confirmed by provider reconciliation.' });
    } catch {
      await db.from('payment_refunds').update({ status: 'requires_review', failure_reason: 'Provider request outcome is unknown; reconciliation required.', updated_at: new Date().toISOString() }).eq('id', refund.id).eq('status', 'requested');
      return res.status(202).json({ refund: { id: refund.id, status: 'requires_review' }, message: 'Provider outcome is unknown. Do not retry; reconcile the provider refund first.' });
    }
  } catch {
    return res.status(500).json({ error: 'Refund processing failed. Check the audit record before retrying.' });
  }
});



/**
 * Complete a ride through the backend.
 * Only the approved driver assigned to an in-progress ride may complete it.
 */
app.post(
  '/api/rides/:rideId/complete',
  rateLimit(10, 60000),
  auth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({
          success: false,
          error: 'Supabase database is not configured.',
        });
      }

      const rideId = String(req.params.rideId || '');

      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rideId)
      ) {
        return res.status(400).json({
          success: false,
          error: 'A valid ride ID is required.',
        });
      }

      // Verify the signed-in user's driver profile.
      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('id, role')
        .eq('user_id', req.user.id)
        .maybeSingle();

      if (profileError) {
        return res.status(500).json({
          success: false,
          error: 'Could not verify the driver account.',
        });
      }

      if (!profile || profile.role !== 'driver') {
        return res.status(403).json({
          success: false,
          error: 'Driver access is required to complete a ride.',
        });
      }

      const { data: driver, error: driverError } = await db
        .from('drivers')
        .select('id, approval_status')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (driverError) {
        return res.status(500).json({
          success: false,
          error: 'Could not verify driver approval.',
        });
      }

      if (!driver || driver.approval_status !== 'approved') {
        return res.status(403).json({
          success: false,
          error: 'An approved driver account is required.',
        });
      }

      // The ride must belong to this driver.
      const { data: ride, error: rideError } = await db
        .from('rides')
        .select('id, driver_id, status')
        .eq('id', rideId)
        .eq('driver_id', driver.id)
        .maybeSingle();

      if (rideError) {
        return res.status(500).json({
          success: false,
          error: 'Could not verify the assigned ride.',
        });
      }

      if (!ride) {
        return res.status(404).json({
          success: false,
          error: 'Ride not found or not assigned to this driver.',
        });
      }

      // A retry after a successful completion is safe.
      if (ride.status === 'completed') {
        return res.json({
          success: true,
          status: 'completed',
          message: 'This ride is already completed.',
        });
      }

      if (ride.status !== 'in_progress') {
        return res.status(409).json({
          success: false,
          error: 'Only an in-progress ride can be completed.',
        });
      }

      // Conditional update prevents completion from overwriting a
      // concurrent status change.
      const { data: completedRide, error: updateError } = await db
        .from('rides')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', rideId)
        .eq('driver_id', driver.id)
        .eq('status', 'in_progress')
        .select('id')
        .maybeSingle();

      if (updateError) {
        return res.status(500).json({
          success: false,
          error: 'Ride completion could not be saved.',
        });
      }

      if (!completedRide) {
        return res.status(409).json({
          success: false,
          error: 'Ride status changed. Refresh the trip and try again.',
        });
      }

      return res.json({
        success: true,
        status: 'completed',
      });
    } catch (error) {
      console.error('Ride completion failed.');
      return res.status(500).json({
        success: false,
        error: 'An unexpected error occurred while completing the ride.',
      });
    }
  }
);

// ==========================================
// 5. GPS: Driver Geolocation Update
// ==========================================
app.post(
  '/api/location/update',
  rateLimit(60, 60000),
  auth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ error: 'Supabase database is not configured.' });
      }

      const { rideId, lat, lng, accuracy, heading, speed, capturedAt } = req.body || {};

      if (
        !rideId ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < 6.0 ||
        lat > 37.5 ||
        lng < 68.0 ||
        lng > 97.5 ||
        (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100) ||
        (heading !== null && heading !== undefined && (!Number.isFinite(heading) || heading < 0 || heading >= 360)) ||
        (speed !== null && speed !== undefined && (!Number.isFinite(speed) || speed < 0 || speed > 100)) ||
        (!Number.isFinite(capturedAt) || Math.abs(Date.now() - capturedAt) > 60000)
      ) {
        return res.status(400).json({
          error: 'Valid GPS coordinates within India geographical boundary and rideId required.',
        });
      }

      // Authorize driver
      const { data: profile } = await db
        .from('profiles')
        .select('id, role')
        .eq('user_id', req.user.id)
        .maybeSingle();

      if (!profile || profile.role !== 'driver') {
        return res.status(403).json({ error: 'Access denied. Driver role required.' });
      }

      const { data: driver } = await db
        .from('drivers')
        .select('id, approval_status')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (!driver || driver.approval_status !== 'approved') {
        return res.status(403).json({ error: 'An approved driver account is required to publish GPS.' });
      }

      // Verify active ride assignment
      const { data: ride } = await db
        .from('rides')
        .select('id, status')
        .eq('id', rideId)
        .eq('driver_id', driver.id)
        .in('status', ['accepted', 'driver_arriving', 'in_progress'])
        .maybeSingle();

      if (!ride) {
        return res.status(403).json({ error: 'No active assigned ride found for this driver.' });
      }

      // Upsert into driver_locations
      const { error: locError } = await db.from('driver_locations').upsert(
        {
          ride_id: rideId,
          driver_id: driver.id,
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          accuracy_m: accuracy ? Number(accuracy.toFixed(2)) : null,
          heading: heading ? Number(heading.toFixed(2)) : null,
          speed_mps: speed !== null && speed !== undefined ? Number(speed.toFixed(2)) : null,
          recorded_at: new Date(capturedAt).toISOString(),
        },
        { onConflict: 'ride_id' }
      );

      if (locError) {
        return res.status(500).json({ error: 'Could not record GPS location.' });
      }

      // Trip location is stored only in driver_locations; do not duplicate private GPS into the driver directory.

      res.json({ ok: true, timestamp: new Date().toISOString() });
    } catch (err: any) {
      console.error('Location update error:', err);
      res.status(500).json({ error: 'Location update failed: ' + (err?.message || 'internal error') });
    }
  }
);

// ==========================================
// 6. GPS: Read Driver Location for Ride
// ==========================================
app.get(
  '/api/location/ride/:rideId',
  rateLimit(60, 60000),
  auth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ error: 'Supabase database is not configured.' });
      }

      const rideId = String(req.params.rideId);

      const { data: profile } = await db
        .from('profiles')
        .select('id, role')
        .eq('user_id', req.user.id)
        .maybeSingle();

      if (!profile) {
        return res.status(401).json({ error: 'Account profile not found.' });
      }

      const { data: ride } = await db
        .from('rides')
        .select('id, rider_id, driver_id, status')
        .eq('id', rideId)
        .maybeSingle();

      if (!ride) {
        return res.status(404).json({ error: 'Ride not found.' });
      }

      // Check authorization: must be the rider, the assigned driver, or admin
      const { data: driver } = await db
        .from('drivers')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      const isRider = ride.rider_id === profile.id;
      const isDriver = driver && ride.driver_id === driver.id;
      const isAdmin = profile.role === 'admin';

      if (!isRider && !isDriver && !isAdmin) {
        return res.status(403).json({ error: 'Access denied. You are not a participant in this ride.' });
      }
      if (!['accepted', 'driver_arriving', 'in_progress'].includes(ride.status)) {
        return res.json({ rideId, status: ride.status, trackingAvailable: false, locationStale: true, locationAgeSeconds: null, location: null });
      }

      const { data: locationData, error: locError } = await db
        .from('driver_locations')
        .select('lat, lng, accuracy_m, heading, speed_mps, recorded_at')
        .eq('ride_id', rideId)
        .maybeSingle();

      if (locError) {
        return res.status(500).json({ error: 'Could not retrieve driver location.' });
      }

      const locationAgeMs = locationData?.recorded_at ? Date.now() - new Date(locationData.recorded_at).getTime() : null;
      const locationIsStale = locationAgeMs === null || locationAgeMs > 60000 || locationAgeMs < -30000;
      res.json({
        rideId,
        status: ride.status,
        trackingAvailable: true,
        locationStale: locationIsStale,
        locationAgeSeconds: locationAgeMs === null ? null : Math.max(0, Math.round(locationAgeMs / 1000)),
        location: locationData
          ? {
            lat: Number(locationData.lat),
            lng: Number(locationData.lng),
            accuracy: locationData.accuracy_m,
            heading: locationData.heading,
            speed: locationData.speed_mps,
            recordedAt: locationData.recorded_at,
          }
          : null,
      });
    } catch (err: any) {
      console.error('Location read error:', err);
      res.status(500).json({ error: 'Failed to read location. Please retry.' });
    }
  }
);

// ==========================================
// 7. Admin: Live Aggregated Reports
// ==========================================
app.get(
  '/api/admin/reports',
  rateLimit(30, 60000),
  auth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!db) return res.status(503).json({ error: 'Supabase database not configured.' });

      const { data: profile } = await db
        .from('profiles')
        .select('role')
        .eq('user_id', req.user.id)
        .maybeSingle();

      if (!profile || profile.role !== 'admin') {
        return res.status(403).json({ error: 'Admin privileges required.' });
      }

      const { data: rides, error } = await db
        .from('rides')
        .select('vehicle_category, total_fare, status, payment_status, pickup_address, destination_address, created_at');

      if (error) {
        return res.status(500).json({ error: 'Could not fetch rides data.' });
      }

      const categories = ['economy', 'sedan', 'suv', 'airport_transfer', 'xl'];
      const categoryStats = categories.map((cat) => {
        const matching = (rides || []).filter((r) => r.vehicle_category === cat);
        const revenue = matching
          .filter((r) => r.status === 'completed' && r.payment_status === 'paid')
          .reduce((sum, r) => sum + Number(r.total_fare || 0), 0);
        return {
          category: cat === 'airport_transfer' ? 'Airport Transfer' : cat.charAt(0).toUpperCase() + cat.slice(1),
          rides: matching.length,
          revenue: Math.round(revenue),
        };
      });

      const totalRidesCount = categoryStats.reduce((sum, c) => sum + c.rides, 0);
      const categoryStatsWithShare = categoryStats.map((c) => ({
        ...c,
        sharePct: totalRidesCount > 0 ? Math.round((c.rides / totalRidesCount) * 100) : 0,
      }));

      res.json({
        totalRides: totalRidesCount,
        categoryStats: categoryStatsWithShare,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Reports generation failed: ' + (err?.message || 'unknown') });
    }
  }
);

// ==========================================
// 8. Admin: Real Passenger Accounts
// ==========================================
app.get(
  '/api/admin/riders',
  rateLimit(30, 60000),
  auth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!db) return res.status(503).json({ error: 'Supabase database not configured.' });

      const { data: profile } = await db
        .from('profiles')
        .select('role')
        .eq('user_id', req.user.id)
        .maybeSingle();

      if (!profile || profile.role !== 'admin') {
        return res.status(403).json({ error: 'Admin privileges required.' });
      }

      const { data: riders, error } = await db
        .from('profiles')
        .select('id, user_id, full_name, email, phone, rating, total_trips, created_at')
        .eq('role', 'rider')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: 'Could not fetch rider accounts.' });
      }

      res.json({ riders: riders || [] });
    } catch (err: any) {
      res.status(500).json({ error: 'Riders fetch failed: ' + (err?.message || 'unknown') });
    }
  }
);

// ==========================================
// 9. Full-Stack Dev Server & Production Mount
// ==========================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const PORT = Number(process.env.PORT || 4000);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RideBlue full-stack server running on http://0.0.0.0:${PORT} [${isProduction ? 'prod' : 'dev'}]`);
  });
}

void startServer();
