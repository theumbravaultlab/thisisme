// Public-sharing helpers. The key function is buildPublicPayload(), which
// produces a Profile containing ONLY the fields the owner marked public — the
// values of everything else are never copied in, so they can't leak through
// the public row.

import { Profile, ProfileData, FieldKey } from "./types";
import { DEFAULT_PROFILE } from "./store";

// Sensitive by default — excluded from a brand-new public profile.
export const CONTACT_FIELDS: FieldKey[] = ["phone", "email", "instagram", "address"];

// Built-in stat fields that can be shared (everything except the identity
// bits handled separately).
const SHAREABLE_SIMPLE: (keyof ProfileData)[] = [
  "birthday",
  "height",
  "favoriteColor",
  "mindset",
  "mbti",
  "favoriteAnimal",
  "relationshipStatus",
  "religion",
  "achievements",
  "moviesAndShows",
  "spotifyTopSongs",
  "hobbies",
  "dreamDestination",
  "favoriteDrink",
  "movieSnack",
  "favoriteSeason",
  "phone",
  "email",
  "instagram",
  "address",
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 20);
}

export function generateSlug(name: string): string {
  const base = slugify(name) || "me";
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base}-${rand}`;
}

// Sensible starting set: everything currently visible on the board except
// contact info, plus visible custom fields.
export function defaultPublicKeys(profile: Profile): string[] {
  const builtin = (Object.keys(profile.visibility) as FieldKey[]).filter(
    (f) =>
      f !== "name" &&
      f !== "photo" &&
      profile.visibility[f] &&
      !CONTACT_FIELDS.includes(f)
  );
  const custom = profile.data.customFields.filter((c) => c.visible).map((c) => c.id);
  return [...builtin, ...custom];
}

// Build the public-safe Profile from the owner's choices.
export function buildPublicPayload(profile: Profile): Profile {
  const src = profile.data;
  const keys = new Set(profile.data.share.publicKeys);

  const data: ProfileData = {
    ...DEFAULT_PROFILE.data,
    // identity / branding is always part of a public page
    name: src.name,
    nameFont: src.nameFont,
    photoDataUrl: src.photoDataUrl,
    favoriteColor: src.favoriteColor,
    // never expose the private library or share settings publicly
    avatars: [],
    customFields: [],
    customCategories: [],
    share: { slug: "", enabled: false, publicKeys: [] },
  };

  if (keys.has("age")) {
    data.birthYear = src.birthYear;
    data.ageDisplayMode = src.ageDisplayMode;
  }
  for (const k of SHAREABLE_SIMPLE) {
    if (keys.has(k)) data[k] = src[k] as never;
  }

  const publicCustom = src.customFields.filter((c) => keys.has(c.id));
  data.customFields = publicCustom.map((c) => ({ ...c, visible: true }));
  const usedCats = new Set(publicCustom.map((c) => c.categoryKey));
  data.customCategories = src.customCategories.filter((c) => usedCats.has(`cat:${c.id}`));

  const visibility = {} as Profile["visibility"];
  (Object.keys(profile.visibility) as FieldKey[]).forEach((k) => {
    visibility[k] = keys.has(k);
  });

  return {
    data,
    visibility,
    theme: profile.theme,
    cardView: profile.cardView,
    tier: "standard",
    positions: profile.positions,
  };
}
