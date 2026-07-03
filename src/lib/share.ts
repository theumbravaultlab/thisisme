// Public-sharing helpers. The key function is buildPublicPayload(), which
// produces a Profile containing ONLY the fields the owner marked public — the
// values of everything else are never copied in, so they can't leak through
// the public row.

import { Profile, ProfileData, FieldKey } from "./types";
import { DEFAULT_PROFILE } from "./store";

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

// A default handle from the user's name + a short unique suffix, valid against
// USERNAME_RE (lowercase letters/numbers/underscore, 3–20 chars).
export function generateHandle(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "user";
  const rand = Math.random().toString(36).replace(/[^a-z0-9]/g, "").slice(0, 5);
  return `${base}_${rand}`.slice(0, 20);
}

// Sharing has no separate curation step — whatever is currently visible on
// the owner's own profile (built-in stats + custom fields), exactly as
// configured right now, is what gets shared. Live, not a one-time snapshot:
// this is recomputed from the current profile every time the public payload
// is rebuilt, so any visibility change syncs to the public page automatically.
function shareableKeys(profile: Profile): Set<string> {
  const builtin = (Object.keys(profile.visibility) as FieldKey[]).filter(
    (f) => f !== "name" && profile.visibility[f]
  );
  const custom = profile.data.customFields.filter((c) => c.visible).map((c) => c.id);
  return new Set([...builtin, ...custom]);
}

// Build the public-safe Profile from the owner's current configuration.
export function buildPublicPayload(profile: Profile): Profile {
  const src = profile.data;
  const keys = shareableKeys(profile);

  // Start from defaults (for structural fields like ageDisplayMode), then WIPE
  // every shareable value. This makes the payload leak-proof by construction:
  // anything not explicitly re-added below is blank — not even the demo
  // placeholder text in DEFAULT_PROFILE can surface on a public page.
  const data: ProfileData = { ...DEFAULT_PROFILE.data };
  for (const k of SHAREABLE_SIMPLE) {
    (data[k] as unknown) = Array.isArray(data[k]) ? [] : "";
  }
  data.birthYear = null;

  // identity / branding is always part of a public page
  data.name = src.name;
  data.nameFont = src.nameFont;
  data.photoDataUrl = src.photoDataUrl;
  data.favoriteColor = src.favoriteColor;
  // never expose the private library or share settings publicly
  data.avatars = [];
  data.customFields = [];
  data.customCategories = [];
  data.share = { slug: "", enabled: false };

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
