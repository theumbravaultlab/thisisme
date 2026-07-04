import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

// Refresh hourly so newly-published profiles enter the index without a redeploy.
export const revalidate = 3600;

// Lists the marketing pages plus every published public profile — this is the
// SEO flywheel: more users → more indexable pages → more discovery.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/avatar`, changeFrequency: "monthly", priority: 0.6 },
  ];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return staticPages;

  try {
    const sb = createClient(url, anon, { auth: { persistSession: false } });
    // Only actually-published profiles have a public_profiles row.
    const { data: pubs } = await sb.from("public_profiles").select("user_id");
    const ids = (pubs ?? []).map((p) => p.user_id);
    if (ids.length === 0) return staticPages;

    const { data: handles } = await sb
      .from("usernames")
      .select("username, user_id")
      .in("user_id", ids);

    const profilePages: MetadataRoute.Sitemap = (handles ?? []).map((h) => ({
      url: `${base}/p/${h.username}`,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [...staticPages, ...profilePages];
  } catch {
    return staticPages;
  }
}
