"use client";

import { HexColorPicker } from "react-colorful";
import {
  FieldKey,
  ProfileData,
  RELATIONSHIP_OPTIONS,
  RELIGION_OPTIONS,
  MBTI_OPTIONS,
  SPIRIT_ANIMAL_OPTIONS,
  SEASON_OPTIONS,
  FONT_OPTIONS,
  fontVar,
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
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  return `${ft}'${inch}" · ${cm} cm`;
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
      return (
        <DateInput
          value={data.birthday}
          onChange={(v) => update("birthday", v)}
        />
      );

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
          <Slider
            min={1940}
            max={CURRENT_YEAR}
            value={data.birthYear ?? 1998}
            onChange={(v) => update("birthYear", v)}
            format={(v) => `${v} · age ${CURRENT_YEAR - v}`}
          />
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
      return (
        <div className="flex flex-col items-center gap-3">
          <HexColorPicker
            color={data.favoriteColor}
            onChange={(v) => update("favoriteColor", v)}
            style={{ width: "100%" }}
          />
          <code className="rounded bg-bg px-2 py-1 text-sm">{data.favoriteColor}</code>
        </div>
      );

    case "mindset":
      return (
        <TextInput
          value={data.mindset}
          onChange={(v) => update("mindset", v)}
          placeholder="Focused. Adaptive. Relentless."
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

    case "favoriteSeason":
      return (
        <Select
          value={data.favoriteSeason}
          onChange={(v) => update("favoriteSeason", v)}
          options={SEASON_OPTIONS}
          allowCustom={false}
        />
      );

    case "favoriteDrink":
      return (
        <TextInput
          value={data.favoriteDrink}
          onChange={(v) => update("favoriteDrink", v)}
          placeholder="e.g. Iced oat latte"
        />
      );

    case "movieSnack":
      return (
        <TextInput
          value={data.movieSnack}
          onChange={(v) => update("movieSnack", v)}
          placeholder="e.g. Buttered popcorn"
        />
      );

    case "dreamDestination":
      return (
        <TextInput
          value={data.dreamDestination}
          onChange={(v) => update("dreamDestination", v)}
          placeholder="Where do you dream of going?"
        />
      );

    case "mbti":
      return (
        <Select
          value={data.mbti}
          onChange={(v) => update("mbti", v)}
          options={MBTI_OPTIONS}
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
          placeholder="Add an achievement"
        />
      );

    case "moviesAndShows":
      return (
        <ListEditor
          items={data.moviesAndShows}
          onChange={(v) => update("moviesAndShows", v)}
          placeholder="Add a movie or show"
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

    case "phone":
      return (
        <TextInput
          value={data.phone}
          onChange={(v) => update("phone", v)}
          placeholder="e.g. (555) 123-4567"
        />
      );

    case "email":
      return (
        <TextInput
          value={data.email}
          onChange={(v) => update("email", v)}
          placeholder="you@email.com"
        />
      );

    case "instagram":
      return (
        <TextInput
          value={data.instagram}
          onChange={(v) => update("instagram", v)}
          placeholder="@handle"
        />
      );

    case "address":
      return (
        <TextInput
          value={data.address}
          onChange={(v) => update("address", v)}
          placeholder="City, State"
        />
      );
  }
}
