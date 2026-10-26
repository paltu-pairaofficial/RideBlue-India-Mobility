import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
const router=Router();
router.use(requireAuth);
router.post('/',validate(z.object({category:z.enum(['booking','account','driver','payment','other']).default('other'),subject:z.string().trim().min(3).max(120),description:z.string().trim().min(10).max(3000)})),async(req,res,next)=>{try{const {data,error}=await req.supabase.from('support_tickets').insert({owner_id:req.user.id,...req.body,status:'open'}).select().single();if(error)throw error;res.status(201).json({message:'Support request submitted.',ticket:data});}catch(e){next(e);}});
router.get('/my',async(req,res,next)=>{try{const {data,error}=await req.supabase.from('support_tickets').select('*').eq('owner_id',req.user.id).order('created_at',{ascending:false}).limit(100);if(error)throw error;res.json({tickets:data||[]});}catch(e){next(e);}});
export default router;
