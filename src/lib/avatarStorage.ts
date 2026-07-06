import type { SupabaseClient } from "@supabase/supabase-js";

// Avatar images live in the "avatars" Storage bucket (public read, owner write).
// The profile stores only the resulting public URL, keeping the profile row and
// localStorage tiny. Everything degrades to data URLs if Storage isn't set up,
// and display handles both data URLs and https URLs, so this is fully additive.

const BUCKET = "avatars";

// A stored avatar is an http(s) URL; a not-yet-uploaded one is a data: URL.
export function isStorageUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

async function dataUrlToBlob(dataUrl: string): Promise<{ blob: Blob; ext: string; contentType: string }> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const contentType = blob.type || "image/jpeg";
  const ext = contentType.includes("png") ? "png" : "jpg";
  return { blob, ext, contentType };
}

// Upload a data-URL avatar for a signed-in user; returns the public URL, or
// null on any failure (caller then keeps the data URL — no regression).
export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  dataUrl: string
): Promise<string | null> {
  try {
    if (isStorageUrl(dataUrl)) return dataUrl; // already stored
    const { blob, ext, contentType } = await dataUrlToBlob(dataUrl);
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType,
      upsert: false,
      cacheControl: "31536000",
    });
    if (error) return null;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl ?? null;
  } catch {
    return null;
  }
}

// Best-effort delete of a stored avatar file by its public URL (no-op for data
// URLs or anything outside our bucket).
export async function deleteAvatarByUrl(supabase: SupabaseClient, url: string): Promise<void> {
  try {
    if (!isStorageUrl(url)) return;
    const marker = `/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = decodeURIComponent(url.slice(idx + marker.length));
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    /* ignore */
  }
}
