// Lightweight, privacy-respecting event hook. Forwards custom events to Vercel
// Web Analytics (cookieless, no PII). Page views / traffic are captured
// automatically by <Analytics /> in the root layout — enable Web Analytics in
// the Vercel dashboard (Project → Analytics) for data to start flowing.
// Usage: track("profile_edit", { field: "age" })

import { track as vercelTrack } from "@vercel/analytics";

type Props = Record<string, string | number | boolean | null | undefined>;

export function track(event: string, props: Props = {}): void {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV === "production") {
    // Vercel custom events only accept string/number/boolean values.
    const clean: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(props)) {
      if (v !== null && v !== undefined) clean[k] = v;
    }
    vercelTrack(event, clean);
  } else {
    console.debug("[track]", event, props);
  }
}
