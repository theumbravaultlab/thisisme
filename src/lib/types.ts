// Core data model for a "This Is Me" profile.
// Shaped to anticipate later phases: per-field visibility (Phase 3 sharing)
// and a stable field registry (Phase 4 yearly snapshots).

export type AgeDisplayMode = "range" | "exact";
export type ThemePreference = "light" | "dark";
// "grouped" = one card per Customize category. "detailed" = every stat its
// own card.
export type CardView = "grouped" | "detailed";

// Subscription tier. (Toggled locally for now; would be server-authoritative
// once real billing exists.)
export type Tier = "standard" | "premium";

// How many generated avatars each tier keeps in the library.
export const AVATAR_LIMITS: Record<Tier, number> = { standard: 3, premium: 20 };

// How many STYLIZED avatar generations each stage gets (each one is a real
// fal.ai cost, so this both protects the API budget and is the natural upgrade
// trigger). "Keep as is" (pure background removal) is cheap and NOT metered —
// it's unlimited on every tier.
//   anon            — one taste before sign-in (client-gated; per-IP backstop)
//   freePerMonth    — signed-in free account, resets each calendar month
//   premiumPerMonth — premium, resets each calendar month (abundant, but the
//                     monthly cap keeps a one-time $9 from going underwater)
export const AVATAR_GEN_LIMITS = { anon: 1, freePerMonth: 3, premiumPerMonth: 20 } as const;

// A premium-only user-defined stat, e.g. "Favorite Fruit".
export interface CustomField {
  id: string;
  label: string;
  emoji: string;
  value: string;
  categoryKey: string; // a built-in category title, or "cat:<id>" for a custom one
  visible: boolean;
}

// A premium-only user-defined category the custom fields can live under.
export interface CustomCategory {
  id: string;
  title: string;
  emoji: string;
}

export const customCatKey = (id: string) => `cat:${id}`;
export const customFieldCardKey = (id: string) => `cf:${id}`;

export interface ProfileData {
  // identity
  name: string;
  username: string; // claimed handle → public link is /p/<username>
  nameFont: string; // font key from FONT_OPTIONS (styles the name title)
  photoDataUrl: string | null;

  ageDisplayMode: AgeDisplayMode;
  birthYear: number | null;
  birthday: string; // YYYY-MM-DD

  height: string;
  favoriteColor: string;
  basedIn: string; // public city, e.g. "Austin, TX"
  languages: string; // "English, Spanish"
  whatIDo: string; // occupation / "what I do"

  // personality / vibe
  mindset: string; // "Words I Live By" — e.g. "Focused. Adaptive. Relentless."
  introExtro: number; // 0 = fully introvert, 100 = fully extrovert
  favoriteAnimal: string;
  loveLanguage: string;
  enneagram: string;
  toxicTrait: string;
  romanEmpire: string; // the thing you think about way too often
  greenFlag: string;
  redFlag: string;
  hottestTake: string;

  // life
  relationshipStatus: string;
  religion: string;
  bibleVerse: string; // only shown when religion is "Christianity"
  achievements: string[]; // "My Proudest Achievement"
  currentlyObsessed: string;
  pets: string; // "Milo (golden retriever)"
  bucketList: string[];
  bornIn: string; // "Where I Was Born"
  education: string;
  cause: string; // "A Cause I Care About"

  // favorites
  comfortShow: string; // the one you rewatch
  spotifyTopSongs: string[]; // "On Repeat"
  hobbies: string[];
  favoriteFood: string;
  favoriteBook: string;
  guiltyPleasure: string;
  favoriteGame: string;
  favoriteSportsTeam: string;
  favoriteDrink: string;
  favoriteSeason: string;

  // contact / socials
  phone: string;
  email: string;
  instagram: string;
  tiktok: string;
  snapchat: string;
  twitter: string;
  linkedin: string;
  youtube: string;
  twitch: string;
  discord: string;
  website: string;

