"use client";

import { motion } from "motion/react";
import { Profile } from "@/lib/types";
import { getHudCards, HudCardSpec } from "@/lib/hudCards";
import { Silhouette } from "./Silhouette";
import { CosmicBackdrop } from "./CosmicBackdrop";
import { CategoryCard } from "./CategoryCard";

// Phone layout: the figure as a hero, then a tappable list of cards (grouped
// by category, or one per stat, depending on the view mode).
export function MobileProfile({
  profile,
  onEditCard,
  interactive = true,
}: {
  profile: Profile;
  onEditCard: (card: HudCardSpec) => void;
  interactive?: boolean;
}) {
  const visible = getHudCards(profile.cardView, profile.visibility);

  return (
    <div className="w-full">
      {/* hero figure */}
      <div className="relative h-72 w-full overflow-hidden rounded-3xl border border-border bg-bg-elev/20">
        <CosmicBackdrop />
        <div className="absolute inset-0">
          <Silhouette photoUrl={profile.data.photoDataUrl} />
        </div>
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
                fields={card.fields}
                profile={profile}
              />
            </motion.button>
          ) : (
            <div key={card.key}>
              <CategoryCard
                title={card.title}
                emoji={card.emoji}
                fields={card.fields}
                profile={profile}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}
