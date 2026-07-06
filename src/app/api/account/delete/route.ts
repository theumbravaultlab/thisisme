import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Permanently deletes the signed-in user's account and ALL their data.
//
// The buyer is authenticated from their Supabase access token, then the
// service-role admin client deletes the auth.users row. Every user table
// references auth.users(id) ON DELETE CASCADE — profiles, public_profiles,
// usernames, entitlements, avatar_usage, profile_snapshots — so this one call
// removes everything. This is the "right to erasure" endpoint.

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ error: "not configured" }, { status: 503 });

  // Authenticate the requester from their Supabase access token.
  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return NextResponse.json({ error: "sign-in-required" }, { status: 401 });

  const supabase = createClient(url, anon, { auth: { persistSession: false } });
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: "sign-in-required" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "not configured" }, { status: 503 });

  // Storage isn't FK-cascaded, so remove the user's avatar files first
  // (best-effort — never block account deletion on this).
  try {
    const { data: files } = await admin.storage.from("avatars").list(user.id);
    if (files && files.length > 0) {
      await admin.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));
    }
  } catch {
    /* ignore */
  }

  // Deleting the auth user cascades to every table keyed on auth.users(id).
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
