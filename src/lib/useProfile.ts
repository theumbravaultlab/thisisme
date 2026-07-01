"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Profile, ProfileData, FieldKey, Pos } from "./types";
import {
  DEFAULT_PROFILE,
  loadProfile,
  saveProfile,
  loadProfileCloud,
  saveProfileCloud,
} from "./store";
import { readableAccent } from "./color";
import { getSupabase, isSupabaseConfigured } from "./supabase";

export type SaveStatus = "idle" | "saving" | "saved" | "local";

// Single source of truth for the profile.
// - Signed out / no Supabase: reads & writes localStorage.
// - Signed in: reads & writes the user's Supabase row (debounced), seeding the
//   cloud row from local on first sign-in.
export function useProfile() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedFor = useRef<string | null>(null);

  // ---- load + auth wiring ---------------------------------------------------
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(loadProfile());
      setHydrated(true);
      return;
    }

    // Surface an auth error returned in the redirect URL (e.g. expired link),
    // then clean it out of the address bar.
    const u = new URL(window.location.href);
    const err =
      u.searchParams.get("error_description") ||
      new URLSearchParams(u.hash.slice(1)).get("error_description");
    if (err) {
      setAuthError(err.replace(/\+/g, " "));
      window.history.replaceState({}, "", u.origin + u.pathname);
    }

    let active = true;

    // Load the user's cloud profile. Deferred (setTimeout) so we never call
    // supabase methods *inside* the auth callback lock — a known deadlock.
    const loadFor = (u: User) => {
      loadedFor.current = u.id;
      setTimeout(async () => {
        if (!active) return;
        try {
          const { profile: cloud, isEmpty } = await loadProfileCloud(supabase, u.id);
          if (isEmpty) {
            const local = loadProfile();
            try {
              await saveProfileCloud(supabase, u.id, local);
            } catch {
              /* table may not exist yet — falls back to local saves */
            }
            if (active) setProfile(local);
          } else if (active) {
            setProfile(cloud);
          }
        } catch {
          if (active) setProfile(loadProfile());
        } finally {
          if (active) setHydrated(true);
        }
      }, 0);
    };

    // Existing session on page load (also covers the just-completed magic link).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadFor(u);
      } else {
        setProfile(loadProfile());
        setHydrated(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;
        const u = session?.user ?? null;
        setUser(u);
        if (u && event === "SIGNED_IN" && loadedFor.current !== u.id) {
          loadFor(u);
        } else if (event === "SIGNED_OUT") {
          loadedFor.current = null;
          setProfile(loadProfile());
          setHydrated(true);
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // ---- apply theme + accent to <html> --------------------------------------
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.classList.toggle("dark", profile.theme === "dark");
    root.style.setProperty("--accent-raw", profile.data.favoriteColor);
    root.style.setProperty(
      "--accent",
      readableAccent(profile.data.favoriteColor, profile.theme)
    );
  }, [profile, hydrated]);

  // ---- persist (debounced for cloud) ---------------------------------------
  useEffect(() => {
    if (!hydrated) return;
    const supabase = getSupabase();
    if (user && supabase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaveStatus("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          await saveProfileCloud(supabase, user.id, profile);
          setSaveStatus("saved");
          setLastSavedAt(Date.now());
        } catch {
          saveProfile(profile);
          setSaveStatus("local");
          setLastSavedAt(Date.now());
        }
      }, 600);
    } else {
      saveProfile(profile);
      setSaveStatus("local");
      setLastSavedAt(Date.now());
    }
  }, [profile, hydrated, user]);

  const updateData = useCallback(
    <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => {
      setProfile((p) => ({ ...p, data: { ...p.data, [key]: value } }));
    },
    []
  );

  const toggleVisibility = useCallback((key: FieldKey) => {
    setProfile((p) => ({
      ...p,
      visibility: { ...p.visibility, [key]: !p.visibility[key] },
    }));
  }, []);

  const toggleTheme = useCallback(() => {
    setProfile((p) => ({ ...p, theme: p.theme === "dark" ? "light" : "dark" }));
  }, []);

  const setPosition = useCallback((key: string, pos: Pos) => {
    setProfile((p) => ({ ...p, positions: { ...p.positions, [key]: pos } }));
  }, []);

  const resetPositions = useCallback(() => {
    setProfile((p) => ({ ...p, positions: {} }));
  }, []);

  // Restore a previous positions map (used for Undo).
  const restorePositions = useCallback((positions: Profile["positions"]) => {
    setProfile((p) => ({ ...p, positions }));
  }, []);

  // ---- auth actions ---------------------------------------------------------
  const signInEmail = useCallback(async (email: string) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Cloud not configured" };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  }, []);

  const signInGoogle = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Cloud not configured" };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase()?.auth.signOut();
  }, []);

  return {
    profile,
    hydrated,
    user,
    cloudEnabled: isSupabaseConfigured,
    saveStatus,
    lastSavedAt,
    authError,
    dismissAuthError: () => setAuthError(null),
    updateData,
    toggleVisibility,
    toggleTheme,
    setPosition,
    resetPositions,
    restorePositions,
    signInEmail,
    signInGoogle,
    signOut,
  };
}
