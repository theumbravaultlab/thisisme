import type { Profile } from "./types";

// Public reads for Server Components / route handlers. These use Next's native
// fetch data cache (revalidate + a per-handle tag) rather than the supabase-js
// client, so the public page can be ISR-cached instead of re-querying on every
// view. The owner's save busts the tag/path on demand via /api/revalidate; the
// revalidate window below is a safety net. Both tables allow anon read (RLS).
const CACHE_SECONDS = 300;

// Resolve a public handle (/p/<handle>) to its published, public-safe profile.
export async function fetchPublicProfile(handle: string): Promise<Profile | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const username = handle.toLowerCase();
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const next = { revalidate: CACHE_SECONDS, tags: [`public-profile:${username}`] };

  // 1) handle → user_id
  const uRes = await fetch(
    `${url}/rest/v1/usernames?select=user_id&username=eq.${encodeURIComponent(username)}`,
    { headers, next }
  );
  if (!uRes.ok) return null;
  const users = (await uRes.json()) as { user_id: string }[];
  const userId = users?.[0]?.user_id;
  if (!userId) return null;

  // 2) user_id → published public payload
  const pRes = await fetch(
    `${url}/rest/v1/public_profiles?select=payload&user_id=eq.${encodeURIComponent(userId)}`,
    { headers, next }
  );
  if (!pRes.ok) return null;
  const rows = (await pRes.json()) as { payload: Profile }[];
  return rows?.[0]?.payload ?? null;
}
