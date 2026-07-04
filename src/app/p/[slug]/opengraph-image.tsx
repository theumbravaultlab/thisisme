import { ImageResponse } from "next/og";
import { fetchPublicProfile } from "@/lib/supabaseServer";

export const runtime = "edge"; // WASM encoder — fast, and avoids the Node/libvips path
export const alt = "A profile on thisisme";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Per-profile social-share card. Renders the person's actual AI avatar on a
// branded backdrop so shared links stop the scroll — and carries an obvious
// "thisisme" mark (wordmark + a chip on the avatar) so every share advertises
// the site. Runs on the Node runtime so it can reach Supabase.
export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await fetchPublicProfile(slug);
  const name = profile?.data.name || "thisisme";
  const accent = profile?.data.favoriteColor || "#7c5cff";
  const avatar = profile?.data.photoDataUrl || null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(1000px circle at 50% 12%, ${accent}66, #0b0d13 62%)`,
          color: "#eef1f8",
          fontFamily: "sans-serif",
        }}
      >
        {/* brand wordmark */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 52,
            display: "flex",
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: -1,
          }}
        >
          <span>this</span>
          <span style={{ color: accent }}>is</span>
          <span>me</span>
        </div>

        {avatar ? (
          <div style={{ position: "relative", display: "flex", marginBottom: 6 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatar} width={370} height={370} style={{ objectFit: "contain" }} alt="" />
            {/* obvious brand chip sitting on the avatar */}
            <div
              style={{
                position: "absolute",
                bottom: 6,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(11,13,19,0.78)",
                  border: `2px solid ${accent}`,
                  borderRadius: 999,
                  padding: "6px 16px",
                  fontSize: 24,
                  fontWeight: 800,
                  letterSpacing: -0.5,
                }}
              >
                <span>this</span>
                <span style={{ color: accent }}>is</span>
                <span>me</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 34, color: "#9aa3b4", marginBottom: 12 }}>
            this is
          </div>
        )}

        <div style={{ display: "flex", fontSize: avatar ? 74 : 96, fontWeight: 800, letterSpacing: -2 }}>
          {name}
        </div>
        <div style={{ display: "flex", marginTop: 14, fontSize: 27, color: "#9aa3b4" }}>
          view their profile · make your own
        </div>
      </div>
    ),
    { ...size }
  );
}
