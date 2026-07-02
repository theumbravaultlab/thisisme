"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/useProfile";
import { stylizeImage, AVATAR_PRESETS, type AvatarPreset } from "@/lib/avatar";
import { AVATAR_LIMITS } from "@/lib/types";
import { track } from "@/lib/analytics";

export default function AvatarStudio() {
  const {
    profile,
    hydrated,
    setTier,
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
  const [strength, setStrength] = useState<number>(AVATAR_PRESETS[0].strength);
  const [removeBg, setRemoveBg] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSource = source ?? (hydrated ? profile.data.photoDataUrl : null);

  const choosePreset = (p: AvatarPreset) => {
    setPreset(p);
    setStrength(p.strength);
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
    setBusy(true);
    setError(null);
    track("avatar_generate", { preset: preset.key, strength });
    try {
      const res = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: effectiveSource,
          prompt: preset.prompt,
          strength,
          guidanceScale: preset.guidanceScale,
          color: profile.data.favoriteColor,
          removeBg,
        }),
      });
      const data = await res.json();
      const finalImage = data.image
        ? data.image
        : await stylizeImage(effectiveSource, {
            color: profile.data.favoriteColor,
            style: preset.stylizer,
          });
      setResult(finalImage);
      addToLibrary(finalImage); // auto-saved to the library (tier-capped)
    } catch {
      setError("Couldn't generate — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const applyAndGoHome = (dataUrl: string) => {
    setActiveAvatar(dataUrl);
    track("avatar_applied", { preset: preset.key });
    router.push("/");
  };

  const isCartoon = preset.key === "cartoon";
  const intensityLabel = isCartoon
    ? strength <= 0.35
      ? "Subtle (stays you)"
      : strength >= 0.65
      ? "Bold (cartoon)"
      : "Balanced"
    : strength <= 0.25
    ? "Subtle touch-up"
    : strength >= 0.45
    ? "Strong makeover"
    : "Balanced";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">✨ AI Avatar</h1>
        <Link href="/" className="text-sm text-fg-muted transition hover:text-fg">
          ← Back
        </Link>
      </div>

      <p className="mb-6 text-sm text-fg-muted">
        Turn a photo into an avatar. We cut out the background and put you on a
        clean backdrop first, then either cartoon-ify you or give you a polished,
        elevated version of yourself. Every generation is saved to your library
        ({library.length}/{cap}).
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

          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">Intensity</span>
              <span className="text-accent">{intensityLabel}</span>
            </div>
            <input
              type="range"
              min={0.15}
              max={0.95}
              step={0.05}
              value={strength}
              onChange={(e) => setStrength(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-accent"
            />
          </div>

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

          <button
            onClick={generate}
            disabled={!effectiveSource || busy}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Generating…" : result ? "Regenerate" : "Generate avatar"}
          </button>

          {result && (
            <button
              onClick={() => applyAndGoHome(result)}
              className="rounded-xl border border-accent px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/10"
            >
              Use as my profile avatar
            </button>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>

      {/* avatar library */}
      {library.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Your avatars</h2>
            <span className="text-xs text-fg-muted">
              {library.length}/{cap} saved
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {library.map((a) => {
              const active = a === profile.data.photoDataUrl;
              return (
                <div key={a} className="group relative aspect-square">
                  <button
                    onClick={() => setActiveAvatar(a)}
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
      )}

      {/* premium nudge on the library cap */}
      {!premium && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/5 px-4 py-3 text-sm">
          <span>
            <span className="font-semibold">★ Premium</span> keeps up to{" "}
            {AVATAR_LIMITS.premium} avatars (Standard keeps {AVATAR_LIMITS.standard}).
          </span>
          <button
            onClick={() => setTier("premium")}
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
    </main>
  );
}
