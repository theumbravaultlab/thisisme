"use client";

// Value renderer for the glass HUD cards, styled after the reference:
// big bold values, a palette strip for the color, an equalizer for songs,
// progress bars for energy.

import { FieldKey, ProfileData } from "@/lib/types";
import { formatAge } from "@/lib/store";
import { shades, contrastText } from "@/lib/color";

export function HudValue({ field, data }: { field: FieldKey; data: ProfileData }) {
  switch (field) {
    case "age":
      return <Big>{formatAge(data.birthYear, data.ageDisplayMode)}</Big>;

    case "birthday":
      return <Big>{formatBirthday(data.birthday)}</Big>;

    case "height":
      return <Big>{data.height || "—"}</Big>;

    case "favoriteColor":
      return (
        <div className="flex flex-col gap-2">
          {/* filled chip: background is the color, text flips black/white to stay legible */}
          <code
            className="inline-block w-fit rounded-md px-2 py-1 text-base font-bold ring-1 ring-fg/20"
            style={{
              background: data.favoriteColor,
              color: contrastText(data.favoriteColor),
            }}
          >
            {data.favoriteColor}
          </code>
          <div className="flex gap-1.5">
            {shades(data.favoriteColor).map((c) => (
              <span
                key={c}
                className="h-4 w-4 rounded-full ring-1 ring-fg/25"
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      );

    case "mindset":
      return (
        <p className="text-sm font-semibold uppercase tracking-wide">
          {data.mindset || "—"}
        </p>
      );

    case "energy":
      return <Meter value={data.energy} />;

    case "socialBattery":
      return <Meter value={data.socialBattery} />;

    case "mbti":
      return <Big>{data.mbti || "—"}</Big>;

    case "favoriteAnimal":
      return <Big>{data.favoriteAnimal || "—"}</Big>;

    case "favoriteSeason":
      return <Big>{data.favoriteSeason || "—"}</Big>;

    case "currentObsession":
      return <p className="text-base font-bold leading-tight">{data.currentObsession || "—"}</p>;

    case "dreamDestination":
      return <p className="text-base font-bold leading-tight">{data.dreamDestination || "—"}</p>;

    case "favoriteDrink":
      return <p className="text-base font-bold leading-tight">{data.favoriteDrink || "—"}</p>;

    case "movieSnack":
      return <p className="text-base font-bold leading-tight">{data.movieSnack || "—"}</p>;

    case "favoriteMeal":
      return <p className="text-base font-bold leading-tight">{data.favoriteMeal || "—"}</p>;

    case "relationshipStatus":
      return <p className="text-base font-semibold">{data.relationshipStatus || "—"}</p>;

    case "religion":
      return <p className="text-base font-semibold">{data.religion || "—"}</p>;

    case "achievements":
      return <CompactList items={data.achievements} prefix="🏆" />;

    case "hobbies":
      return <Chips items={data.hobbies} />;

    case "moviesAndShows":
      return <Chips items={data.moviesAndShows} />;

    case "spotifyTopSongs":
      return (
        <div className="flex flex-col gap-1.5">
          {data.spotifyTopSongs[0] ? (
            <p className="text-base font-bold leading-tight">{data.spotifyTopSongs[0]}</p>
          ) : (
            <p className="text-sm text-fg-muted">Add a song</p>
          )}
          {data.spotifyTopSongs.slice(1, 3).map((s, i) => (
            <p key={i} className="truncate text-[11px] text-fg-muted">
              {i + 2}. {s}
            </p>
          ))}
        </div>
      );

    case "phone":
      return <p className="text-base font-bold leading-tight">{data.phone || "—"}</p>;

    case "email":
      return <p className="break-all text-base font-bold leading-tight">{data.email || "—"}</p>;

    case "instagram":
      return <p className="text-base font-bold leading-tight">{data.instagram || "—"}</p>;

    case "address":
      return <p className="text-base font-bold leading-tight">{data.address || "—"}</p>;

    default:
      return null;
  }
}

function Big({ children }: { children: React.ReactNode }) {
  return <p className="text-xl font-extrabold leading-tight tracking-tight">{children}</p>;
}

// "YYYY-MM-DD" → "March 14" (no year, avoids timezone drift).
function formatBirthday(iso: string): string {
  if (!iso) return "—";
  const [, m, d] = iso.split("-").map(Number);
  if (!m || !d) return "—";
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[m - 1]} ${d}`;
}

function Meter({ value }: { value: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Big>{value}%</Big>
      <div className="h-2 w-full overflow-hidden rounded-full bg-fg/15">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-[11px] text-fg-muted">—</p>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.slice(0, 4).map((m, i) => (
        <span key={i} className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px]">
          {m}
        </span>
      ))}
      {items.length > 4 && (
        <span className="text-[11px] text-fg-muted">+{items.length - 4}</span>
      )}
    </div>
  );
}

function CompactList({ items, prefix }: { items: string[]; prefix: string }) {
  if (items.length === 0) return <p className="text-[11px] text-fg-muted">—</p>;
  return (
    <ul className="flex flex-col gap-0.5">
      {items.slice(0, 3).map((it, i) => (
        <li key={i} className="flex gap-1 text-xs leading-tight">
          <span>{prefix}</span>
          <span className="truncate">{it}</span>
        </li>
      ))}
      {items.length > 3 && (
        <li className="text-[11px] text-fg-muted">+{items.length - 3} more</li>
      )}
    </ul>
  );
}
