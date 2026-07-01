"use client";

import Link from "next/link";

interface Props {
  editing: boolean;
  setEditing: (v: boolean) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  cloudEnabled: boolean;
  userEmail: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

const btn =
  "inline-flex min-h-[38px] items-center rounded-lg border border-border px-3 py-1.5 text-sm transition hover:border-accent focus-visible:border-accent";

export function Header({
  editing,
  setEditing,
  theme,
  toggleTheme,
  cloudEnabled,
  userEmail,
  onSignIn,
  onSignOut,
}: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="text-lg font-extrabold tracking-tight">
          this<span className="text-accent">is</span>me
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title="Toggle light / dark"
            className={btn}
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </button>

          <Link href="/avatar" className={`hidden sm:inline-flex ${btn}`}>
            ✨ AI Avatar
          </Link>

          {cloudEnabled &&
            (userEmail ? (
              <button
                onClick={onSignOut}
                title={userEmail}
                aria-label={`Sign out (${userEmail})`}
                className={`hidden sm:inline-flex ${btn}`}
              >
                Sign out
              </button>
            ) : (
              <button onClick={onSignIn} className={btn}>
                Sign in
              </button>
            ))}

          <button
            onClick={() => setEditing(!editing)}
            aria-label={editing ? "Close customize panel" : "Open customize panel"}
            className="inline-flex min-h-[38px] items-center rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {editing ? "✓ Done" : "⚙️ Customize"}
          </button>
        </div>
      </div>
    </header>
  );
}
