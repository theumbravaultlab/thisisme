import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "thisisme — a profile that shows the real you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded social-share card for the site root. (Per-profile OG cards live in
// src/app/p/[slug]/opengraph-image.tsx.)
export default function OgImage() {
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
          background:
            "radial-gradient(900px circle at 50% 0%, #2a1d5e, #0b0d13 60%)",
          color: "#eef1f8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 92, fontWeight: 800, letterSpacing: -2 }}>
          <span>this</span>
          <span style={{ color: "#9a7bff" }}>is</span>
          <span>me</span>
        </div>
        <div style={{ marginTop: 16, fontSize: 34, color: "#9aa3b4" }}>
          A profile that shows the real you, your way.
        </div>
      </div>
    ),
    { ...size }
  );
}
