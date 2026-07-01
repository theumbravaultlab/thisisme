// Builds the list of cards to float/list on the profile, depending on the
// current view mode:
// - "grouped": one card per Customize category, holding all its stats.
// - "detailed": one card per individual stat.
// Both shapes are uniform so the HUD/mobile layouts and collision logic don't
// need to know which mode is active.

import { CATEGORIES, FIELD_META, FieldKey, FieldVisibility, CardView } from "./types";

export interface HudCardSpec {
  key: string; // used for position storage + drag identity
  title: string;
  emoji: string;
  fields: FieldKey[];
}

// "photo" and "name" are handled outside cards (avatar + title), in both modes.
const EXCLUDED: FieldKey[] = ["photo", "name"];

export function getHudCards(view: CardView, visibility: FieldVisibility): HudCardSpec[] {
  if (view === "detailed") {
    const flat = CATEGORIES.flatMap((c) => c.fields).filter((f) => !EXCLUDED.includes(f));
    return flat
      .filter((f) => visibility[f])
      .map((f) => ({
        key: f,
        title: FIELD_META[f].label,
        emoji: FIELD_META[f].emoji,
        fields: [f],
      }));
  }

  return CATEGORIES.map((c) => ({
    key: c.title,
    title: c.title,
    emoji: c.emoji,
    fields: c.fields.filter((f) => !EXCLUDED.includes(f)),
  })).filter((c) => c.fields.length > 0 && c.fields.some((f) => visibility[f]));
}
