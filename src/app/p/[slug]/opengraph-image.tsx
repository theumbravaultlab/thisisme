import { ImageResponse } from "next/og";
import { fetchPublicProfile } from "@/lib/supabaseServer";

export const alt = "A profile on thisisme";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Per-profile social-share card. Runs on the Node runtime so it can reach
// Supabase; kept to name + accent for reliable rendering.
export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await fetchPublicProfile(slug);
  const name = profile?.data.name || "thisisme";
  const accent = profile?.data.favoriteColor || "#7c5cff";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(900px circle at 50% 0%, ${accent}55, #0b0d13 62%)`,
          color: "#eef1f8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 34, color: "#9aa3b4", marginBottom: 12 }}>
          this is
        </div>
        <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>{name}</div>
        <div style={{ marginTop: 22, fontSize: 26, color: "#9aa3b4" }}>
          view their profile on thisisme
        </div>
      </div>
    ),
    { ...size }
  );
}
