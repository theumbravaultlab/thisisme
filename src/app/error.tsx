"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <div className="text-5xl">🌀</div>
      <h1 className="text-2xl font-semibold">Something glitched</h1>
      <p className="max-w-sm text-sm text-fg-muted">
        Your profile is safe. This screen hit an unexpected error — try again.
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
