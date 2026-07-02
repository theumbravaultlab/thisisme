@AGENTS.md

# thisisme — project context

Personal-profile web app: a floating card "HUD" of your stats arranged around a
central AI-generated avatar, with public shareable links. Owner is
non-technical / vibe-coding — explain plainly and validate with lint + build
before committing.

## Stack
Next.js 16 (App Router, Turbopack) · React 19 · Tailwind v4 · `motion` ·
Supabase (`@supabase/supabase-js`) · fal.ai (avatars) · `sharp`.
Secrets in `.env.local` (gitignored): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `FAL_KEY` (all set). Supabase project ref
`ofjkyetyiwgptandizmn`.

## Data model
One `Profile` (`src/lib/types.ts`): `data` (all stats + `avatars`,
`customFields`, `customCategories`, `share`, `username`), `visibility`,
`positions`, `theme`, `cardView`, `tier`. Persistence in `src/lib/store.ts`:
localStorage when signed out, Supabase `profiles.data` jsonb when signed in
(`useProfile` overlays client-only `cardView` + `tier`). Bumping `STORAGE_KEY`
(currently v10) resets local profiles.

## Built so far
- **Phase 1:** stats HUD; grouped vs detailed card views (header toggle);
  Customize side panel; drag + collision-avoided cards; light/dark liquid glass.
- **Phase 2:** AI avatars (`src/app/api/avatar/route.ts`): BiRefNet bg-removal →
  sharp composite on clean backdrop → FLUX img2img → BiRefNet again so the FINAL
  avatar is a **transparent PNG cut-out** (shown frameless in `Silhouette`).
  4 realism styles in `src/lib/avatar.ts` (Hyperrealistic, Cinematic, HDR
  Realism, Photorealism), each with its own prompt + `guidanceScale`. Intensity
  is a 3-stop slider (Low/Balanced/High = strength 0.25/0.45/0.62), defaults
  Balanced. Free local canvas fallback if no `FAL_KEY`. Avatar library
  auto-saves each gen (cap 3 standard / 20 premium). ~3 fal calls per gen.
- **Premium tier:** header Standard/Premium **testing** toggle (stands in for
  billing; `tier` is client-only for now). Gates: avatar-library cap, custom
  dropdown values (Favorite Animal/Relationship/Religion), custom fields +
  categories, premium fonts, no-branding footer.
- **Phase 3 sharing:** public read-only page at `/p/<handle>`
  (`src/app/p/[slug]`). Separate `public_profiles` table holds only the
  public-safe subset (anon-read RLS, owner-only writes) — private data never
  enters it. `usernames` registry table for unique handles; handle
  auto-defaults to name+suffix on sign-in, changeable in Share. ShareModal:
  master public toggle + per-field public checkboxes (Contact Info off by
  default). Per-profile OG image. Contributions were declined.

## Supabase — user must run (SQL Editor)
`supabase/schema.sql`, `supabase/phase3_public_profiles.sql`,
`supabase/phase3b_usernames.sql`.

## Dev workflow (Windows)
- Start/restart: Bash `cd /c/thisisme && (npm run dev > /tmp/thisisme-dev.log 2>&1 &)`
- Kill node: PowerShell `Get-Process node | Stop-Process -Force` (env changes need a restart).
- Always `npm run lint` + `npm run build` (type-check) before committing; commit each milestone.
- Browser isn't clickable at this tier — validate via lint/build and by reading generated image files.

## Likely next
Phase 4 (monetization / yearly "Wrapped" recap), or wiring the avatar into the
per-profile OG share image.
