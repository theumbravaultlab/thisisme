import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

// On-demand cache busting for a public profile page. Called after the owner
// saves so their edits appear immediately, rather than waiting for the ISR
// window. The caller must be signed in AND own the handle being revalidated.

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return NextResponse.json({ error: "sign-in-required" }, { status: 401 });

  const supabase = createClient(url, anon, { auth: { persistSession: false } });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "sign-in-required" }, { status: 401 });

  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  const handle = slug?.toLowerCase();
  if (!handle) return NextResponse.json({ error: "no slug" }, { status: 400 });

  // Only let a user revalidate their own handle's page.
  const { data: reg } = await supabase
    .from("usernames")
    .select("user_id")
    .eq("username", handle)
    .maybeSingle();
  if (!reg || reg.user_id !== user.id) {
    return NextResponse.json({ error: "not your handle" }, { status: 403 });
  }

  // Bust the cached page + its data so the edit shows immediately.
  revalidatePath(`/p/${handle}`);
  return NextResponse.json({ ok: true });
}
