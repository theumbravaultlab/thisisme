"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/useProfile";
import { getSupabase } from "@/lib/supabase";
import { AuthModal } from "@/components/AuthModal";
import {
  stylizeImage,
  shrinkDataUrl,
  AVATAR_PRESETS,
  INTENSITY_ORDER,
  DEFAULT_INTENSITY,
  type AvatarPreset,
  type IntensityLevel,
} from "@/lib/avatar";
import { AVATAR_LIMITS, AVATAR_GEN_LIMITS } from "@/lib/types";
import { track } from "@/lib/analytics";

export default function AvatarStudio() {
  const {
    profile,
    hydrated,
    user,
    startCheckout,
    signInEmail,
    signInGoogle,
    addToLibrary,
    setActiveAvatar,
    removeAvatar,
  } = useProfile();
  const router = useRouter();

  const premium = profile.tier === "premium";
  const cap = AVATAR_LIMITS[profile.tier];
  const library = profile.data.avatars;

  const [source, setSource] = useState<string | null>(null);
  const [preset, setPreset] = useState<AvatarPreset>(AVATAR_PRESETS[0]);
  const [level, setLevel] = useState<IntensityLevel>(DEFAULT_INTENSITY);
  const [removeBg, setRemoveBg] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [wasDemo, setWasDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  // Anonymous "taste" counter — the free-without-signing-in allowance. Signed-in
  // and premium limits are enforced authoritatively on the server.
  const [anonGens, setAnonGens] = useState(0);
  const [limitReason, setLimitReason] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnonGens(Number(localStorage.getItem("thisisme:anonAvatarGens") || "0"));
  }, []);

  const effectiveSource = source ?? (hydrated ? profile.data.photoDataUrl : null);
  const anonBlocked = !user && anonGens >= AVATAR_GEN_LIMITS.anon;

  const choosePreset = (p: AvatarPreset) => {
    setPreset(p);
    setLevel(DEFAULT_INTENSITY); // always default back to Balanced
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSource(reader.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const generate = async () => {
    if (!effectiveSource) return;
    // Anonymous taste used up → nudge to sign in before spending a request.
    if (anonBlocked) {
      setLimitReason("signin");
      setError("You've used your free avatar. Sign in to generate more — it's free.");
      setAuthOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    setLimitReason(null);
    // Map the visible Low/Balanced/High stop to this style's hidden strength.
    const strength = preset.strengths[level];
    track("avatar_generate", { preset: preset.key, level });
    try {
      // Attach the access token when signed in so the server can meter per
      // account (free vs premium) rather than treating it as anonymous.
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) {
        const {
          data: { session },
        } = (await getSupabase()?.auth.getSession()) ?? { data: { session: null } };
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      }
      const res = await fetch("/api/avatar", {
        method: "POST",
        headers,
        body: JSON.stringify({
          image: effectiveSource,
          prompt: preset.prompt,
          strength,
          guidanceScale: preset.guidanceScale,
          color: profile.data.favoriteColor,
          // "Keep as is" is a pure background removal, so it always cuts out.
          removeBg: preset.stylize ? removeBg : true,
          stylize: preset.stylize,
        }),
      });
      // 402 = generation limit hit (free used up / premium daily / anon → sign
      // in). Other non-OK = rate limit / oversized / bad request. Surface the
      // message instead of silently falling through to the local demo filter.
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({} as { error?: string; reason?: string }));
        setLimitReason(err.reason ?? null);
        setError(err.error || "Couldn't generate — please try again.");
        if (err.reason === "signin") setAuthOpen(true);
        return;
      }
      const data = await res.json();
      // The API falls back to { demo: true } (no `image`) whenever the model
      // key is missing or any fal.ai step errors. For a stylizing preset that
      // path uses a local color-filter that ignores the prompt entirely — so
      // flag it, otherwise a "successful" result may have nothing to do with
      // what you typed. (For "Keep as is" we just fall back to the untouched
      // photo instead of a filter.)
      setWasDemo(!data.image);
      const rawImage = data.image
        ? data.image
        : preset.stylize
        ? await stylizeImage(effectiveSource, {
            color: profile.data.favoriteColor,
            style: preset.stylizer,
          })
        : effectiveSource;
      // Shrink before it's ever stored — a full-res "Keep as is" cutout or a
      // fal.ai render can be several MB, and every library entry lives in the
      // localStorage profile blob (~5-10MB total quota).
      const finalImage = await shrinkDataUrl(rawImage);
      setResult(finalImage);
      addToLibrary(finalImage); // auto-saved to the library (tier-capped)
      // Count the anonymous taste locally (server meters signed-in accounts).
      if (!user && data.image) {
        const n = anonGens + 1;
        setAnonGens(n);
        localStorage.setItem("thisisme:anonAvatarGens", String(n));
      }
    } catch {
      setError("Couldn't generate — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const applyAndGoHome = async (
    dataUrl: string | null,
    source: "generated" | "library" | "default"
  ) => {
    await setActiveAvatar(dataUrl); // wait for the save to land before navigating
    track("avatar_applied", { preset: preset.key, source });
    router.push("/");
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">✨ My Avatar</h1>
        <Link href="/" className="text-sm text-fg-muted transition hover:text-fg">
          ← Back
        </Link>
      </div>

      <p className="mb-6 text-sm text-fg-muted">
        Turn a photo into a polished, realistic avatar. Pick a look, set the
        intensity, and we generate a clean cut-out of you. Every generation is
        saved to your library ({library.length}/{cap}).
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* preview + upload */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-bg-elev/40">
            {result ? (
              <Image src={result} alt="Generated avatar" fill sizes="400px" className="object-cover" unoptimized />
            ) : effectiveSource ? (
              <Image src={effectiveSource} alt="Your photo" fill sizes="400px" className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-fg-muted">
                <span className="text-4xl">📸</span>
                <span className="text-sm">Upload a photo to start</span>
              </div>
            )}
            {busy && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm text-white">
                Generating…
              </div>
            )}
          </div>

          <label className="cursor-pointer rounded-xl border border-border px-4 py-2 text-center text-sm transition hover:border-accent">
            {effectiveSource ? "Choose a different photo" : "Upload a photo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
        </div>

        {/* controls */}
        <div className="flex flex-col gap-4">
          {AVATAR_PRESETS.length > 1 && (
            <div>
              <p className="mb-2 text-sm font-medium">Style</p>
              <div className="grid grid-cols-2 gap-2">
                {AVATAR_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => choosePreset(p)}
                    className={`rounded-xl border px-3 py-2 text-sm transition ${
                      preset.key === p.key
                        ? "border-accent bg-accent/15 text-fg"
                        : "border-border text-fg-muted hover:border-accent"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!preset.stylize && (
            <p className="rounded-xl border border-border bg-bg-elev/40 px-3 py-2.5 text-xs text-fg-muted">
              Keeps your photo exactly as it is and just removes the background,
              leaving a clean cut-out of you — no AI restyling.
            </p>
          )}

          {preset.stylize && (
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium">Intensity</span>
                <span className="text-accent">
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={1}
                value={INTENSITY_ORDER.indexOf(level)}
                onChange={(e) => setLevel(INTENSITY_ORDER[Number(e.target.value)])}
                aria-label="Intensity"
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-accent"
              />
              <div className="mt-1 flex justify-between text-xs text-fg-muted">
                <span>Low</span>
                <span>Balanced</span>
                <span>High</span>
              </div>
            </div>
          )}

          {preset.stylize && (
            <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm">
              <span>
                Remove background
                <span className="ml-1.5 text-xs text-fg-muted">(clean backdrop)</span>
              </span>
              <input
                type="checkbox"
                checked={removeBg}
                onChange={(e) => setRemoveBg(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
            </label>
          )}

          <button
            onClick={generate}
            disabled={!effectiveSource || busy}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy
              ? "Working…"
              : !preset.stylize
              ? result
                ? "Redo"
                : "Remove background"
              : result
              ? "Regenerate"
              : "Generate avatar"}
          </button>

          {!busy && (
            <p className="text-center text-xs text-fg-muted">
              {premium
                ? `Premium — up to ${AVATAR_GEN_LIMITS.premiumPerDay} generations a day.`
                : user
                ? `Free plan — ${AVATAR_GEN_LIMITS.free} avatars total, then upgrade for more.`
                : `${Math.max(0, AVATAR_GEN_LIMITS.anon - anonGens)} free before signing in — sign in for ${AVATAR_GEN_LIMITS.free} total.`}
            </p>
          )}

          {result && (
            <button
              onClick={() => applyAndGoHome(result, "generated")}
              className="rounded-xl border border-accent px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/10"
            >
              Use as my profile avatar
            </button>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          {limitReason === "upgrade" && (
            <button
              onClick={async () => {
                const { error: e } = await startCheckout();
                if (e) setError(e === "sign-in-required" ? "Sign in to upgrade." : e);
              }}
              className="rounded-xl bg-gradient-to-r from-amber-400 to-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              ✨ Upgrade to Premium — $9
            </button>
          )}

          {result && wasDemo && preset.stylize && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              ⚠ Preview only — the AI model didn&apos;t run, so this is a local
              color filter that ignores your prompt. Check that FAL_KEY is set
              and try again.
            </p>
          )}
          {result && wasDemo && !preset.stylize && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              ⚠ Couldn&apos;t remove the background — showing your original photo
              unchanged. Check that FAL_KEY is set and try again.
            </p>
          )}
        </div>
      </div>

      {/* avatar library */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Your avatars</h2>
          <span className="text-xs text-fg-muted">
            {library.length}/{cap} saved
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {/* The blank default look is always available and can't be removed —
              it's the fallback silhouette, not a library entry. */}
          <div className="relative aspect-square">
            <button
              onClick={() => applyAndGoHome(null, "default")}
              className={`relative flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 bg-bg-elev/60 transition ${
                profile.data.photoDataUrl === null
                  ? "border-accent"
                  : "border-transparent hover:border-border"
              }`}
              aria-label={profile.data.photoDataUrl === null ? "Active avatar" : "Use default avatar"}
            >
              <span className="text-2xl text-fg-muted">🧑</span>
              <span className="text-[10px] text-fg-muted">Default</span>
              {profile.data.photoDataUrl === null && (
                <span className="absolute bottom-1 left-1 rounded-full bg-accent px-1.5 text-[10px] font-semibold text-white">
                  Active
                </span>
              )}
            </button>
          </div>

          {library.map((a) => {
              const active = a === profile.data.photoDataUrl;
              return (
                <div key={a} className="group relative aspect-square">
                  <button
                    onClick={() => applyAndGoHome(a, "library")}
                    className={`relative h-full w-full overflow-hidden rounded-xl border-2 transition ${
                      active ? "border-accent" : "border-transparent hover:border-border"
                    }`}
                    aria-label={active ? "Active avatar" : "Use this avatar"}
                  >
                    <Image src={a} alt="" fill sizes="120px" className="object-cover" unoptimized />
                    {active && (
                      <span className="absolute bottom-1 left-1 rounded-full bg-accent px-1.5 text-[10px] font-semibold text-white">
                        Active
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => removeAvatar(a)}
                    className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full border border-border bg-bg text-xs group-hover:flex"
                    aria-label="Remove avatar"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
        </div>
      </div>

      {/* premium nudge on the library cap */}
      {!premium && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/5 px-4 py-3 text-sm">
          <span>
            <span className="font-semibold">★ Premium</span> keeps up to{" "}
            {AVATAR_LIMITS.premium} avatars (Standard keeps {AVATAR_LIMITS.standard}).
          </span>
          <button
            onClick={async () => {
              if (!user) {
                setAuthOpen(true);
                return;
              }
              const { error } = await startCheckout();
              if (error) setError(error === "sign-in-required" ? "Sign in to upgrade." : error);
            }}
            className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
          >
            Upgrade
          </button>
        </div>
      )}

      <p className="mt-6 text-xs text-fg-muted">
        Background removal + AI stylization need a connected image model. Without
        one, this applies a free color-filter preview instead.
      </p>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        signInEmail={signInEmail}
        signInGoogle={signInGoogle}
      />
    </main>
  );
}
