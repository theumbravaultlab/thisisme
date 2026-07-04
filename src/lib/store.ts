// Local persistence layer. Today this is localStorage so the app works with
// zero backend. Phase: swap these two functions for Supabase calls and the
// rest of the app stays unchanged.

import { Profile, ProfileData, FieldVisibility, CATEGORIES, FIELD_ORDER } from "./types";
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

const STORAGE_KEY = "thisisme:profile:v11";

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
    pronouns: "",
    basedIn: "Austin, TX",
    languages: "English, Spanish",
    whatIDo: "Product designer",
    mindset: "Focused. Adaptive. Relentless.",
    introExtro: 60,
    favoriteAnimal: "🦊 Fox",
    loveLanguage: "Quality Time",
    enneagram: "",
    toxicTrait: "I reply “lol” then think about it for an hour",
    romanEmpire: "The fall of the actual Roman Empire",
    greenFlag: "Always texts back",
    redFlag: "Chronically 10 minutes late",
    hottestTake: "Pineapple belongs on pizza",
    relationshipStatus: "It's complicated",
    religion: "",
    achievements: ["Ran a half marathon"],
    currentlyObsessed: "Making the perfect espresso",
    pets: "Milo (golden retriever)",
    bucketList: ["See the northern lights", "Learn to surf"],
    bornIn: "Chicago, IL",
    education: "UT Austin",
    cause: "Ocean conservation",
    comfortShow: "The Office",
    spotifyTopSongs: ["Daft Punk – Instant Crush", "SZA – Snooze"],
    hobbies: ["Photography", "Climbing", "Vinyl collecting"],
    favoriteFood: "Ramen",
    favoriteBook: "Dune",
    guiltyPleasure: "Reality TV",
    favoriteGame: "Zelda: Tears of the Kingdom",
    favoriteSportsTeam: "",
    favoriteDrink: "Iced oat latte",
    favoriteSeason: "🍂 Fall",
    phone: "",
    email: "",
    instagram: "",
    tiktok: "",
    snapchat: "",
    twitter: "",
    linkedin: "",
    youtube: "",
    twitch: "",
    discord: "",
    website: "",
    avatars: [],
    customFields: [],
    customCategories: [],
    share: { slug: "", enabled: false },
    updatedAt: "",
  },
  positions: {},
  // Default = the "Get to Know Me" preset: a curated, non-overwhelming set.
  visibility: {
    name: true,
    birthday: true,
    age: true,
    zodiac: false, // premium
    pronouns: false, // premium
    height: false,
    basedIn: true,
    languages: false,
    whatIDo: true,
    favoriteColor: false,
    mindset: true,
    introExtro: false,
    favoriteAnimal: true,
    loveLanguage: true,
    enneagram: false,
    toxicTrait: false,
    romanEmpire: false,
    greenFlag: false,
    redFlag: false,
    hottestTake: false,
    relationshipStatus: false,
    religion: false,
    achievements: false,
    currentlyObsessed: true,
    pets: true,
    bucketList: false,
    bornIn: false,
    education: false,
    cause: false,
    comfortShow: true,
    spotifyTopSongs: false,
    hobbies: true,
    favoriteFood: true,
    favoriteBook: false,
    guiltyPleasure: false,
    favoriteGame: false,
    favoriteSportsTeam: false,
    favoriteDrink: false,
    favoriteSeason: false,
    phone: false,
    email: false,
    instagram: true,
    tiktok: false,
    snapchat: false,
    twitter: false,
    linkedin: false,
    youtube: false,
    twitch: false,
    discord: false,
    website: false,
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
      // tier is server-authoritative (entitlements table) — never trusted from
      // localStorage, or premium could be self-granted. Always load as standard;
      // useProfile upgrades it from the entitlement after sign-in.
      tier: "standard",
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
  // Stamp the save time so "Updated …" reflects the latest edit on reload.
  let toSave: Profile = {
    ...profile,
    data: { ...profile.data, updatedAt: new Date().toISOString() },
  };
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
    data: { ...profile.data, updatedAt: new Date().toISOString() },
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

// ---- Entitlements (Phase 4 premium) -----------------------------------------
// Reads the user's premium flag from the entitlements table. RLS lets a user
// read only their own row; only the billing webhook (service role) can write it.
export async function fetchEntitlement(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("entitlements")
    .select("is_premium")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data?.is_premium);
}

// ---- Version history (Phase 5, premium) -------------------------------------
export interface SnapshotBody {
  data: ProfileData;
  visibility: FieldVisibility;
  positions: Profile["positions"];
}

export interface ProfileSnapshot {
  id: string;
  label: string | null;
  created_at: string;
  snapshot: SnapshotBody;
}

export async function saveSnapshotCloud(
  supabase: SupabaseClient,
  userId: string,
  label: string | null,
  body: SnapshotBody
): Promise<void> {
  await supabase.from("profile_snapshots").insert({ user_id: userId, label, snapshot: body });
}

export async function listSnapshotsCloud(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileSnapshot[]> {
  const { data } = await supabase
    .from("profile_snapshots")
    .select("id, label, created_at, snapshot")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data as ProfileSnapshot[]) ?? [];
}

export async function deleteSnapshotCloud(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  await supabase.from("profile_snapshots").delete().eq("id", id);
}

// Derive a displayable age string from the profile's settings.
export function formatAge(birthYear: number | null, mode: "range" | "exact"): string {
  if (!birthYear) return "—";
  const age = new Date().getFullYear() - birthYear;
  if (mode === "exact") return `${age}`;
  const lo = Math.floor(age / 5) * 5;
  return `${lo}–${lo + 5}`;
}