  // avatar library (generated avatars the user can switch between)
  avatars: string[];

  // premium: user-defined stats + categories
  customFields: CustomField[];
  customCategories: CustomCategory[];

  // public sharing (Phase 3)
  share: ShareSettings;

  // ISO timestamp of the last save — shown as "Updated …" near the name.
  updatedAt: string;
}

export interface ShareSettings {
  slug: string; // "" until first published
  enabled: boolean; // is the public link live
}

export interface FieldVisibility {
  name: boolean;
  age: boolean;
  birthday: boolean;
  height: boolean;
  basedIn: boolean;
  languages: boolean;
  whatIDo: boolean;
  favoriteColor: boolean;
  mindset: boolean;
  introExtro: boolean;
  favoriteAnimal: boolean;
  loveLanguage: boolean;
  enneagram: boolean;
  toxicTrait: boolean;
  romanEmpire: boolean;
  greenFlag: boolean;
  redFlag: boolean;
  hottestTake: boolean;
  relationshipStatus: boolean;
  religion: boolean;
  bibleVerse: boolean;
  achievements: boolean;
  currentlyObsessed: boolean;
  pets: boolean;
  bucketList: boolean;
  bornIn: boolean;
  education: boolean;
  cause: boolean;
  comfortShow: boolean;
  spotifyTopSongs: boolean;
  hobbies: boolean;
  favoriteFood: boolean;
  favoriteBook: boolean;
  guiltyPleasure: boolean;
  favoriteGame: boolean;
  favoriteSportsTeam: boolean;
  favoriteDrink: boolean;
  favoriteSeason: boolean;
  phone: boolean;
  email: boolean;
  instagram: boolean;
  tiktok: boolean;
  snapchat: boolean;
  twitter: boolean;
  linkedin: boolean;
  youtube: boolean;
  twitch: boolean;
  discord: boolean;
  website: boolean;
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
  tier: Tier;
  positions: Partial<Record<string, Pos>>;
}

export const FIELD_META: Record<FieldKey, { label: string; emoji: string; premium?: boolean }> = {
  name: { label: "Name", emoji: "👋" },
  age: { label: "Age", emoji: "🎂" },
  birthday: { label: "Birthday", emoji: "🎈" },
  height: { label: "Height", emoji: "📏" },
  basedIn: { label: "Based In", emoji: "📍" },
  languages: { label: "Languages", emoji: "🗣️" },
  whatIDo: { label: "What I Do", emoji: "💼" },
  favoriteColor: { label: "Favorite Color", emoji: "🎨" },
  mindset: { label: "Words I Live By", emoji: "🧭" },
  introExtro: { label: "Introvert / Extrovert", emoji: "🔋" },
  favoriteAnimal: { label: "Favorite Animal", emoji: "🦊" },
  loveLanguage: { label: "Love Language", emoji: "💞" },
  enneagram: { label: "Enneagram", emoji: "🔢" },
  toxicTrait: { label: "My Toxic Trait", emoji: "☠️" },
  romanEmpire: { label: "My Roman Empire", emoji: "🏛️" },
  greenFlag: { label: "Green Flag", emoji: "🟢" },
  redFlag: { label: "Red Flag", emoji: "🚩" },
  hottestTake: { label: "My Hottest Take", emoji: "🔥" },
  relationshipStatus: { label: "Relationship", emoji: "🤝" },
  religion: { label: "Religion", emoji: "🙏" },
  bibleVerse: { label: "Favorite Bible Verse", emoji: "✝️" },
  achievements: { label: "My Proudest Achievement", emoji: "🏆" },
  currentlyObsessed: { label: "Currently Obsessed With", emoji: "🤩" },
  pets: { label: "Pets", emoji: "🐾" },
  bucketList: { label: "Bucket List", emoji: "🪣" },
  bornIn: { label: "Where I Was Born", emoji: "🌱" },
  education: { label: "Education", emoji: "🎓" },
  cause: { label: "A Cause I Care About", emoji: "🎗️" },
  comfortShow: { label: "Comfort Show", emoji: "📺" },
  spotifyTopSongs: { label: "On Repeat", emoji: "🎧" },
  hobbies: { label: "Hobbies", emoji: "🎯" },
  favoriteFood: { label: "Favorite Food", emoji: "🍜" },
  favoriteBook: { label: "Favorite Book", emoji: "📚" },
  guiltyPleasure: { label: "Guilty Pleasure", emoji: "🙈" },
  favoriteGame: { label: "Favorite Game", emoji: "🎮" },
  favoriteSportsTeam: { label: "Favorite Team", emoji: "🏟️" },
  favoriteDrink: { label: "Favorite Drink", emoji: "🥤" },
  favoriteSeason: { label: "Favorite Season", emoji: "📅" },
  phone: { label: "Phone Number", emoji: "📞" },
  email: { label: "Email", emoji: "✉️" },
  instagram: { label: "Instagram", emoji: "📷" },
  tiktok: { label: "TikTok", emoji: "🎵" },
  snapchat: { label: "Snapchat", emoji: "👻" },
  twitter: { label: "X / Twitter", emoji: "🐦" },
  linkedin: { label: "LinkedIn", emoji: "🔗" },
  youtube: { label: "YouTube", emoji: "▶️" },
  twitch: { label: "Twitch", emoji: "🟣" },
  discord: { label: "Discord", emoji: "💬" },
  website: { label: "Website", emoji: "🌐" },
};

