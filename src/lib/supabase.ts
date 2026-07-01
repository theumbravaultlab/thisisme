"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The app works with zero backend (localStorage) until these two public env
// vars are set in .env.local. When they are, cloud sync + auth switch on.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // completes the magic-link login on load
        flowType: "pkce",
      },
    });
  }
  return client;
}
