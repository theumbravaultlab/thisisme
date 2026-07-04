import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY Supabase client using the service_role key. It bypasses RLS, so
// it is the only thing allowed to write the `entitlements` table (grant/revoke
// premium). NEVER import this into client code, and never expose
// SUPABASE_SERVICE_ROLE_KEY with a NEXT_PUBLIC_ prefix.

let admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!admin) {
    admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}
