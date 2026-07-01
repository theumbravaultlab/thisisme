-- thisisme — database schema
-- Run this in Supabase → SQL Editor → New query → Run.

-- One row per user. The whole profile is stored as JSON so the app's data
-- model can evolve without migrations. `id` matches the logged-in user's id.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  visibility  jsonb not null default '{}'::jsonb,
  positions   jsonb not null default '{}'::jsonb,
  theme       text  not null default 'dark',
  updated_at  timestamptz not null default now()
);

-- Row Level Security: a user can only see and change their OWN row.
alter table public.profiles enable row level security;

create policy "read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- When a new user signs up, create their empty profile row automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
