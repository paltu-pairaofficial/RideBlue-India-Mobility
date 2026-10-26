import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
const router = Router();
const createSchema = z.object({
  pickup: z.string().trim().min(2).max(180),
  destination: z.string().trim().min(2).max(180),
  vehicleCategory: z.enum(['economy','sedan','suv','xl','airport_transfer']),
  requestedAt: z.string().datetime().optional(),
  passengerCount: z.number().int().min(1).max(8).default(1)
});
router.use(requireAuth);
router.post('/', allowRoles('rider'), validate(createSchema), async (req,res,next) => {
  try {
    if (req.body.pickup.toLowerCase() === req.body.destination.toLowerCase()) return res.status(400).json({message:'Pickup and destination must be different.'});
    const { data, error } = await req.supabase.from('bookings').insert({
      rider_id:req.user.id, pickup:req.body.pickup, destination:req.body.destination,
      vehicle_category:req.body.vehicleCategory, requested_at:req.body.requestedAt || null,
      passenger_count:req.body.passengerCount, status:'requested'
    }).select().single();
    if (error) throw Object.assign(new Error(error.message), {status:400});
    res.status(201).json({message:'Booking request saved. No driver has been assigned yet.', booking:data});
  } catch(e){next(e);}
});
router.get('/my', allowRoles('rider'), async(req,res,next)=>{
  try {const {data,error}=await req.supabase.from('bookings').select('*').eq('rider_id',req.user.id).order('created_at',{ascending:false}).limit(100);if(error)throw error;res.json({bookings:data||[]});}catch(e){next(e);}
});
router.get('/:id', async(req,res,next)=>{
  try {const {data,error}=await req.supabase.from('bookings').select('*').eq('id',req.params.id).maybeSingle();if(error)throw error;if(!data)return res.status(404).json({message:'Booking not found.'});if(data.rider_id!==req.user.id&&data.driver_id!==req.user.id&&req.user.role!=='admin')return res.status(403).json({message:'You cannot view this booking.'});res.json({booking:data});}catch(e){next(e);}
});
router.patch('/:id/cancel',allowRoles('rider','admin'),async(req,res,next)=>{
  try {
    if (req.user.role === 'admin') {
      const { getAdminSupabase } = await import('../config/supabase.js');
      const db = getAdminSupabase();
      const { data, error } = await db.from('bookings').update({
        status: 'cancelled',
        cancellation_reason: typeof req.body.reason === 'string' ? req.body.reason.slice(0, 500) : '',
      }).eq('id', req.params.id).in('status', ['requested', 'accepted']).select().maybeSingle();
      if (error) throw error;
      if (!data) return res.status(409).json({ message: 'Booking was not found or can no longer be cancelled.' });
      return res.json({ message: 'Booking cancelled.', booking: data });
    }
    const { data, error } = await req.supabase.rpc('cancel_booking', {
      p_booking_id: req.params.id,
      p_reason: typeof req.body.reason === 'string' ? req.body.reason.slice(0, 500) : '',
    });
    if (error) throw error;
    if (!data) return res.status(409).json({ message: 'Booking was not found, does not belong to you, or can no longer be cancelled.' });
    res.json({ message: 'Booking cancelled.', booking: data });
  }catch(e){next(e);}
});
export default router;
