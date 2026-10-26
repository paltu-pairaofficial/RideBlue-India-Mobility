import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getAdminSupabase } from '../config/supabase.js';
import { canAdminTransitionBooking } from '../domain/rideLifecycle.js';

const router = Router();
router.use(requireAuth, allowRoles('admin'));

function adminDb() {
  return getAdminSupabase();
}

router.get('/overview', async (_req, res, next) => {
  try {
    const db = adminDb();
    const [riders, bookings, pending, requested] = await Promise.all([
      db.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'rider'),
      db.from('bookings').select('*', { count: 'exact', head: true }),
      db.from('driver_profiles').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      db.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'requested'),
    ]);
    for (const result of [riders, bookings, pending, requested]) if (result.error) throw result.error;
    res.json({ overview: { riders: riders.count || 0, totalBookings: bookings.count || 0, pendingDrivers: pending.count || 0, requestedBookings: requested.count || 0 } });
  } catch (error) { next(error); }
});

router.get('/bookings', async (req, res, next) => {
  try {
    const db = adminDb();
    const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
    const { data, error } = await db.from('bookings').select('*').order('created_at', { ascending: false }).range((page - 1) * 25, page * 25 - 1);
    if (error) throw error;
    res.json({ bookings: data || [], page, pageSize: 25 });
  } catch (error) { next(error); }
});

router.patch('/bookings/:id/status', validate(z.object({
  status: z.enum(['rejected', 'cancelled']),
})), async (req, res, next) => {
  try {
    const db = adminDb();
    const { data: old, error: oldError } = await db.from('bookings').select('id,status').eq('id', req.params.id).maybeSingle();
    if (oldError) throw oldError;
    if (!old) return res.status(404).json({ message: 'Booking not found.' });
    if (!canAdminTransitionBooking(old.status, req.body.status)) {
      return res.status(409).json({ message: `Transition from ${old.status} to ${req.body.status} is not allowed.` });
    }
    const { data, error } = await db.from('bookings')
      .update({ status: req.body.status })
      .eq('id', req.params.id)
      .eq('status', old.status)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(409).json({ message: 'Booking status changed concurrently. Refresh and try again.' });
    res.json({ booking: data });
  } catch (error) { next(error); }
});

router.get('/drivers/pending', async (_req, res, next) => {
  try {
    const { data, error } = await adminDb().from('driver_profiles').select('*').eq('verification_status', 'pending').order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ profiles: data || [] });
  } catch (error) { next(error); }
});

router.patch('/drivers/:id/review', validate(z.object({
  decision: z.enum(['approved', 'rejected']),
  reviewNote: z.string().trim().max(500).optional(),
})), async (req, res, next) => {
  try {
    const { data, error } = await adminDb().from('driver_profiles')
      .update({ verification_status: req.body.decision, review_note: req.body.reviewNote || '', available: false })
      .eq('id', req.params.id)
      .eq('verification_status', 'pending')
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Pending driver profile not found.' });
    res.json({ profile: data });
  } catch (error) { next(error); }
});


router.get('/support/tickets', async (req, res, next) => {
  try {
    const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
    const db = adminDb();
    const { data, error } = await db.from('support_tickets').select('*')
      .order('created_at', { ascending: false }).range((page - 1) * 25, page * 25 - 1);
    if (error) throw error;
    res.json({ tickets: data || [], page, pageSize: 25 });
  } catch (error) { next(error); }
});

router.patch('/support/tickets/:id/status', validate(z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
})), async (req, res, next) => {
  try {
    const db = adminDb();
    const { data, error } = await db.from('support_tickets')
      .update({ status: req.body.status, assigned_admin: req.user.id })
      .eq('id', req.params.id)
      .select().maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Support ticket not found.' });
    res.json({ ticket: data });
  } catch (error) { next(error); }
});

router.get('/riders', async (req, res, next) => {
  try {
    const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
    const db = adminDb();
    const { data, error } = await db.from('profiles').select('id,full_name,email,phone,status,created_at')
      .eq('role', 'rider').order('created_at', { ascending: false }).range((page - 1) * 25, page * 25 - 1);
    if (error) throw error;
    res.json({ riders: data || [], page, pageSize: 25 });
  } catch (error) { next(error); }
});

export default router;
