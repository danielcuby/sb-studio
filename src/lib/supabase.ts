import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && key);

let browserClient: SupabaseClient | null = null;

/**
 * Supabase client using the publishable key. Safe in the browser: the database's RLS rules
 * only let the public read busy times and create bookings through two checked functions.
 * Admins sign in with Supabase Auth to see and manage bookings.
 */
export function getSupabase() {
  if (!url || !key) return null;
  if (typeof window === "undefined") {
    // Server: a fresh client per request, no session storage.
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  browserClient ??= createClient(url, key);
  return browserClient;
}
