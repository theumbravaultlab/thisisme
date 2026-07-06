-- thisisme — Phase 4c: switch avatar metering from lifetime/daily to MONTHLY
-- Run this in Supabase → SQL Editor → New query → Run.
--
-- The avatar generation caps moved to a monthly model:
--   signed-in free — 3 stylized generations per calendar month
--   premium        — 20 stylized generations per calendar month
-- "Keep as is" (pure background removal) is cheap and no longer metered at all.
--
-- This adds the two columns the server now writes. The old total_gens/day/
-- day_gens columns are left in place (harmless, just no longer used) so this
-- migration is safe to run on an existing avatar_usage table.

alter table public.avatar_usage
  add column if not exists month       text,          -- 'YYYY-MM' the count is for
  add column if not exists month_gens  int not null default 0;  -- count within `month`