// Stats grouped into categories — used to organize the Customize panel AND
// (as of the consolidated HUD) rendered as one combined card per category.
export const CATEGORIES: { title: string; emoji: string; fields: FieldKey[] }[] = [
  {
    title: "Identity",
    emoji: "🪪",
    fields: [
      "name", "birthday", "age",
      "height", "basedIn", "languages", "whatIDo", "favoriteColor",
    ],
  },
  {
    title: "Personality",
    emoji: "🧠",
    fields: [
      "mindset", "introExtro", "favoriteAnimal", "loveLanguage", "enneagram",
      "toxicTrait", "romanEmpire", "greenFlag", "redFlag", "hottestTake",
    ],
  },
  {
    title: "Life",
    emoji: "💬",
    fields: [
      "relationshipStatus", "religion", "bibleVerse", "achievements", "currentlyObsessed",
      "pets", "bucketList", "bornIn", "education", "cause",
    ],
  },
  {
    title: "Favorites",
    emoji: "⭐",
    fields: [
      "comfortShow", "spotifyTopSongs", "hobbies", "favoriteFood", "favoriteBook",
      "guiltyPleasure", "favoriteGame", "favoriteSportsTeam", "favoriteDrink", "favoriteSeason",
    ],
  },
  {
    title: "Contact Info",
    emoji: "📇",
    fields: [
      "phone", "email", "instagram", "tiktok", "snapchat",
      "twitter", "linkedin", "youtube", "twitch", "discord", "website",
    ],
  },
];

// Selectable display fonts for the profile name. Keys map to CSS variables set
// in the root layout via next/font.
export const FONT_OPTIONS: {
  key: string;
  label: string;
  var: string;
  premium?: boolean;
}[] = [
  { key: "sans", label: "Clean Sans", var: "var(--font-geist-sans)" },
  { key: "serif", label: "Elegant Serif", var: "var(--font-serif)" },
  { key: "rounded", label: "Rounded", var: "var(--font-rounded)" },
  { key: "mono", label: "Monospace", var: "var(--font-geist-mono)" },
  { key: "script", label: "Handwritten", var: "var(--font-script)", premium: true },
  { key: "display", label: "Bold Display", var: "var(--font-display)", premium: true },
];

export function fontVar(key: string): string {
  return FONT_OPTIONS.find((f) => f.key === key)?.var ?? FONT_OPTIONS[0].var;
}

