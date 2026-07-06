// Compact single-line text for a field, used inside consolidated category
// cards (as opposed to CardBody's full editors or the old big per-field HUD).

import { FieldKey, ProfileData, zodiacFromBirthday } from "./types";
import { formatAge } from "./store";

function formatBirthday(iso: string): string {
  if (!iso) return "";
  const [, m, d] = iso.split("-").map(Number);
  if (!m || !d) return "";
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[m - 1]} ${d}`;
}

// Shared by the compact card text and the CardBody slider label.
export function introExtroLabel(v: number): string {
  if (v <= 20) return "Introvert";
  if (v < 45) return "Introvert-leaning";
  if (v <= 55) return "Ambivert";
  if (v < 80) return "Extrovert-leaning";
  return "Extrovert";
}

export function fieldToText(field: FieldKey, data: ProfileData): string {
  switch (field) {
    case "age": {
      // A set birthday is the source of truth for age; fall back to birthYear.
      const year = data.birthday ? Number(data.birthday.slice(0, 4)) : data.birthYear;
      return formatAge(year, data.ageDisplayMode);
    }
    case "birthday":
      return formatBirthday(data.birthday);
    case "zodiac":
      return zodiacFromBirthday(data.birthday); // auto-derived from birthday
    case "introExtro":
      return introExtroLabel(data.introExtro);
    case "achievements":
      return data.achievements.join(" · ");
    case "bucketList":
      return data.bucketList.join(" · ");
    case "spotifyTopSongs":
      return data.spotifyTopSongs.join(" · ");
    case "hobbies":
      return data.hobbies.join(" · ");
    default: {
      // Every remaining field is a plain string value on ProfileData.
      const v = (data as unknown as Record<string, unknown>)[field];
      return typeof v === "string" ? v : "";
    }
  }
}
