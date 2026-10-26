import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

export function getSupabase(accessToken) {
  if (!url || !anonKey) {
    throw Object.assign(
      new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.'),
      { status: 503 }
    );
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

/**
 * Privileged client. Use only after an authenticated user and their permissions
 * have been checked in Express. Never import this into the frontend.
 */
export function getAdminSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw Object.assign(
      new Error('This operation requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.'),
      { status: 503 }
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
