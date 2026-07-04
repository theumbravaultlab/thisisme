"use client";

import Link from "next/link";
import type { CardView } from "@/lib/types";

interface Props {
  editing: boolean;
  setEditing: (v: boolean) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  cloudEnabled: boolean;
  userEmail: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  cardView: CardView;
  onToggleCardView: () => void;
  premium: boolean;
  onUpgrade: () => void;
  onShare: () => void;
  highlightAvatarLink?: boolean;
  onAvatarLinkClick?: () => void;
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
  cardView,
  onToggleCardView,
  premium,
  onUpgrade,
  onShare,
  highlightAvatarLink,
  onAvatarLinkClick,
}: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            this<span className="text-accent">is</span>me
          </Link>

          {/* Grouped / Detailed view toggle — lives in the top ribbon */}
          <div
            role="group"
            aria-label="Card view"
            className="hidden items-center rounded-full border border-border bg-bg-elev/60 p-0.5 text-xs sm:inline-flex"
          >
            {(
              [
                ["grouped", "Grouped"],
                ["detailed", "Detailed"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => cardView !== key && onToggleCardView()}
                aria-pressed={cardView === key}
                className={`rounded-full px-2.5 py-1 font-medium transition ${
                  cardView === key ? "bg-accent text-white" : "text-fg-muted hover:text-fg"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Premium badge (paid) or upgrade entry point (not paid) */}
          {premium ? (
            <span
              title="Premium account"
              className="hidden items-center gap-1 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-400/15 to-accent/15 px-2.5 py-1 text-xs font-semibold text-amber-500 sm:inline-flex"
            >
              ★ Premium
            </span>
          ) : (
            <button
              onClick={onUpgrade}
              title="Unlock Premium"
              className="hidden items-center rounded-full border border-amber-400/50 px-2.5 py-1 text-xs font-semibold text-amber-500 transition hover:bg-amber-400/10 sm:inline-flex"
            >
              ✨ Upgrade
            </button>
          )}

          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title="Toggle light / dark"
            className={btn}
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </button>

          <Link
            href="/avatar"
            onClick={onAvatarLinkClick}
            className={`relative hidden sm:inline-flex ${btn} ${
              highlightAvatarLink ? "border-accent text-accent" : ""
            }`}
          >
            ✨ My Avatar
            {highlightAvatarLink && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
              </span>
            )}
          </Link>

          <button onClick={onShare} className={btn}>
            🔗 Share
          </button>

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

      {/* mobile: card view + tier toggles on their own row */}
      <div className="flex justify-center gap-2 border-t border-border/60 py-2 sm:hidden">
        <div
          role="group"
          aria-label="Card view"
          className="inline-flex items-center rounded-full border border-border bg-bg-elev/60 p-0.5 text-xs"
        >
          {(
            [
              ["grouped", "Grouped"],
              ["detailed", "Detailed"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => cardView !== key && onToggleCardView()}
              aria-pressed={cardView === key}
              className={`rounded-full px-3 py-1 font-medium transition ${
                cardView === key ? "bg-accent text-white" : "text-fg-muted hover:text-fg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {premium ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-400/15 to-accent/15 px-3 py-1 text-xs font-semibold text-amber-500">
            ★ Premium
          </span>
        ) : (
          <button
            onClick={onUpgrade}
            className="inline-flex items-center rounded-full border border-amber-400/50 px-3 py-1 text-xs font-semibold text-amber-500 transition hover:bg-amber-400/10"
          >
            ✨ Upgrade
          </button>
        )}
      </div>
    </header>
  );
}
