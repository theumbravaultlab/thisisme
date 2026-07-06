"use client";

import Link from "next/link";
import { openConsentSettings } from "@/lib/consent";

// Compliance links shown in every footer: the two legal pages plus a way to
// re-open the analytics consent chooser.
export function LegalFooterLinks() {
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
      <Link href="/privacy" className="transition hover:text-accent">
        Privacy
      </Link>
      <span aria-hidden>·</span>
      <Link href="/terms" className="transition hover:text-accent">
        Terms
      </Link>
      <span aria-hidden>·</span>
      <button onClick={openConsentSettings} className="transition hover:text-accent">
        Privacy choices
      </button>
    </span>
  );
}
