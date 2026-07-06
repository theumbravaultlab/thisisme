"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { analyticsAllowed, CONSENT_CHANGED } from "@/lib/consent";

// Loads Vercel Web Analytics ONLY after the user has opted in. Reacts live to
// consent changes (accept/decline) and to changes made in another tab.
export function AnalyticsGate() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(analyticsAllowed());
    sync();
    window.addEventListener(CONSENT_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CONSENT_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return allowed ? <Analytics /> : null;
}
