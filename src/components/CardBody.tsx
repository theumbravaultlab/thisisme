"use client";

import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import {
  FieldKey,
  ProfileData,
  FIELD_META,
  RELATIONSHIP_OPTIONS,
  RELIGION_OPTIONS,
  SPIRIT_ANIMAL_OPTIONS,
  SEASON_OPTIONS,
  LOVE_LANGUAGE_OPTIONS,
  ENNEAGRAM_OPTIONS,
  PRONOUN_OPTIONS,
  COLOR_PRESETS,
  FONT_OPTIONS,
  fontVar,
  zodiacFromBirthday,
} from "@/lib/types";
import { DateInput, ListEditor, Select, Slider, TextInput } from "./ui";

interface Props {
  field: FieldKey;
  data: ProfileData;
  editing: boolean;
  premium?: boolean;
  update: <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => void;
}

const CURRENT_YEAR = new Date().getFullYear();

// Height is stored as a friendly string; we keep a cm value under the hood
// for the slider and reformat on change.
function parseCm(s: string): number {
  const cm = s.match(/(\d{2,3})\s*cm/i);
  if (cm) return Number(cm[1]);
  const ftin = s.match(/(\d)\s*['’]\s*(\d{1,2})/);
  if (ftin) return Math.round((Number(ftin[1]) * 12 + Number(ftin[2])) * 2.54);
  const n = s.match(/\d{2,3}/);
  return n ? Number(n[0]) : 178;
}
function formatHeight(cm: number): string {
  const totalIn = Math.round(cm / 2.54);
  let ft = Math.floor(totalIn / 12);
  let inch = totalIn - ft * 12;
  if (inch === 12) {
    ft += 1;
    inch = 0;
  }
  return `${ft}'${inch}" · ${cm} cm`;
}

function introExtroLabel(v: number): string {
  if (v <= 20) return "Introvert";
  if (v < 45) return "Introvert-leaning";
  if (v <= 55) return "Ambivert";
  if (v < 80) return "Extrovert-leaning";
  return "Extrovert";
}

// CardBody is rendered in edit mode inside the Customize panel.
export function CardBody({ field, data, update, premium = false }: Props) {
  switch (field) {
    case "name":
      return (
        <div className="flex flex-col gap-3">
          <TextInput
            value={data.name}
            onChange={(v) => update("name", v)}
            placeholder="Preferred name"
          />
          <div>
            <label className="mb-1 block text-xs text-fg-muted">Name font</label>
            <div className="grid grid-cols-2 gap-2">
              {FONT_OPTIONS.map((f) => {
                const locked = f.premium && !premium;
                return (
                  <button
                    key={f.key}
                    onClick={() => !locked && update("nameFont", f.key)}
                    disabled={locked}
                    title={locked ? "Premium font" : undefined}
                    style={{ fontFamily: fontVar(f.key) }}
                    className={`flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-base transition ${
                      data.nameFont === f.key
                        ? "border-accent bg-accent/15 text-fg"
                        : "border-border text-fg-muted"
                    } ${locked ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    {f.label}
                    {locked && <span className="text-xs">🔒</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );

    case "birthday":
      return <DateInput value={data.birthday} onChange={(v) => update("birthday", v)} />;

    case "zodiac": {
      const sign = zodiacFromBirthday(data.birthday);
      return (
        <div className="rounded-lg border border-border bg-bg px-3 py-2 text-sm">
          {sign ? (
            <span>
              {sign} <span className="text-fg-muted">· auto-set from your birthday</span>
            </span>
          ) : (
            <span className="text-fg-muted">Set your birthday to reveal your sign.</span>
          )}
        </div>
      );
    }

    case "age":
      return (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            {(["range", "exact"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => update("ageDisplayMode", mode)}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-sm transition ${
                  data.ageDisplayMode === mode
                    ? "border-accent bg-accent/15 text-fg"
                    : "border-border text-fg-muted"
                }`}
              >
                {mode === "range" ? "5-yr range" : "Exact"}
              </button>
            ))}
          </div>
          {data.birthday ? (
            <p className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg-muted">
              Age {CURRENT_YEAR - Number(data.birthday.slice(0, 4))} — calculated from your birthday.
            </p>
          ) : (
            // Slider is in AGE (left = younger, right = older); we store the
            // implied birth year under the hood.
            <Slider
              min={13}
              max={100}
              value={CURRENT_YEAR - (data.birthYear ?? 1998)}
              onChange={(age) => update("birthYear", CURRENT_YEAR - age)}
              format={(age) => `${age} years old`}
            />
          )}
        </div>
      );

    case "height":
      return (
        <Slider
          min={140}
          max={215}
          value={parseCm(data.height)}
          onChange={(v) => update("height", formatHeight(v))}
          format={formatHeight}
        />
      );

    case "favoriteColor":
      return <ColorField value={data.favoriteColor} onChange={(v) => update("favoriteColor", v)} />;

    case "pronouns":
      return (
        <Select
          value={data.pronouns}
          onChange={(v) => update("pronouns", v)}
          options={PRONOUN_OPTIONS}
          allowCustom={false}
        />
      );

    case "introExtro":
      return (
        <Slider
          min={0}
          max={100}
          value={data.introExtro}
          onChange={(v) => update("introExtro", v)}
          format={introExtroLabel}
        />
      );

    case "favoriteAnimal":
      return (
        <Select
          value={data.favoriteAnimal}
          onChange={(v) => update("favoriteAnimal", v)}
          options={SPIRIT_ANIMAL_OPTIONS}
          allowCustom={premium}
        />
      );

    case "loveLanguage":
      return (
        <Select
          value={data.loveLanguage}
          onChange={(v) => update("loveLanguage", v)}
          options={LOVE_LANGUAGE_OPTIONS}
          allowCustom={false}
        />
      );

    case "enneagram":
      return (
        <Select
          value={data.enneagram}
          onChange={(v) => update("enneagram", v)}
          options={ENNEAGRAM_OPTIONS}
          allowCustom={false}
        />
      );

    case "favoriteSeason":
      return (
        <Select
          value={data.favoriteSeason}
          onChange={(v) => update("favoriteSeason", v)}
          options={SEASON_OPTIONS}
          allowCustom={false}
        />
      );

    case "relationshipStatus":
      return (
        <Select
          value={data.relationshipStatus}
          onChange={(v) => update("relationshipStatus", v)}
          options={RELATIONSHIP_OPTIONS}
          allowCustom={premium}
        />
      );

    case "religion":
      return (
        <Select
          value={data.religion}
          onChange={(v) => update("religion", v)}
          options={RELIGION_OPTIONS}
          allowCustom={premium}
        />
      );

    case "achievements":
      return (
        <ListEditor
          items={data.achievements}
          onChange={(v) => update("achievements", v)}
          placeholder="Something you're proud of"
        />
      );

    case "bucketList":
      return (
        <ListEditor
          items={data.bucketList}
          onChange={(v) => update("bucketList", v)}
          placeholder="Add a bucket-list item"
        />
      );

    case "spotifyTopSongs":
      return (
        <ListEditor
          items={data.spotifyTopSongs}
          onChange={(v) => update("spotifyTopSongs", v)}
          placeholder="Artist – Song"
        />
      );

    case "hobbies":
      return (
        <ListEditor
          items={data.hobbies}
          onChange={(v) => update("hobbies", v)}
          placeholder="Add a hobby"
        />
      );

    default: {
      // Every remaining field is a plain single-line text value.
      const k = field as keyof ProfileData;
      const val = (data as unknown as Record<string, unknown>)[k];
      return (
        <TextInput
          value={typeof val === "string" ? val : ""}
          onChange={(v) => update(k, v as ProfileData[typeof k])}
          placeholder={FIELD_META[field].label}
        />
      );
    }
  }
}

// Color picker with a "Simple" (popular swatches) and "Hex" (full picker) mode.
function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isPreset = COLOR_PRESETS.some((c) => c.hex.toLowerCase() === value.toLowerCase());
  const [mode, setMode] = useState<"simple" | "hex">(isPreset ? "simple" : "hex");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {(["simple", "hex"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-lg border px-3 py-1.5 text-sm transition ${
              mode === m ? "border-accent bg-accent/15 text-fg" : "border-border text-fg-muted"
            }`}
          >
            {m === "simple" ? "Simple" : "Hex"}
          </button>
        ))}
      </div>

      {mode === "simple" ? (
        <div className="grid grid-cols-8 gap-2">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c.hex}
              title={c.name}
              aria-label={c.name}
              onClick={() => onChange(c.hex)}
              style={{ background: c.hex }}
              className={`aspect-square rounded-full ring-2 transition ${
                value.toLowerCase() === c.hex.toLowerCase()
                  ? "ring-accent"
                  : "ring-border/40 hover:ring-border"
              }`}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <HexColorPicker color={value} onChange={onChange} style={{ width: "100%" }} />
          <code className="rounded bg-bg px-2 py-1 text-sm">{value}</code>
        </div>
      )}
    </div>
  );
}
