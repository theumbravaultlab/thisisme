import Link from "next/link";
import type { ReactNode } from "react";
import { LegalFooterLinks } from "./LegalFooterLinks";

export interface LegalSection {
  heading?: string;
  paras?: ReactNode[];
  list?: ReactNode[];
}

// Shared shell for the Privacy Policy and Terms pages. Content is passed as
// data (strings rendered through expressions) so the long prose stays readable
// and doesn't fight JSX entity-escaping.
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro?: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-bg/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            this<span className="text-accent">is</span>me
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:border-accent"
          >
            ← Back
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-fg-muted">Last updated: {updated}</p>

        <div className="mt-8 flex flex-col gap-5 text-sm leading-relaxed text-fg-muted [&_a]:text-accent [&_a]:underline [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-fg [&_li]:marker:text-fg-muted [&_strong]:font-semibold [&_strong]:text-fg [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5">
          {intro && <p>{intro}</p>}

          {sections.map((s, i) => (
            <section key={i} className="flex flex-col gap-2">
              {s.heading && <h2>{s.heading}</h2>}
              {s.paras?.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
              {s.list && (
                <ul>
                  {s.list.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-xs text-fg-muted">
        <LegalFooterLinks />
        <p className="mt-2">© {new Date().getFullYear()} thisisme</p>
      </footer>
    </>
  );
}
