import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSupabase } from '../config/supabase.js';
const router = Router();

// Signup/login are performed by Supabase Auth from the browser using the anon key.
// These routes expose the verified application profile only.
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role } });
});
router.get('/health', (_req,res)=>res.json({ authProvider: 'Supabase Auth' }));
export default router;
