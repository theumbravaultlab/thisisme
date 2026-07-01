// Core data model for a "This Is Me" profile.
// Shaped to anticipate later phases: per-field visibility (Phase 3 sharing)
// and a stable field registry (Phase 4 yearly snapshots).

export type AgeDisplayMode = "range" | "exact";
export type ThemePreference = "light" | "dark";
// "grouped" = one card per Customize category. "detailed" = every stat its
// own card.
export type CardView = "grouped" | "detailed";

export interface ProfileData {
  // identity
  name: string;
  nameFont: string; // font key from FONT_OPTIONS (styles the name title)
  photoDataUrl: string | null;

  ageDisplayMode: AgeDisplayMode;
  birthYear: number | null;
  birthday: string; // YYYY-MM-DD

  height: string;
  favoriteColor: string;

  // personality / vibe
  mindset: string; // short tagline, e.g. "Focused. Adaptive. Relentless."
  mbti: string;
  favoriteAnimal: string;

  // life
  relationshipStatus: string;
  religion: string;
  achievements: string[];

  // favorites
  moviesAndShows: string[];
  spotifyTopSongs: string[];
  hobbies: string[];
  dreamDestination: string;
  favoriteDrink: string;
  movieSnack: string;
  favoriteSeason: string;

  // contact
  phone: string;
  email: string;
  instagram: string;
  address: string;
}

export interface FieldVisibility {
  name: boolean;
  photo: boolean;
  age: boolean;
  birthday: boolean;
  height: boolean;
  favoriteColor: boolean;
  mindset: boolean;
  mbti: boolean;
  favoriteAnimal: boolean;
  relationshipStatus: boolean;
  religion: boolean;
  achievements: boolean;
  moviesAndShows: boolean;
  spotifyTopSongs: boolean;
  hobbies: boolean;
  dreamDestination: boolean;
  favoriteDrink: boolean;
  movieSnack: boolean;
  favoriteSeason: boolean;
  phone: boolean;
  email: boolean;
  instagram: boolean;
  address: boolean;
}

export type FieldKey = keyof FieldVisibility;

export interface Pos {
  x: number;
  y: number;
}

// Positions are keyed by category title (each category floats as one card).
export interface Profile {
  data: ProfileData;
  visibility: FieldVisibility;
  theme: ThemePreference;
  cardView: CardView;
  positions: Partial<Record<string, Pos>>;
}

export const FIELD_META: Record<FieldKey, { label: string; emoji: string }> = {
  name: { label: "Name", emoji: "👋" },
  photo: { label: "Photo", emoji: "📸" },
  age: { label: "Age", emoji: "🎂" },
  birthday: { label: "Birthday", emoji: "🎈" },
  height: { label: "Height", emoji: "📏" },
  favoriteColor: { label: "Favorite Color", emoji: "🎨" },
  mindset: { label: "Mindset", emoji: "🧠" },
  mbti: { label: "Personality Type", emoji: "🧩" },
  favoriteAnimal: { label: "Favorite Animal", emoji: "🦊" },
  relationshipStatus: { label: "Relationship", emoji: "🤝" },
  religion: { label: "Religion", emoji: "🙏" },
  achievements: { label: "Achievements", emoji: "🏆" },
  moviesAndShows: { label: "Movies & TV", emoji: "🎬" },
  spotifyTopSongs: { label: "Top Songs", emoji: "🎧" },
  hobbies: { label: "Hobbies", emoji: "🎯" },
  dreamDestination: { label: "Dream Destination", emoji: "🌍" },
  favoriteDrink: { label: "Favorite Drink", emoji: "🥤" },
  movieSnack: { label: "Movie Theater Snack", emoji: "🍿" },
  favoriteSeason: { label: "Favorite Season", emoji: "📅" },
  phone: { label: "Phone Number", emoji: "📞" },
  email: { label: "Email", emoji: "✉️" },
  instagram: { label: "Instagram", emoji: "📷" },
  address: { label: "Address", emoji: "📍" },
};

// Stats grouped into categories — used to organize the Customize panel AND
// (as of the consolidated HUD) rendered as one combined card per category.
export const CATEGORIES: { title: string; emoji: string; fields: FieldKey[] }[] = [
  {
    title: "Basics",
    emoji: "🪪",
    fields: ["name", "photo", "age", "birthday", "height", "favoriteColor"],
  },
  {
    title: "Personality",
    emoji: "🧠",
    fields: ["mindset", "mbti", "favoriteAnimal"],
  },
  {
    title: "Life",
    emoji: "💬",
    fields: ["relationshipStatus", "religion", "achievements"],
  },
  {
    title: "Favorites",
    emoji: "⭐",
    fields: [
      "moviesAndShows",
      "spotifyTopSongs",
      "hobbies",
      "dreamDestination",
      "favoriteDrink",
      "movieSnack",
      "favoriteSeason",
    ],
  },
  {
    title: "Contact Info",
    emoji: "📇",
    fields: ["phone", "email", "instagram", "address"],
  },
];

// Selectable display fonts for the profile name. Keys map to CSS variables set
// in the root layout via next/font.
export const FONT_OPTIONS: { key: string; label: string; var: string }[] = [
  { key: "sans", label: "Clean Sans", var: "var(--font-geist-sans)" },
  { key: "serif", label: "Elegant Serif", var: "var(--font-serif)" },
  { key: "rounded", label: "Rounded", var: "var(--font-rounded)" },
  { key: "script", label: "Handwritten", var: "var(--font-script)" },
  { key: "display", label: "Bold Display", var: "var(--font-display)" },
  { key: "mono", label: "Monospace", var: "var(--font-geist-mono)" },
];

export function fontVar(key: string): string {
  return FONT_OPTIONS.find((f) => f.key === key)?.var ?? FONT_OPTIONS[0].var;
}

// Flat render order derived from the categories.
export const FIELD_ORDER: FieldKey[] = CATEGORIES.flatMap((c) => c.fields);

export function categoryOfField(field: FieldKey): string {
  return CATEGORIES.find((c) => c.fields.includes(field))?.title ?? "";
}

// Option lists for dropdowns.
export const RELATIONSHIP_OPTIONS = [
  "Single",
  "In a relationship",
  "Engaged",
  "Married",
  "It's complicated",
  "Prefer not to say",
];

export const RELIGION_OPTIONS = [
  "Christianity",
  "Islam",
  "Judaism",
  "Hinduism",
  "Buddhism",
  "Sikhism",
  "Spiritual",
  "Agnostic",
  "Atheist",
  "Prefer not to say",
];

export const SEASON_OPTIONS = ["🌸 Spring", "☀️ Summer", "🍂 Fall", "❄️ Winter"];

export const SPIRIT_ANIMAL_OPTIONS = [
  "🦊 Fox",
  "🐺 Wolf",
  "🦁 Lion",
  "🦉 Owl",
  "🐉 Dragon",
  "🐬 Dolphin",
  "🦋 Butterfly",
  "🐢 Turtle",
  "🦅 Eagle",
  "🐱 Cat",
  "🐶 Dog",
  "🐻 Bear",
  "🦈 Shark",
  "🦄 Unicorn",
];

export const MBTI_OPTIONS = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];
