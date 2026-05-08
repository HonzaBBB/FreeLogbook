import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function decodeJwtPayload(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

const jwtPayload = decodeJwtPayload(supabaseAnonKey);
const isServiceRoleKey = jwtPayload?.role === 'service_role';

if (isServiceRoleKey) {
  console.error('Unsafe Supabase key detected: service_role must never be used in VITE_SUPABASE_ANON_KEY.');
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && !isServiceRoleKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
