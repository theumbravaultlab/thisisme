import type { MetadataRoute } from "next";

// Public profiles are meant to be shared, so allow crawling — but keep the
// internal API surface out of search indexes.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
  };
}
