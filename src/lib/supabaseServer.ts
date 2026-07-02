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

// Resolve a public handle (/p/<handle>) to its published, public-safe profile.
export async function fetchPublicProfile(handle: string): Promise<Profile | null> {
  const supabase = serverClient();
  if (!supabase) return null;

  const username = handle.toLowerCase();
  const { data: reg } = await supabase
    .from("usernames")
    .select("user_id")
    .eq("username", username)
    .maybeSingle();
  if (!reg) return null;

  const { data, error } = await supabase
    .from("public_profiles")
    .select("payload")
    .eq("user_id", reg.user_id)
    .maybeSingle();
  if (error || !data) return null;
  return data.payload as Profile;
}
