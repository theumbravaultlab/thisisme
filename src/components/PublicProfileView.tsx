"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/types";
import { readableAccent } from "@/lib/color";
import { NameTitle } from "./NameTitle";
import { ProfileHud } from "./ProfileHud";
import { MobileProfile } from "./MobileProfile";

// Read-only render of a published profile for public visitors (no auth, no
// editing). Reuses the same HUD components in non-interactive mode.
export function PublicProfileView({ profile }: { profile: Profile }) {
  // Apply the owner's theme + accent to this page.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", profile.theme === "dark");
    root.style.setProperty("--accent-raw", profile.data.favoriteColor);
    root.style.setProperty(
      "--accent",
      readableAccent(profile.data.favoriteColor, profile.theme)
    );
  }, [profile.theme, profile.data.favoriteColor]);

  const noop = () => {};

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-bg/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            this<span className="text-accent">is</span>me
          </Link>
          <Link
            href="/"
            className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Make your own
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 py-4">
        <NameTitle name={profile.data.name || "Someone"} font={profile.data.nameFont} />

        <div className="hidden w-full sm:block">
          <ProfileHud
            profile={profile}
            setPosition={noop}
            onEditCard={noop}
            interactive={false}
          />
        </div>

        <div className="w-full sm:hidden">
          <MobileProfile profile={profile} onEditCard={noop} interactive={false} />
        </div>
      </main>

      {/* Free profiles carry the "thisisme" credit (the viral loop). Premium
          removes it — a paid perk. */}
      {profile.tier !== "premium" && (
        <footer className="border-t border-border px-4 py-4 text-center text-sm text-fg-muted">
          Made with{" "}
          <Link href="/" className="font-semibold text-accent">
            thisisme
          </Link>
        </footer>
      )}
    </>
  );
}
