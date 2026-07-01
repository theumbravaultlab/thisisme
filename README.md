# thisisme

Customize a profile that shows the real you, your way. AI-generated avatar +
auto-arranging stat cards you can selectively show, hide, and share.

## Status

- **Phase 1 — External stats UI** ✅ (this build)
- **Phase 2 — AI avatar from photo** — stubbed at `/avatar`
- **Phase 3 — Shareable links + permissions** — stubbed at `/share`
- **Phase 4 — Premium, gifting & yearly "wrapped"** — planned

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## What works now (Phase 1)

- Ten stat cards: name, photo, age (5-yr range **or** exact), height, favorite
  color, achievements, movies & TV, top songs (manual), religion, relationship.
- **Edit mode** (top-right ✏️) to fill everything in; **Done** to preview.
- **Show/hide per card** — hidden cards drop into a tray and the masonry layout
  rearranges itself with a spring animation.
- **Favorite color** drives the whole accent theme, live.
- **Light / dark toggle** (🌙 / ☀️).
- Everything saves to `localStorage` — no backend needed yet.

## Architecture

| Path | Role |
|---|---|
| `src/lib/types.ts` | Profile data model, field registry & display metadata |
| `src/lib/store.ts` | Load/save (localStorage today) + age formatting. **Swap these for Supabase in Phase 1.5.** |
| `src/lib/useProfile.ts` | State hook: persistence + applies theme/accent to `<html>` |
| `src/components/ProfileGrid.tsx` | Masonry grid, reflow animation, hidden-cards tray |
| `src/components/CardBody.tsx` | Per-field view/edit rendering |
| `src/components/ui.tsx` | Inputs, list editor, chip list |
| `src/app/page.tsx` | Home (edit/preview) |
| `src/app/avatar`, `src/app/share` | Phase 2 / 3 stubs |

## Wiring Supabase (next step)

The persistence boundary is intentionally tiny. To go from local-only to real
accounts, you only touch **`src/lib/store.ts`** and **`src/lib/useProfile.ts`**:

1. Create a `profiles` table mirroring the `Profile` shape (a `jsonb data`
   column, a `jsonb visibility` column, a `theme` text column, plus `user_id`).
2. Replace `loadProfile` / `saveProfile` with Supabase `select` / `upsert`.
3. Add Supabase email magic-link auth; key the row on the signed-in user.
4. Move the photo from a base64 data URL to Supabase Storage.

Tech: Next.js 16 (App Router) · React 19 · Tailwind v4 · motion · react-colorful.
