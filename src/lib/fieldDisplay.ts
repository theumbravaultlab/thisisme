// Compact single-line text for a field, used inside consolidated category
// cards (as opposed to CardBody's full editors or the old big per-field HUD).

import { FieldKey, ProfileData } from "./types";
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

export function fieldToText(field: FieldKey, data: ProfileData): string {
  switch (field) {
    case "age":
      return formatAge(data.birthYear, data.ageDisplayMode);
    case "birthday":
      return formatBirthday(data.birthday);
    case "height":
      return data.height;
    case "favoriteColor":
      return data.favoriteColor;
    case "mindset":
      return data.mindset;
    case "mbti":
      return data.mbti;
    case "favoriteAnimal":
      return data.favoriteAnimal;
    case "relationshipStatus":
      return data.relationshipStatus;
    case "religion":
      return data.religion;
    case "achievements":
      return data.achievements.join(" · ");
    case "moviesAndShows":
      return data.moviesAndShows.join(" · ");
    case "spotifyTopSongs":
      return data.spotifyTopSongs.join(" · ");
    case "hobbies":
      return data.hobbies.join(" · ");
    case "dreamDestination":
      return data.dreamDestination;
    case "favoriteDrink":
      return data.favoriteDrink;
    case "movieSnack":
      return data.movieSnack;
    case "favoriteSeason":
      return data.favoriteSeason;
    case "phone":
      return data.phone;
    case "email":
      return data.email;
    case "instagram":
      return data.instagram;
    case "address":
      return data.address;
    default:
      return "";
  }
}
