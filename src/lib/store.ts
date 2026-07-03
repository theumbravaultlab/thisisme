// Local persistence layer. Today this is localStorage so the app works with
// zero backend. Phase: swap these two functions for Supabase calls and the
// rest of the app stays unchanged.

import { Profile, CATEGORIES, FIELD_ORDER } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

// Position keys are either a category title (grouped view) or a field key
// (detailed view). Drop anything else — e.g. leftovers from a since-renamed
// or removed stat — so the positions map doesn't grow stale forever.
const VALID_POSITION_KEYS = new Set<string>([
  ...CATEGORIES.map((c) => c.title),
  ...FIELD_ORDER,
]);

function prunePositions(positions: Profile["positions"] | undefined): Profile["positions"] {
  if (!positions) return {};
  const pruned: Profile["positions"] = {};
  for (const [key, pos] of Object.entries(positions)) {
    // Keep built-in category/field keys, plus custom category ("cat:") and
    // custom field ("cf:") keys so premium custom cards keep their positions.
    if (VALID_POSITION_KEYS.has(key) || key.startsWith("cat:") || key.startsWith("cf:")) {
      pruned[key] = pos;
    }
  }
  return pruned;
}

const STORAGE_KEY = "thisisme:profile:v10";

export const DEFAULT_PROFILE: Profile = {
  data: {
    name: "Your Name",
    username: "",
    nameFont: "sans",
    photoDataUrl: null,
    ageDisplayMode: "range",
    birthYear: 1998,
    birthday: "",
    height: "5'11\"",
    favoriteColor: "#7c5cff",
    mindset: "Focused. Adaptive. Relentless.",
    mbti: "ENFP",
    favoriteAnimal: "🦊 Fox",
    relationshipStatus: "It's complicated",
    religion: "",
    achievements: ["Ran a half marathon", "Learned to cook Thai food"],
    moviesAndShows: ["Interstellar", "The Bear", "Severance"],
    spotifyTopSongs: ["Daft Punk – Instant Crush", "SZA – Snooze"],
    hobbies: ["Photography", "Climbing", "Vinyl collecting"],
    dreamDestination: "Tokyo, Japan",
    favoriteDrink: "Iced oat latte",
    movieSnack: "Buttered popcorn",
    favoriteSeason: "🍂 Fall",
    phone: "",
    email: "",
    instagram: "",
    address: "",
    avatars: [],
    customFields: [],
    customCategories: [],
    share: { slug: "", enabled: false },
  },
  positions: {},
  visibility: {
    name: true,
    age: true,
    birthday: true,
    height: true,
    favoriteColor: true,
    mindset: true,
    mbti: false,
    favoriteAnimal: true,
    relationshipStatus: true,
    religion: false,
    achievements: true,
    moviesAndShows: true,
    spotifyTopSongs: true,
    hobbies: false,
    dreamDestination: false,
    favoriteDrink: true,
    movieSnack: false,
    favoriteSeason: true,
    phone: false,
    email: false,
    instagram: false,
    address: false,
  },
  theme: "dark",
  cardView: "grouped",
  tier: "standard",
};

export function loadProfile(): Profile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    // shallow-merge so new fields added later still get defaults
    return {
      data: { ...DEFAULT_PROFILE.data, ...parsed.data },
      visibility: { ...DEFAULT_PROFILE.visibility, ...parsed.visibility },
      theme: parsed.theme ?? DEFAULT_PROFILE.theme,
      cardView: parsed.cardView ?? DEFAULT_PROFILE.cardView,
      tier: parsed.tier ?? DEFAULT_PROFILE.tier,
      positions: prunePositions(parsed.positions),
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function isQuotaError(e: unknown): boolean {
  return e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22);
}

export function saveProfile(profile: Profile): void {
  if (typeof window === "undefined") return;
  let toSave = profile;
  // The avatar library is the only thing that grows unbounded. If we're over
  // quota (e.g. a browser with a smaller-than-usual localStorage limit), drop
  // the oldest saved avatars one at a time and retry rather than throwing and
  // crashing the app — losing an old library entry is far better than that.
  while (true) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      return;
    } catch (e) {
      if (!isQuotaError(e) || toSave.data.avatars.length === 0) return;
      toSave = { ...toSave, data: { ...toSave.data, avatars: toSave.data.avatars.slice(0, -1) } };
    }
  }
}

