import Link from "next/link";

export default function ShareStub() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <div className="text-6xl">🔗</div>
      <h1 className="text-3xl font-extrabold">Sharing — coming in Phase 3</h1>
      <p className="text-fg-muted">
        Here you&apos;ll get a public link like{" "}
        <code className="rounded bg-bg-elev px-1.5 py-0.5">thisis.me/@you</code>,
        choose exactly which cards each viewer can see, and optionally let
        friends contribute details. Links will preview beautifully when shared.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-accent px-5 py-2 font-semibold text-white transition hover:opacity-90"
      >
        ← Back to my profile
      </Link>
    </main>
  );
}
