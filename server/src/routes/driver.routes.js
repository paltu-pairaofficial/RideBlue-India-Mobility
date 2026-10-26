import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getAdminSupabase } from '../config/supabase.js';
import { canDriverAcceptBooking, canDriverTransitionBooking } from '../domain/rideLifecycle.js';

const router = Router();
const onboardingSchema = z.object({
  phone: z.string().trim().min(8).max(20),
  licenceNumber: z.string().trim().min(4).max(60),
  vehicleCategory: z.enum(['economy', 'sedan', 'suv', 'xl', 'airport_transfer']),
  vehicleMakeModel: z.string().trim().min(2).max(100),
  registrationNumber: z.string().trim().min(4).max(30),
});
router.use(requireAuth, allowRoles('driver'));

router.post('/onboarding', validate(onboardingSchema), async (req, res, next) => {
  try {
    const payload = {
      user_id: req.user.id,
      phone: req.body.phone,
      licence_number: req.body.licenceNumber,
      vehicle_category: req.body.vehicleCategory,
      vehicle_make_model: req.body.vehicleMakeModel,
      registration_number: req.body.registrationNumber,
      verification_status: 'pending',
      available: false,
    };
    const { data, error } = await req.supabase.from('driver_profiles').upsert(payload, { onConflict: 'user_id' }).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'Driver details submitted for review.', profile: data });
  } catch (error) { next(error); }
});

router.get('/me', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('driver_profiles').select('*').eq('user_id', req.user.id).maybeSingle();
    if (error) throw error;
    res.json({ profile: data });
  } catch (error) { next(error); }
});

router.patch('/availability', validate(z.object({ available: z.boolean() })), async (req, res, next) => {
  try {
    // The normal user-scoped RLS update intentionally prevents changing approval
    // fields. This privileged write is narrow and is allowed only after checking
    // the authenticated driver's role and authoritative approval status.
    const db = getAdminSupabase();
    const { data: profile, error: fetchError } = await db.from('driver_profiles')
      .select('id,user_id,verification_status,available')
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!profile) return res.status(404).json({ message: 'Complete onboarding first.' });
    if (profile.verification_status !== 'approved') return res.status(403).json({ message: 'Your driver profile must be approved before changing availability.' });
    const { data, error } = await db.from('driver_profiles')
      .update({ available: req.body.available })
      .eq('user_id', req.user.id)
      .eq('verification_status', 'approved')
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(409).json({ message: 'Driver availability changed. Refresh and try again.' });
    res.json({ profile: data });
  } catch (error) { next(error); }
});

router.get('/requests', async (req, res, next) => {
  try {
    const db = getAdminSupabase();
    const { data: profile, error: profileError } = await db.from('driver_profiles')
      .select('verification_status,available').eq('user_id', req.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile || profile.verification_status !== 'approved' || !profile.available) {
      return res.status(403).json({ message: 'Only approved drivers who are online can view incoming requests.' });
    }
    const { data, error } = await db.from('bookings')
      .select('id,pickup,destination,vehicle_category,requested_at,indicative_fare,created_at,status')
      .eq('status', 'requested').is('driver_id', null).order('created_at', { ascending: true }).limit(25);
    if (error) throw error;
    res.json({ requests: data || [], note: 'Prototype dispatch: requests are not geographically matched.' });
  } catch (error) { next(error); }
});

router.post('/requests/:id/accept', async (req, res, next) => {
  try {
    const db = getAdminSupabase();
    const { data: profile, error: profileError } = await db.from('driver_profiles')
      .select('verification_status,available').eq('user_id', req.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile || !canDriverAcceptBooking({ status: 'requested', driverId: null, approved: profile.verification_status === 'approved', available: profile.available })) {
      return res.status(403).json({ message: 'You must be an approved, online driver to accept a ride.' });
    }
    // Conditional update ensures two drivers cannot both claim the same request.
    const { data, error } = await db.from('bookings')
      .update({ driver_id: req.user.id, status: 'driver_assigned' })
      .eq('id', req.params.id).eq('status', 'requested').is('driver_id', null)
      .select().maybeSingle();
    if (error) throw error;
    if (!data) return res.status(409).json({ message: 'This ride is no longer available. Refresh your requests.' });
    res.json({ message: 'Ride assigned to you.', booking: data });
  } catch (error) { next(error); }
});

router.get('/trips/my', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('bookings').select('*')
      .eq('driver_id', req.user.id).order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    res.json({ trips: data || [] });
  } catch (error) { next(error); }
});

router.patch('/trips/:id/status', validate(z.object({
  status: z.enum(['in_progress', 'completed']),
})), async (req, res, next) => {
  try {
    const db = getAdminSupabase();
    const { data: old, error: oldError } = await db.from('bookings')
      .select('id,status,driver_id').eq('id', req.params.id).eq('driver_id', req.user.id).maybeSingle();
    if (oldError) throw oldError;
    if (!old) return res.status(404).json({ message: 'Assigned trip not found.' });
    if (!canDriverTransitionBooking(old.status, req.body.status)) {
      return res.status(409).json({ message: `Trip cannot transition from ${old.status} to ${req.body.status}.` });
    }
    const { data, error } = await db.from('bookings').update({ status: req.body.status })
      .eq('id', req.params.id).eq('driver_id', req.user.id).eq('status', old.status).select().maybeSingle();
    if (error) throw error;
    if (!data) return res.status(409).json({ message: 'Trip status changed concurrently. Refresh and try again.' });
    res.json({ booking: data });
  } catch (error) { next(error); }
});

export default router;
