-- thisisme — Phase 5: premium profile version history
-- Run this in Supabase → SQL Editor → New query → Run.
--
-- Stores point-in-time snapshots of a user's profile so premium users can look
-- back year over year (and restore an old version). Owner-only access.

create table if not exists public.profile_snapshots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  label       text,
  snapshot    jsonb not null, -- { data, visibility, positions }
  created_at  timestamptz not null default now()
);

create index if not exists profile_snapshots_user_created_idx
  on public.profile_snapshots (user_id, created_at desc);

alter table public.profile_snapshots enable row level security;

create policy "read own snapshots"
  on public.profile_snapshots for select
  using (auth.uid() = user_id);

create policy "create own snapshots"
  on public.profile_snapshots for insert
  with check (auth.uid() = user_id);

create policy "delete own snapshots"
  on public.profile_snapshots for delete
  using (auth.uid() = user_id);
