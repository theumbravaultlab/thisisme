-- thisisme — Phase 3: public shareable profiles
-- Run this in Supabase → SQL Editor → New query → Run.
--
-- This table holds ONLY the public-safe subset of a profile (whatever the
-- owner chose to share). Anyone can read it (that's the point of a public
-- link); only the owner can write their own row. Private data stays in the
-- `profiles` table, which is not readable by anyone but its owner.

create table if not exists public.public_profiles (
  slug        text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  payload     jsonb not null,
  updated_at  timestamptz not null default now()
);

-- One public page per user.
create unique index if not exists public_profiles_user_id_idx
  on public.public_profiles (user_id);

alter table public.public_profiles enable row level security;

-- Anyone (including logged-out visitors) can read a public profile.
create policy "anyone can read public profiles"
  on public.public_profiles for select
  using (true);

-- Only the owner can create / update / remove their own public row.
create policy "owner can insert public profile"
  on public.public_profiles for insert
  with check (auth.uid() = user_id);

create policy "owner can update public profile"
  on public.public_profiles for update
  using (auth.uid() = user_id);

create policy "owner can delete public profile"
  on public.public_profiles for delete
  using (auth.uid() = user_id);
