-- thisisme — Phase 3b: custom handles / usernames
-- Run this in Supabase → SQL Editor → New query → Run.
--
-- A public registry mapping a unique handle to a user. Public read is needed
-- so the app can (a) check whether a handle is available and (b) resolve a
-- public link /p/<handle> to a user. Only the owner can claim/change/remove
-- their own handle.

create table if not exists public.usernames (
  username    text primary key,
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.usernames enable row level security;

create policy "anyone can read usernames"
  on public.usernames for select
  using (true);

create policy "owner can claim username"
  on public.usernames for insert
  with check (auth.uid() = user_id);

create policy "owner can change username"
  on public.usernames for update
  using (auth.uid() = user_id);

create policy "owner can release username"
  on public.usernames for delete
  using (auth.uid() = user_id);
