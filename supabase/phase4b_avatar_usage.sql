-- thisisme — Phase 4b: per-account avatar generation metering
-- Run this in Supabase → SQL Editor → New query → Run.
--
-- Tracks how many AI avatars each signed-in user has generated so the server
-- can enforce the free (lifetime total) and premium (per-day) caps. Like
-- entitlements, users can READ their own row but only the server (service role)
-- writes it — the count can't be tampered with from the client.

create table if not exists public.avatar_usage (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  total_gens  int not null default 0,   -- lifetime count (free cap)
  day         date,                      -- the day day_gens is counting
  day_gens    int not null default 0,    -- count for `day` (premium daily cap)
  updated_at  timestamptz not null default now()
);

alter table public.avatar_usage enable row level security;

create policy "read own avatar usage"
  on public.avatar_usage for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies: only the service-role avatar route writes.
