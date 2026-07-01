"use client";

import { motion } from "motion/react";
import { CATEGORIES, Profile } from "@/lib/types";
import { Silhouette } from "./Silhouette";
import { CosmicBackdrop } from "./CosmicBackdrop";
import { CategoryCard } from "./CategoryCard";

const HUD_CATEGORIES = CATEGORIES.map((c) => ({
  ...c,
  fields: c.fields.filter((f) => f !== "photo" && f !== "name"),
})).filter((c) => c.fields.length > 0);

// Phone layout: the figure as a hero, then a tappable list of category cards.
export function MobileProfile({
  profile,
  onEditCategory,
  interactive = true,
}: {
  profile: Profile;
  onEditCategory: (title: string) => void;
  interactive?: boolean;
}) {
  const visible = HUD_CATEGORIES.filter((c) => c.fields.some((f) => profile.visibility[f]));

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

      {/* category cards */}
      <div className="mt-2 grid grid-cols-1 gap-3">
        {visible.map((cat, i) =>
          interactive ? (
            <motion.button
              key={cat.title}
              onClick={() => onEditCategory(cat.title)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              aria-label={`Edit ${cat.title}`}
              className="block text-left active:scale-[0.98]"
            >
              <CategoryCard
                title={cat.title}
                emoji={cat.emoji}
                fields={cat.fields}
                profile={profile}
              />
            </motion.button>
          ) : (
            <div key={cat.title}>
              <CategoryCard
                title={cat.title}
                emoji={cat.emoji}
                fields={cat.fields}
                profile={profile}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}
