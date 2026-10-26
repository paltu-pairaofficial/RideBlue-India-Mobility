import { getSupabase } from '../config/supabase.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Sign in to continue.' });
    const supabase = getSupabase(token);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return res.status(401).json({ message: 'Your session is invalid or expired. Please sign in again.' });
    const { data: profile, error: profileError } = await supabase.from('profiles')
      .select('id,full_name,email,role,phone,status').eq('id', authData.user.id).single();
    if (profileError || !profile || profile.status !== 'active') return res.status(401).json({ message: 'Account profile is unavailable.' });
    req.user = { id: authData.user.id, email: authData.user.email, name: profile.full_name, role: profile.role, status: profile.status };
    req.supabase = supabase;
    next();
  } catch (e) {
    next(e);
  }
}
export function allowRoles(...roles) {
  return (req, res, next) => roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ message: 'You do not have permission to perform this action.' });
}
