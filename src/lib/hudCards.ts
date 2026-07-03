// Bridges the static built-in stat system with premium user-defined custom
// fields/categories, and produces:
//   - getCategories(): the full category+row structure (for the Customize
//     panel — every row, regardless of visibility).
//   - getHudCards():  the cards to actually float on the profile, honoring
//     the grouped/detailed view mode + visibility, with display text resolved.

import {
  CATEGORIES,
  FIELD_META,
  FieldKey,
  Profile,
  customCatKey,
  customFieldCardKey,
} from "./types";
import { fieldToText } from "./fieldDisplay";

export type Row =
  | { kind: "builtin"; field: FieldKey }
  | { kind: "custom"; id: string };

export interface CategorySpec {
  key: string; // built-in category title, or "cat:<id>"
  title: string;
  emoji: string;
  builtin: boolean;
  rows: Row[];
}

export interface ResolvedRow {
  key: string;
  emoji: string;
  label: string;
  text: string;
  isColor?: boolean;
}

export interface HudCardSpec {
  key: string; // position/drag identity
  title: string;
  emoji: string;
  rows: ResolvedRow[];
  editCategoryKey: string;
  editField?: FieldKey; // set when this card is a single built-in field
  editCustomId?: string; // set when this card is a single custom field
}

// name is handled outside the floating cards (the title above the avatar).
const HUD_EXCLUDED: FieldKey[] = ["name"];

// Full structure for the Customize panel — includes every row.
export function getCategories(profile: Profile): CategorySpec[] {
  const { customFields, customCategories } = profile.data;

  const builtin: CategorySpec[] = CATEGORIES.map((c) => ({
    key: c.title,
    title: c.title,
    emoji: c.emoji,
    builtin: true,
    rows: [
      ...c.fields.map((f) => ({ kind: "builtin", field: f }) as Row),
      ...customFields
        .filter((cf) => cf.categoryKey === c.title)
        .map((cf) => ({ kind: "custom", id: cf.id }) as Row),
    ],
  }));

  const custom: CategorySpec[] = customCategories.map((c) => ({
    key: customCatKey(c.id),
    title: c.title,
    emoji: c.emoji,
    builtin: false,
    rows: customFields
      .filter((cf) => cf.categoryKey === customCatKey(c.id))
      .map((cf) => ({ kind: "custom", id: cf.id }) as Row),
  }));

  return [...builtin, ...custom];
}

function rowVisible(profile: Profile, row: Row): boolean {
  if (row.kind === "builtin") {
    if (HUD_EXCLUDED.includes(row.field)) return false;
    return profile.visibility[row.field];
  }
  return profile.data.customFields.find((f) => f.id === row.id)?.visible ?? false;
}

function rowText(profile: Profile, row: Row): string {
  if (row.kind === "builtin") return fieldToText(row.field, profile.data);
  return profile.data.customFields.find((f) => f.id === row.id)?.value ?? "";
}

function rowMeta(profile: Profile, row: Row): { key: string; emoji: string; label: string } {
  if (row.kind === "builtin") {
    return { key: row.field, emoji: FIELD_META[row.field].emoji, label: FIELD_META[row.field].label };
  }
  const cf = profile.data.customFields.find((f) => f.id === row.id);
  return { key: customFieldCardKey(row.id), emoji: cf?.emoji ?? "✨", label: cf?.label ?? "Detail" };
}

function resolve(profile: Profile, row: Row): ResolvedRow {
  const meta = rowMeta(profile, row);
  return {
    key: meta.key,
    emoji: meta.emoji,
    label: meta.label,
    text: rowText(profile, row),
    isColor: row.kind === "builtin" && row.field === "favoriteColor",
  };
}

// Cards to render on the profile, per the current view mode.
export function getHudCards(profile: Profile): HudCardSpec[] {
  const cats = getCategories(profile);
  const grouped = profile.cardView === "grouped";
  const cards: HudCardSpec[] = [];

  for (const cat of cats) {
    const shown = cat.rows.filter((r) => rowVisible(profile, r) && rowText(profile, r).trim());
    if (shown.length === 0) continue;

    if (grouped) {
      cards.push({
        key: cat.key,
        title: cat.title,
        emoji: cat.emoji,
        rows: shown.map((r) => resolve(profile, r)),
        editCategoryKey: cat.key,
      });
    } else {
      for (const row of shown) {
        const meta = rowMeta(profile, row);
        cards.push({
          key: meta.key,
          title: meta.label,
          emoji: meta.emoji,
          rows: [resolve(profile, row)],
          editCategoryKey: cat.key,
          editField: row.kind === "builtin" ? row.field : undefined,
          editCustomId: row.kind === "custom" ? row.id : undefined,
        });
      }
    }
  }

  return cards;
}

// Whole categories with nothing toggled on — powers the "+N more sections"
// discovery hint.
export function countHiddenSections(profile: Profile): number {
  return getCategories(profile).filter((cat) => {
    const showable = cat.rows.filter(
      (r) => !(r.kind === "builtin" && HUD_EXCLUDED.includes(r.field))
    );
    return showable.length > 0 && !showable.some((r) => rowVisible(profile, r));
  }).length;
}
