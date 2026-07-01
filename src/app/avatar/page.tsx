"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/useProfile";
import { stylizeImage, AVATAR_PRESETS, type AvatarPreset } from "@/lib/avatar";
import { track } from "@/lib/analytics";

export default function AvatarStudio() {
  const { profile, hydrated, updateData } = useProfile();
  const router = useRouter();

  const [source, setSource] = useState<string | null>(null);
  const [preset, setPreset] = useState<AvatarPreset>(AVATAR_PRESETS[0]);
  const [prompt, setPrompt] = useState<string>(AVATAR_PRESETS[0].prompt);
  const [strength, setStrength] = useState<number>(AVATAR_PRESETS[0].strength);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSource = source ?? (hydrated ? profile.data.photoDataUrl : null);

  const choosePreset = (p: AvatarPreset) => {
    setPreset(p);
    setPrompt(p.prompt);
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
          prompt,
          strength,
          color: profile.data.favoriteColor,
        }),
      });
      const data = await res.json();
      if (data.image) {
        setResult(data.image); // real model result
      } else {
        // free demo path — stylize locally with the preset's look
        const styled = await stylizeImage(effectiveSource, {
          color: profile.data.favoriteColor,
          style: preset.stylizer,
        });
        setResult(styled);
      }
    } catch {
      setError("Couldn't generate — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const useAsAvatar = () => {
    if (!result) return;
    updateData("photoDataUrl", result);
    track("avatar_applied", { preset: preset.key });
    router.push("/");
  };

  const intensityLabel =
    strength <= 0.35 ? "Subtle (stays you)" : strength >= 0.65 ? "Bold (restyled)" : "Balanced";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">✨ AI Avatar</h1>
        <Link href="/" className="text-sm text-fg-muted transition hover:text-fg">
          ← Back
        </Link>
      </div>

      <p className="mb-6 text-sm text-fg-muted">
        Turn a photo into an AI portrait. Pick a starting look, then tweak the
        description and intensity to control exactly what the model does.
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
            <p className="mb-2 text-sm font-medium">Starting look</p>
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
            <label className="mb-1 block text-sm font-medium">
              Describe what you want
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="e.g. same person, better lighting and shading, natural, high quality"
            />
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
            <p className="mt-1 text-xs text-fg-muted">
              Lower keeps your likeness; higher lets the model restyle more.
            </p>
          </div>

          <button
            onClick={generate}
            disabled={!effectiveSource || busy}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Generating…" : result ? "Regenerate" : "Generate avatar"}
          </button>

          {result && (
            <button
              onClick={useAsAvatar}
              className="rounded-xl border border-accent px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/10"
            >
              Use as my profile avatar
            </button>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>
    </main>
  );
}
