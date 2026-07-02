import { createClient } from "@supabase/supabase-js";
import type { Profile } from "./types";

// Anonymous, session-less client for reading public data in Server Components
// / route handlers. Only the public_profiles table is readable this way (RLS).
function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function fetchPublicProfile(slug: string): Promise<Profile | null> {
  const supabase = serverClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("public_profiles")
    .select("payload")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return data.payload as Profile;
}