// Flat render order derived from the categories.
export const FIELD_ORDER: FieldKey[] = CATEGORIES.flatMap((c) => c.fields);

export function categoryOfField(field: FieldKey): string {
  return CATEGORIES.find((c) => c.fields.includes(field))?.title ?? "";
}

// Some fields are conditional — only relevant given another answer. A field
// that doesn't apply is hidden from the Customize panel and never rendered on
// the HUD or public page. (Favorite Bible Verse only makes sense for Christians.)
export function fieldApplies(field: FieldKey, data: ProfileData): boolean {
  if (field === "bibleVerse") return data.religion === "Christianity";
  return true;
}

// Option lists for dropdowns.
export const RELATIONSHIP_OPTIONS = [
  "Single",
  "In a relationship",
  "Engaged",
  "Married",
  "It's complicated",
  "Other",
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
  "Other",
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

export const LOVE_LANGUAGE_OPTIONS = [
  "Words of Affirmation",
  "Quality Time",
  "Physical Touch",
  "Acts of Service",
  "Receiving Gifts",
];

export const ENNEAGRAM_OPTIONS = [
  "1 · The Reformer",
  "2 · The Helper",
  "3 · The Achiever",
  "4 · The Individualist",
  "5 · The Investigator",
  "6 · The Loyalist",
  "7 · The Enthusiast",
  "8 · The Challenger",
  "9 · The Peacemaker",
];

// Popular colors for the "Simple" color picker (name shown on hover).
export const COLOR_PRESETS: { hex: string; name: string }[] = [
  { hex: "#ef4444", name: "Red" },
  { hex: "#f97316", name: "Orange" },
  { hex: "#f59e0b", name: "Amber" },
  { hex: "#eab308", name: "Yellow" },
  { hex: "#22c55e", name: "Green" },
  { hex: "#14b8a6", name: "Teal" },
  { hex: "#06b6d4", name: "Cyan" },
  { hex: "#3b82f6", name: "Blue" },
  { hex: "#7c5cff", name: "Violet" },
  { hex: "#a855f7", name: "Purple" },
  { hex: "#ec4899", name: "Pink" },
  { hex: "#f43f5e", name: "Rose" },
  { hex: "#8b5e34", name: "Brown" },
  { hex: "#64748b", name: "Slate" },
  { hex: "#111827", name: "Black" },
  { hex: "#f8fafc", name: "White" },
];

// One-tap visibility presets — turn a curated set of fields on and everything
// else off, so a fresh user isn't overwhelmed by every stat.
export const VISIBILITY_PRESETS: {
  key: string;
  label: string;
  desc: string;
  emoji: string;
  fields: FieldKey[];
}[] = [
  {
    key: "connect",
    label: "Connect",
    emoji: "🤝",
    desc: "Professional — just the essentials to reach you.",
    fields: ["whatIDo", "basedIn", "languages", "email", "phone", "linkedin", "website", "instagram"],
  },
  {
    key: "intro",
    label: "Get to Know Me",
    emoji: "👋",
    desc: "A friendly intro for someone you just met.",
    fields: [
      "birthday", "age", "basedIn", "whatIDo", "mindset", "favoriteAnimal",
      "loveLanguage", "hobbies", "favoriteFood", "comfortShow", "currentlyObsessed",
      "pets", "instagram",
    ],
  },
  {
    key: "unfiltered",
    label: "Unfiltered",
    emoji: "🙃",
    desc: "TMI — all the personality and favorites.",
    fields: [
      "mindset", "introExtro", "favoriteAnimal", "loveLanguage", "enneagram",
      "toxicTrait", "romanEmpire", "greenFlag", "redFlag", "hottestTake",
      "relationshipStatus", "currentlyObsessed", "pets", "bucketList",
      "comfortShow", "spotifyTopSongs", "hobbies", "favoriteFood", "favoriteBook",
      "guiltyPleasure", "favoriteGame", "favoriteSportsTeam", "favoriteDrink", "favoriteSeason",
    ],
  },
];
