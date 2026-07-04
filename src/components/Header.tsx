"use client";

import Link from "next/link";
import { useState } from "react";
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
const menuItem =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-accent/10";

function ViewToggle({
  cardView,
  onToggleCardView,
  size = "sm",
}: {
  cardView: CardView;
  onToggleCardView: () => void;
  size?: "sm" | "full";
}) {
  return (
    <div
      role="group"
      aria-label="Card view"
      className={`inline-flex items-center rounded-full border border-border bg-bg-elev/60 p-0.5 text-xs ${
        size === "full" ? "w-full" : ""
      }`}
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
            size === "full" ? "flex-1" : ""
          } ${cardView === key ? "bg-accent text-white" : "text-fg-muted hover:text-fg"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

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
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  const customizeBtn = (
    <button
      onClick={() => setEditing(!editing)}
      aria-label={editing ? "Close customize panel" : "Open customize panel"}
      className="inline-flex min-h-[38px] items-center rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
    >
      {editing ? "✓ Done" : "⚙️ Customize"}
    </button>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            this<span className="text-accent">is</span>me
          </Link>
          <div className="hidden sm:block">
            <ViewToggle cardView={cardView} onToggleCardView={onToggleCardView} />
          </div>
        </div>

        {/* Desktop: full button row */}
        <div className="hidden items-center gap-2 sm:flex">
          {premium ? (
            <span
              title="Premium account"
              className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-400/15 to-accent/15 px-2.5 py-1 text-xs font-semibold text-amber-500"
            >
              ★ Premium
            </span>
          ) : (
            <button
              onClick={onUpgrade}
              title="Unlock Premium"
              className="inline-flex items-center rounded-full border border-amber-400/50 px-2.5 py-1 text-xs font-semibold text-amber-500 transition hover:bg-amber-400/10"
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
            className={`relative ${btn} ${highlightAvatarLink ? "border-accent text-accent" : ""}`}
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
              <button onClick={onSignOut} title={userEmail} aria-label={`Sign out (${userEmail})`} className={btn}>
                Sign out
              </button>
            ) : (
              <button onClick={onSignIn} className={btn}>
                Sign in
              </button>
            ))}
          {customizeBtn}
        </div>

        {/* Mobile: primary action + overflow menu */}
        <div className="relative flex items-center gap-2 sm:hidden">
          {customizeBtn}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More options"
            aria-expanded={menuOpen}
            className={`${btn} px-2.5 ${highlightAvatarLink ? "border-accent text-accent" : ""}`}
          >
            <span className="text-lg leading-none">⋯</span>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={closeMenu} aria-hidden />
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-border bg-bg-elev p-2 shadow-2xl">
                <div className="px-1 pb-2">
                  <ViewToggle cardView={cardView} onToggleCardView={onToggleCardView} size="full" />
                </div>
                <Link href="/avatar" onClick={() => { onAvatarLinkClick?.(); closeMenu(); }} className={menuItem}>
                  ✨ My Avatar
                  {highlightAvatarLink && <span className="ml-auto h-2 w-2 rounded-full bg-accent" />}
                </Link>
                <button onClick={() => { onShare(); closeMenu(); }} className={menuItem}>
                  🔗 Share
                </button>
                {!premium && (
                  <button
                    onClick={() => { onUpgrade(); closeMenu(); }}
                    className={`${menuItem} font-semibold text-amber-500`}
                  >
                    ✨ Upgrade to Premium
                  </button>
                )}
                {premium && (
                  <div className={`${menuItem} font-semibold text-amber-500`}>★ Premium</div>
                )}
                <button onClick={() => { toggleTheme(); closeMenu(); }} className={menuItem}>
                  {theme === "dark" ? "🌙 Dark mode" : "☀️ Light mode"}
                </button>
                {cloudEnabled &&
                  (userEmail ? (
                    <button onClick={() => { onSignOut(); closeMenu(); }} className={`${menuItem} items-start`}>
                      <span className="leading-6">🚪</span>
                      <span className="flex min-w-0 flex-col">
                        <span>Sign out</span>
                        <span className="truncate text-xs text-fg-muted">{userEmail}</span>
                      </span>
                    </button>
                  ) : (
                    <button onClick={() => { onSignIn(); closeMenu(); }} className={menuItem}>
                      👤 Sign in
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
