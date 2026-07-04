-- thisisme — Phase 4: premium entitlements (real billing)
-- Run this in Supabase → SQL Editor → New query → Run.
--
-- This table is the SINGLE SOURCE OF TRUTH for whether a user is premium.
-- It lives in its OWN table (not on `profiles`) on purpose: a user can write
-- their own `profiles` row, so putting the premium flag there would let them
-- grant themselves premium. Here, users can only READ their own row — there is
-- deliberately NO insert/update/delete policy, so the ONLY thing that can flip
-- `is_premium` is the billing webhook, which uses the service_role key and
-- bypasses RLS. That's what makes premium un-fakeable.

create table if not exists public.entitlements (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  is_premium  boolean not null default false,
  order_id    text,
  provider    text,
  updated_at  timestamptz not null default now()
);

alter table public.entitlements enable row level security;

-- A user may read ONLY their own entitlement (so the app can show their tier).
create policy "read own entitlement"
  on public.entitlements for select
  using (auth.uid() = user_id);

-- NOTE: intentionally no insert/update/delete policies. The webhook writes with
-- the service_role key, which bypasses RLS. Never expose that key to the client.
