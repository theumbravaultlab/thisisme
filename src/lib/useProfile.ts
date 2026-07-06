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
  blankProfileData,
  loadProfile,
  saveProfile,
  loadProfileCloud,
  saveProfileCloud,
  publishPublicProfile,
  unpublishPublicProfile,
  getMyUsername,
  claimUsername as claimUsernameCloud,
  isUsernameAvailable,
  fetchEntitlement,
  saveSnapshotCloud,
  listSnapshotsCloud,
  deleteSnapshotCloud,
  type ProfileSnapshot,
  type SnapshotBody,
} from "./store";
import { readableAccent } from "./color";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { deleteAvatarByUrl } from "./avatarStorage";
import { buildPublicPayload, generateHandle } from "./share";

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
          // Resolve the user's handle (registry is source of truth). If they
          // don't have one yet, auto-assign name + a unique suffix — no forced
          // prompt; they can change it later from Share.
          let handle = await getMyUsername(supabase, u.id).catch(() => "");
          if (!handle) {
            const nameForHandle = loadProfile().data.name;
            for (let i = 0; i < 4 && !handle; i++) {
              const candidate = generateHandle(nameForHandle);
              const err = await claimUsernameCloud(supabase, u.id, candidate).catch(() => "x");
              if (!err) handle = candidate;
            }
          }
          if (active && handle) {
            setProfile((p) => ({ ...p, data: { ...p.data, username: handle } }));
          }
          // Premium is server-authoritative — read it from the entitlements
          // table and upgrade the (default-standard) tier if they've paid.
          try {
            const prem = await fetchEntitlement(supabase, u.id);
            if (active && prem) setProfile((p) => ({ ...p, tier: "premium" }));
          } catch {
            /* no entitlements row / table yet → stays standard */
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
            // Bust the cached public page so the edit shows right away (the ISR
            // window is only a fallback). Best-effort.
            try {
              const {
                data: { session },
              } = await supabase.auth.getSession();
              const token = session?.access_token;
              if (token) {
                await fetch("/api/revalidate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ slug: profile.data.username }),
                }).catch(() => {});
              }
            } catch {
              /* ignore */
            }
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

  // Apply a one-tap preset: show exactly `fields` (+ always name), hide the
  // rest. Premium-only fields are never auto-enabled here.
  const applyVisibilityPreset = useCallback((fields: FieldKey[]) => {
    setProfile((p) => {
      const on = new Set<FieldKey>([...fields, "name"]);
      const visibility = {} as Profile["visibility"];
      (Object.keys(p.visibility) as FieldKey[]).forEach((k) => {
        visibility[k] = on.has(k);
      });
      return { ...p, visibility };
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setProfile((p) => ({ ...p, theme: p.theme === "dark" ? "light" : "dark" }));
  }, []);

  // Clear the seeded demo to a blank canvas for a new user starting from
  // scratch. Keeps the default visibility preset; resets any card positions.
  const startFresh = useCallback(() => {
    setProfile((p) => ({ ...p, data: blankProfileData(), positions: {} }));
  }, []);

  const toggleCardView = useCallback(() => {
    setProfile((p) => ({
      ...p,
      cardView: p.cardView === "grouped" ? "detailed" : "grouped",
    }));
  }, []);

  // ---- premium / billing ---------------------------------------------------
  // Re-reads the entitlement from the server and syncs the tier. Used after a
  // returning checkout (?upgraded=1) so premium reflects as soon as the webhook
  // has processed the payment.
  const refreshEntitlement = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !user) return;
    try {
      const prem = await fetchEntitlement(supabase, user.id);
      setProfile((p) => ({ ...p, tier: prem ? "premium" : "standard" }));
    } catch {
      /* ignore */
    }
  }, [user]);

  // Starts a Lemon Squeezy checkout for the signed-in user and redirects there.
  // Returns { error: "sign-in-required" } if they're not signed in (premium is
  // tied to an account), or another error string on failure.
  const startCheckout = useCallback(async (): Promise<{ error: string | null }> => {
    const supabase = getSupabase();
    if (!supabase || !user) return { error: "sign-in-required" };
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return { error: "sign-in-required" };
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (json.url) {
        window.location.href = json.url;
        return { error: null };
      }
      return { error: json.error || "Could not start checkout." };
    } catch {
      return { error: "Could not start checkout." };
    }
  }, [user]);

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

  // Persists immediately (local always, cloud right away if signed in) rather
  // than waiting for the debounced/effect-based save below. Picking an avatar
  // navigates straight to "/", which mounts its own fresh useProfile() there —
  // without this, that page can read stale data before the save lands.
  const setActiveAvatar = useCallback(
    async (dataUrl: string | null) => {
      const next: Profile = { ...profile, data: { ...profile.data, photoDataUrl: dataUrl } };
      setProfile(next);
      saveProfile(next);
      const supabase = getSupabase();
      if (supabase && user) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        await saveProfileCloud(supabase, user.id, next).catch(() => {});
      }
    },
    [profile, user]
  );

  // ---- version history (Phase 5, premium) ----------------------------------
  const saveSnapshot = useCallback(
    async (label?: string): Promise<{ error: string | null }> => {
      const supabase = getSupabase();
      if (!supabase || !user) return { error: "sign-in-required" };
      if (profile.tier !== "premium") return { error: "premium-required" };
      try {
        await saveSnapshotCloud(supabase, user.id, label?.trim() || null, {
          data: profile.data,
          visibility: profile.visibility,
          positions: profile.positions,
        });
        return { error: null };
      } catch {
        return { error: "Couldn't save this version." };
      }
    },
    [user, profile]
  );

  const listSnapshots = useCallback(async (): Promise<ProfileSnapshot[]> => {
    const supabase = getSupabase();
    if (!supabase || !user) return [];
    return listSnapshotsCloud(supabase, user.id).catch(() => []);
  }, [user]);

  // Restore an old version into the live profile (the normal save flow persists it).
  const restoreSnapshot = useCallback((body: SnapshotBody) => {
    setProfile((p) => ({
      ...p,
      data: { ...body.data },
      visibility: { ...body.visibility },
      positions: { ...(body.positions ?? {}) },
    }));
  }, []);

  const deleteSnapshot = useCallback(
    async (id: string) => {
      const supabase = getSupabase();
      if (!supabase || !user) return;
      await deleteSnapshotCloud(supabase, id).catch(() => {});
    },
    [user]
  );

  const removeAvatar = useCallback(
    (dataUrl: string) => {
      setProfile((p) => {
        const avatars = p.data.avatars.filter((a) => a !== dataUrl);
        const photoDataUrl =
          p.data.photoDataUrl === dataUrl ? avatars[0] ?? null : p.data.photoDataUrl;
        return { ...p, data: { ...p.data, avatars, photoDataUrl } };
      });
      // Best-effort: delete the underlying Storage file if this was a stored URL.
      const supabase = getSupabase();
      if (supabase && user) deleteAvatarByUrl(supabase, dataUrl).catch(() => {});
    },
    [user]
  );

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
  // Sharing has no separate curation step — buildPublicPayload (in share.ts)
  // mirrors whatever's currently visible on the profile, live, every time the
  // public row is written. Enabling just flips the switch on.
  const enableSharing = useCallback(() => {
    setProfile((p) => ({
      ...p,
      data: { ...p.data, share: { slug: p.data.username, enabled: true } },
    }));
  }, []);

  const disableSharing = useCallback(async () => {
    setProfile((p) => ({
      ...p,
      data: { ...p.data, share: { ...p.data.share, enabled: false } },
    }));
    const supabase = getSupabase();
    if (supabase && user) await unpublishPublicProfile(supabase, user.id).catch(() => {});
  }, [user]);

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

  // ---- account: data export + deletion (GDPR/CCPA) -------------------------
  // Download everything the user has entered as a single JSON file. Works
  // signed in or out — it just serializes the currently-loaded profile.
  const exportData = useCallback(() => {
    const payload = {
      app: "thisisme",
      exportedAt: new Date().toISOString(),
      account: { email: user?.email ?? null, tier: profile.tier },
      profile: {
        data: profile.data,
        visibility: profile.visibility,
        positions: profile.positions,
        theme: profile.theme,
        cardView: profile.cardView,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `thisisme-${profile.data.username || "profile"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  }, [user, profile]);

  // Permanently delete the account + all server data (via /api/account/delete,
  // which cascades), then wipe local traces and sign out. Irreversible.
  const deleteAccount = useCallback(async (): Promise<{ error: string | null }> => {
    const supabase = getSupabase();
    if (!supabase || !user) return { error: "You're not signed in." };
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return { error: "You're not signed in." };
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        return { error: j.error || "Couldn't delete your account. Please try again." };
      }
      // Clear every local trace so nothing of the deleted account lingers.
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("thisisme:"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        /* ignore */
      }
      await supabase.auth.signOut().catch(() => {});
      return { error: null };
    } catch {
      return { error: "Couldn't delete your account. Please try again." };
    }
  }, [user]);

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
    applyVisibilityPreset,
    toggleTheme,
    toggleCardView,
    startFresh,
    refreshEntitlement,
    startCheckout,
    addToLibrary,
    setActiveAvatar,
    removeAvatar,
    saveSnapshot,
    listSnapshots,
    restoreSnapshot,
    deleteSnapshot,
    addCustomField,
    updateCustomField,
    removeCustomField,
    addCustomCategory,
    updateCustomCategory,
    removeCustomCategory,
    enableSharing,
    disableSharing,
    checkUsername,
    claimUsername,
    setPosition,
    clearPosition,
    resetPositions,
    restorePositions,
    signInEmail,
    signInGoogle,
    signOut,
    exportData,
    deleteAccount,
  };
}
