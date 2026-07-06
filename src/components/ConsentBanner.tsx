"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConsent, setConsent, type ConsentChoice, OPEN_CONSENT } from "@/lib/consent";

// First-visit consent for optional analytics. Essential storage (profile,
// preferences, sign-in) is always on and isn't gated. Re-openable anytime via
// the "Privacy choices" footer link.
export function ConsentBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Start hidden on the server, then reveal on the client if no choice yet —
    // avoids a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(getConsent() === null);
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_CONSENT, onOpen);
    return () => window.removeEventListener(OPEN_CONSENT, onOpen);
  }, []);

  if (!open) return null;

  const choose = (c: ConsentChoice) => {
    setConsent(c);
    setOpen(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-3">
      <div className="mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-border bg-bg-elev/95 p-4 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center">
        <p className="flex-1 text-xs leading-relaxed text-fg-muted">
          We use essential browser storage to save your profile and keep you
          signed in. With your OK, we also use privacy-friendly, cookieless
          analytics to understand how the app is used.{" "}
          <Link href="/privacy" className="text-accent underline">
            Learn more
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => choose("declined")}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-medium transition hover:border-accent sm:flex-none"
          >
            Essential only
          </button>
          <button
            onClick={() => choose("accepted")}
            className="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 sm:flex-none"
          >
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  );
}