// ---- Cloud (Supabase) --------------------------------------------------------
// The same Profile shape, stored one-row-per-user. Missing keys are merged with
// defaults so the app tolerates older/newer rows.

interface ProfileRow {
  data?: Partial<Profile["data"]>;
  visibility?: Partial<Profile["visibility"]>;
  positions?: Profile["positions"];
  theme?: Profile["theme"];
  cardView?: Profile["cardView"];
  tier?: Profile["tier"];
}

function mergeRow(row: ProfileRow): Profile {
  return {
    data: { ...DEFAULT_PROFILE.data, ...row.data },
    visibility: { ...DEFAULT_PROFILE.visibility, ...row.visibility },
    theme: row.theme ?? DEFAULT_PROFILE.theme,
    cardView: row.cardView ?? DEFAULT_PROFILE.cardView,
    tier: row.tier ?? DEFAULT_PROFILE.tier,
    positions: prunePositions(row.positions),
  };
}

// Returns the user's cloud profile, plus whether the row is still empty (a
// freshly-created account) so the caller can seed it from local data.
export async function loadProfileCloud(
  supabase: SupabaseClient,
  userId: string
): Promise<{ profile: Profile; isEmpty: boolean }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("data, visibility, positions, theme")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return { profile: DEFAULT_PROFILE, isEmpty: true };
  const isEmpty = !data.data || Object.keys(data.data).length === 0;
  return { profile: mergeRow(data as ProfileRow), isEmpty };
}

export async function saveProfileCloud(
  supabase: SupabaseClient,
  userId: string,
  profile: Profile
): Promise<void> {
  await supabase.from("profiles").upsert({
    id: userId,
    data: profile.data,
    visibility: profile.visibility,
    positions: profile.positions,
    theme: profile.theme,
    updated_at: new Date().toISOString(),
  });
}

// ---- Public sharing (Phase 3) -----------------------------------------------
// The public_profiles table holds ONLY the filtered, public-safe payload —
// private fields are never written here, so they can't leak. Anonymous reads
// are allowed by RLS; only the owner can write their row.

export async function publishPublicProfile(
  supabase: SupabaseClient,
  userId: string,
  slug: string,
  payload: Profile
): Promise<void> {
  await supabase.from("public_profiles").upsert(
    {
      slug,
      user_id: userId,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

export async function unpublishPublicProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase.from("public_profiles").delete().eq("user_id", userId);
}

// ---- Usernames / handles ----------------------------------------------------
// Public registry table, only for uniqueness + resolving a handle to a user.
// Anyone can read (availability checks + public lookups); owner-only writes.

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(s: string): string {
  return s.toLowerCase().trim();
}

// True if free to claim (or already owned by this user).
export async function isUsernameAvailable(
  supabase: SupabaseClient,
  username: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("usernames")
    .select("user_id")
    .eq("username", normalizeUsername(username))
    .maybeSingle();
  return !data || data.user_id === userId;
}

export async function getMyUsername(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("usernames")
    .select("username")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.username ?? "";
}

// Claim / change a handle. Returns an error string, or null on success.
export async function claimUsername(
  supabase: SupabaseClient,
  userId: string,
  username: string
): Promise<string | null> {
  const u = normalizeUsername(username);
  if (!USERNAME_RE.test(u)) {
    return "3–20 characters: letters, numbers, underscore.";
  }
  const { error } = await supabase
    .from("usernames")
    .upsert({ username: u, user_id: userId }, { onConflict: "user_id" });
  if (error) {
    // 23505 = unique violation on the username PK → taken by someone else.
    return error.code === "23505" ? "That handle is taken." : error.message;
  }
  return null;
}

// Derive a displayable age string from the profile's settings.
export function formatAge(birthYear: number | null, mode: "range" | "exact"): string {
  if (!birthYear) return "—";
  const age = new Date().getFullYear() - birthYear;
  if (mode === "exact") return `${age}`;
  const lo = Math.floor(age / 5) * 5;
  return `${lo}–${lo + 5}`;
}
