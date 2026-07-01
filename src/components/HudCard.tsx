"use client";

import { FIELD_META, FieldKey, Profile } from "@/lib/types";
import { HudValue } from "./HudValue";

// A single liquid-glass stat card. Used in the desktop float (draggable, hover
// edit) and the mobile list (tappable).
export function HudCard({
  field,
  profile,
  onEdit,
}: {
  field: FieldKey;
  profile: Profile;
  onEdit?: () => void;
}) {
  const isColor = field === "favoriteColor";
  return (
    <div className="glass relative h-full rounded-2xl p-3.5 text-left transition group-hover:-translate-y-0.5">
      {onEdit && (
        <button
          onPointerDownCapture={(e) => e.stopPropagation()}
          onClick={onEdit}
          className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-full text-fg-muted transition hover:bg-accent/15 hover:text-accent group-hover:flex"
          aria-label={`Edit ${FIELD_META[field].label}`}
        >
          ✎
        </button>
      )}

      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ring-1 ring-fg/15"
          style={
            isColor
              ? { background: profile.data.favoriteColor }
              : { background: "color-mix(in srgb, var(--accent) 16%, transparent)" }
          }
        >
          {isColor ? "" : FIELD_META[field].emoji}
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-[11px] font-medium text-fg-muted">
            {FIELD_META[field].label}
          </p>
          <HudValue field={field} data={profile.data} />
        </div>
      </div>
    </div>
  );
}
