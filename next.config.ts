import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Baseline security headers applied to every response. Deliberately does NOT
  // include a Content-Security-Policy — a strict CSP needs careful testing
  // against Google Fonts, Supabase, and inline styles from motion, so that's
  // left as a follow-up rather than risking a broken production render.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Stop the page being framed by other sites (clickjacking).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Don't let browsers MIME-sniff responses into a different type.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Send only the origin (not full path) on cross-origin navigations.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // No page here needs these device APIs; deny by default.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
