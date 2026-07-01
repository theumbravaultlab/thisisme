// Local persistence layer. Today this is localStorage so the app works with
// zero backend. Phase: swap these two functions for Supabase calls and the
// rest of the app stays unchanged.

import { Profile } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

const STORAGE_KEY = "thisisme:profile:v7";

export const DEFAULT_PROFILE: Profile = {
  data: {
    name: "Your Name",
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
  },
  positions: {},
  visibility: {
    name: true,
    photo: true,
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
      positions: parsed.positions ?? {},
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: Profile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

// ---- Cloud (Supabase) --------------------------------------------------------
// The same Profile shape, stored one-row-per-user. Missing keys are merged with
// defaults so the app tolerates older/newer rows.

interface ProfileRow {
  data?: Partial<Profile["data"]>;
  visibility?: Partial<Profile["visibility"]>;
  positions?: Profile["positions"];
  theme?: Profile["theme"];
}

function mergeRow(row: ProfileRow): Profile {
  return {
    data: { ...DEFAULT_PROFILE.data, ...row.data },
    visibility: { ...DEFAULT_PROFILE.visibility, ...row.visibility },
    theme: row.theme ?? DEFAULT_PROFILE.theme,
    positions: row.positions ?? {},
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

// Derive a displayable age string from the profile's settings.
export function formatAge(birthYear: number | null, mode: "range" | "exact"): string {
  if (!birthYear) return "—";
  const age = new Date().getFullYear() - birthYear;
  if (mode === "exact") return `${age}`;
  const lo = Math.floor(age / 5) * 5;
  return `${lo}–${lo + 5}`;
}
