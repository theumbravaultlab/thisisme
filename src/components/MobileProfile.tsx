"use client";

import { motion } from "motion/react";
import { FIELD_ORDER, FieldKey, Profile } from "@/lib/types";
import { Silhouette } from "./Silhouette";
import { CosmicBackdrop } from "./CosmicBackdrop";
import { HudCard } from "./HudCard";

const ORBIT_FIELDS = FIELD_ORDER.filter((f) => f !== "photo" && f !== "name");

// Phone layout: the figure as a hero, then a tappable single-column list of
// stat cards. No dragging — the float doesn't fit a narrow screen.
export function MobileProfile({
  profile,
  onEditField,
  interactive = true,
}: {
  profile: Profile;
  onEditField: (key: FieldKey) => void;
  interactive?: boolean;
}) {
  const visible = ORBIT_FIELDS.filter((f) => profile.visibility[f]);

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
        <p className="mt-4 text-center text-xs text-fg-muted">Tap a stat to edit</p>
      )}

      {/* stat list */}
      <div className="mt-2 grid grid-cols-1 gap-3">
        {visible.map((field, i) =>
          interactive ? (
            <motion.button
              key={field}
              onClick={() => onEditField(field)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              aria-label={`Edit ${field}`}
              className="block text-left active:scale-[0.98]"
            >
              <HudCard field={field} profile={profile} />
            </motion.button>
          ) : (
            <div key={field}>
              <HudCard field={field} profile={profile} />
            </div>
          )
        )}
      </div>
    </div>
  );
}
