"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Profile } from "@/lib/types";
import { getHudCards, HudCardSpec } from "@/lib/hudCards";
import { Silhouette } from "./Silhouette";
import { CosmicBackdrop } from "./CosmicBackdrop";
import { CategoryCard } from "./CategoryCard";

// Phone layout: the figure as a hero, then a tappable list of cards (grouped
// by category, or one per stat, depending on the view mode). A small sticky
// avatar chip appears once the hero scrolls out of view, so identity stays
// anchored while browsing a long card list.
export function MobileProfile({
  profile,
  onEditCard,
  interactive = true,
}: {
  profile: Profile;
  onEditCard: (card: HudCardSpec) => void;
  interactive?: boolean;
}) {
  const visible = getHudCards(profile);
  // The name toggle only hides the *display* — the typed name in
  // profile.data.name is untouched, so switching it back on restores it.
  const displayName = profile.visibility.name
    ? profile.data.name || "Your Name"
    : "Who Am I?";
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="w-full">
      {/* sticky mini avatar — shows once the hero scrolls out of view */}
      <AnimatePresence>
        {!heroVisible && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass sticky top-16 z-20 mb-3 flex items-center gap-2 rounded-full px-3 py-2"
          >
            <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-accent/20">
              {profile.data.photoDataUrl && (
                <Image
                  src={profile.data.photoDataUrl}
                  alt=""
                  fill
                  sizes="28px"
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>
            <span className="truncate text-sm font-medium">{displayName}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* hero figure */}
      <div
        ref={heroRef}
        className="relative h-72 w-full overflow-hidden rounded-3xl border border-border bg-bg-elev/20"
      >
        <CosmicBackdrop />
        <div className="absolute inset-0">
          <Silhouette photoUrl={profile.data.photoDataUrl} />
        </div>
        {/* watermark — premium removes the "thisisme" branding */}
        {profile.tier !== "premium" && (
          <span className="pointer-events-none absolute bottom-3 left-3 select-none text-sm font-extrabold tracking-tight text-fg/70">
            this<span className="text-accent">is</span>me
          </span>
        )}
      </div>

      {interactive && (
        <p className="mt-4 text-center text-xs text-fg-muted">Tap a card to edit</p>
      )}

      {/* cards */}
      <div className="mt-2 grid grid-cols-1 gap-3">
        {visible.map((card, i) =>
          interactive ? (
            <motion.button
              key={card.key}
              onClick={() => onEditCard(card)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              aria-label={`Edit ${card.title}`}
              className="block text-left active:scale-[0.98]"
            >
              <CategoryCard
                title={card.title}
                emoji={card.emoji}
                rows={card.rows}
                showLabels={profile.cardView === "grouped"}
              />
            </motion.button>
          ) : (
            <div key={card.key}>
              <CategoryCard
                title={card.title}
                emoji={card.emoji}
                rows={card.rows}
                showLabels={profile.cardView === "grouped"}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}
