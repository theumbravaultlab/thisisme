"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Profile,
  ProfileData,
  FieldKey,
  Pos,
  CustomField,
  CustomCategory,
  AVATAR_LIMITS,
} from "./types";
import {
  DEFAULT_PROFILE,
  loadProfile,
  saveProfile,
  loadProfileCloud,
  saveProfileCloud,
  publishPublicProfile,
  unpublishPublicProfile,
  getMyUsername,
  claimUsername as claimUsernameCloud,
  isUsernameAvailable,
} from "./store";
import { readableAccent } from "./color";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { buildPublicPayload, defaultPublicKeys } from "./share";

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
          // cardView + tier are client-only preferences (not part of the
          // Supabase row), so always carry over whatever's saved locally.
          const localProfile = loadProfile();
          if (isEmpty) {
            try {
              await saveProfileCloud(supabase, u.id, localProfile);
            } catch {
              /* table may not exist yet — falls back to local saves */
            }
            if (active) setProfile(localProfile);
          } else if (active) {
            setProfile({ ...cloud, cardView: localProfile.cardView, tier: localProfile.tier });
          }
          // resolve the user's claimed handle (source of truth is the registry)
          const handle = await getMyUsername(supabase, u.id).catch(() => "");
          if (active && handle) {
            setProfile((p) => ({ ...p, data: { ...p.data, username: handle } }));
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
        // Always mirror to localStorage too — it's the source of truth for
        // purely client-side preferences (like cardView) that aren't part of
        // the Supabase row, and it's a handy offline cache besides.
        saveProfile(profile);
        try {
          await saveProfileCloud(supabase, user.id, profile);
          setSaveStatus("saved");
          setLastSavedAt(Date.now());
          // Keep the public copy in sync while sharing is on. The public link
          // is the user's handle, so publishing requires one.
          if (profile.data.share.enabled && profile.data.username) {
            await publishPublicProfile(
              supabase,
              user.id,
              profile.data.username,
              buildPublicPayload(profile)
            ).catch(() => {});
          }
        } catch {
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

  const toggleCardView = useCallback(() => {
    setProfile((p) => ({
      ...p,
      cardView: p.cardView === "grouped" ? "detailed" : "grouped",
    }));
  }, []);

  // ---- tier (testing toggle; real billing would set this server-side) ------
  const setTier = useCallback((tier: Profile["tier"]) => {
    setProfile((p) => ({ ...p, tier }));
  }, []);

  // ---- avatar library ------------------------------------------------------
  // Every generation is added here; standard keeps the 3 most recent, premium
  // keeps 20. Adding does NOT change the active avatar — the user picks that.
  const addToLibrary = useCallback((dataUrl: string) => {
    setProfile((p) => {
      const cap = AVATAR_LIMITS[p.tier];
      const avatars = [dataUrl, ...p.data.avatars.filter((a) => a !== dataUrl)].slice(0, cap);
      return { ...p, data: { ...p.data, avatars } };
    });
  }, []);

  const setActiveAvatar = useCallback((dataUrl: string) => {
    setProfile((p) => ({ ...p, data: { ...p.data, photoDataUrl: dataUrl } }));
  }, []);

  const removeAvatar = useCallback((dataUrl: string) => {
    setProfile((p) => {
      const avatars = p.data.avatars.filter((a) => a !== dataUrl);
      const photoDataUrl =
        p.data.photoDataUrl === dataUrl ? avatars[0] ?? null : p.data.photoDataUrl;
      return { ...p, data: { ...p.data, avatars, photoDataUrl } };
    });
  }, []);

  // ---- custom fields + categories (premium) --------------------------------
  const addCustomField = useCallback((categoryKey: string) => {
    const field: CustomField = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: "New detail",
      emoji: "✨",
      value: "",
      categoryKey,
      visible: true,
    };
    setProfile((p) => ({
      ...p,
      data: { ...p.data, customFields: [...p.data.customFields, field] },
    }));
    return field.id;
  }, []);

  const updateCustomField = useCallback(
    (id: string, patch: Partial<CustomField>) => {
      setProfile((p) => ({
        ...p,
        data: {
          ...p.data,
          customFields: p.data.customFields.map((f) =>
            f.id === id ? { ...f, ...patch } : f
          ),
        },
      }));
    },
    []
  );

  const removeCustomField = useCallback((id: string) => {
    setProfile((p) => ({
      ...p,
      data: { ...p.data, customFields: p.data.customFields.filter((f) => f.id !== id) },
    }));
  }, []);

  const addCustomCategory = useCallback(() => {
    const cat: CustomCategory = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: "New Category",
      emoji: "🗂️",
    };
    setProfile((p) => ({
      ...p,
      data: { ...p.data, customCategories: [...p.data.customCategories, cat] },
    }));
    return cat.id;
  }, []);

  const updateCustomCategory = useCallback(
    (id: string, patch: Partial<CustomCategory>) => {
      setProfile((p) => ({
        ...p,
        data: {
          ...p.data,
          customCategories: p.data.customCategories.map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
        },
      }));
    },
    []
  );

  // ---- usernames / handles -------------------------------------------------
  const checkUsername = useCallback(
    async (name: string) => {
      const supabase = getSupabase();
      if (!supabase || !user) return false;
      return isUsernameAvailable(supabase, name, user.id).catch(() => false);
    },
    [user]
  );

  const claimUsername = useCallback(
    async (name: string): Promise<string | null> => {
      const supabase = getSupabase();
      if (!supabase || !user) return "Sign in required";
      const err = await claimUsernameCloud(supabase, user.id, name);
      if (!err) {
        setProfile((p) => ({
          ...p,
          data: { ...p.data, username: name.toLowerCase().trim() },
        }));
      }
      return err;
    },
    [user]
  );

  // ---- public sharing ------------------------------------------------------
  const enableSharing = useCallback(() => {
    setProfile((p) => {
      const publicKeys = p.data.share.publicKeys.length
        ? p.data.share.publicKeys
        : defaultPublicKeys(p);
      return {
        ...p,
        data: { ...p.data, share: { slug: p.data.username, enabled: true, publicKeys } },
      };
    });
  }, []);

  const disableSharing = useCallback(async () => {
    setProfile((p) => ({
      ...p,
      data: { ...p.data, share: { ...p.data.share, enabled: false } },
    }));
    const supabase = getSupabase();
    if (supabase && user) await unpublishPublicProfile(supabase, user.id).catch(() => {});
  }, [user]);

  const toggleShareKey = useCallback((key: string) => {
    setProfile((p) => {
      const set = new Set(p.data.share.publicKeys);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...p, data: { ...p.data, share: { ...p.data.share, publicKeys: [...set] } } };
    });
  }, []);

  const removeCustomCategory = useCallback((id: string) => {
    setProfile((p) => ({
      ...p,
      data: {
        ...p.data,
        // also drop any fields that lived in the removed category
        customCategories: p.data.customCategories.filter((c) => c.id !== id),
        customFields: p.data.customFields.filter((f) => f.categoryKey !== `cat:${id}`),
      },
    }));
  }, []);

  const setPosition = useCallback((key: string, pos: Pos) => {
    setProfile((p) => ({ ...p, positions: { ...p.positions, [key]: pos } }));
  }, []);

  // Drop a single card's manual placement so it snaps back to its default
  // auto-arranged slot (double-click on the card).
  const clearPosition = useCallback((key: string) => {
    setProfile((p) => {
      const next = { ...p.positions };
      delete next[key];
      return { ...p, positions: next };
    });
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
    toggleCardView,
    setTier,
    addToLibrary,
    setActiveAvatar,
    removeAvatar,
    addCustomField,
    updateCustomField,
    removeCustomField,
    addCustomCategory,
    updateCustomCategory,
    removeCustomCategory,
    enableSharing,
    disableSharing,
    toggleShareKey,
    checkUsername,
    claimUsername,
    setPosition,
    clearPosition,
    resetPositions,
    restorePositions,
    signInEmail,
    signInGoogle,
    signOut,
  };
}
