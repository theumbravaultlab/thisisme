"use client";

import { AnimatePresence, motion } from "motion/react";

// First-run guidance. Shown once (dismissal persisted by the caller).
export function Welcome({
  open,
  onStart,
  onSkip,
}: {
  open: boolean;
  onStart: () => void;
  onSkip: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onSkip}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Welcome"
            className="fixed left-1/2 top-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-bg-elev p-6 text-center shadow-2xl"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
          >
            <div className="text-5xl">👋</div>
            <h2 className="mt-3 text-2xl font-semibold">Welcome to thisisme</h2>
            <p className="mt-1 text-sm text-fg-muted">
              What you&apos;re seeing is a demo. Start with a blank profile and
              make it yours — it takes about a minute.
            </p>

            <ol className="mx-auto mt-5 flex max-w-xs flex-col gap-3 text-left text-sm">
              {[
                ["✍️", "Add your name & pick a font"],
                ["🎨", "Choose your favorite color & photo"],
                ["✨", "Toggle on the stats that are you"],
              ].map(([icon, text], i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15">
                    {icon}
                  </span>
                  {text}
                </li>
              ))}
            </ol>

            <button
              onClick={onStart}
              className="mt-6 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Start fresh
            </button>
            <button
              onClick={onSkip}
              className="mt-2 w-full py-1 text-xs text-fg-muted transition hover:text-fg"
            >
              Explore the demo first
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
