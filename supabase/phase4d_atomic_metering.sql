-- thisisme — Phase 4d: atomic, shared-store avatar metering
-- Run this in Supabase → SQL Editor → New query → Run.
--
-- Fixes two limits that the in-memory rate limiter couldn't enforce on
-- serverless (each function instance had its own counter):
--   1. The signed-in MONTHLY cap now increments atomically under a row lock,
--      so concurrent requests can't slip past the cap (no check-then-count race).
--   2. The anonymous per-IP daily backstop now lives in the database (shared by
--      every instance) instead of per-instance memory.
--
-- The route calls these with the service_role key. Execution is revoked from
-- end-user roles because the functions mutate the counters (a user must never
-- be able to inflate someone else's usage via the auto-exposed RPC endpoint).

-- Per-IP (hashed) daily backstop for anonymous generations.
create table if not exists public.ip_usage (
  ip_hash    text not null,
  day        date not null,
  gens       int  not null default 0,
  updated_at timestamptz not null default now(),
  primary key (ip_hash, day)
);
alter table public.ip_usage enable row level security;
-- No policies: only the service-role backend (via the functions) writes it.

-- Atomically claim one monthly stylized generation for a signed-in user if
-- under the cap. The FOR UPDATE row lock serializes concurrent requests.
-- Returns true if allowed (and counted), false if the cap is already reached.
create or replace function public.claim_avatar_gen(p_user_id uuid, p_month text, p_cap int)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_month text;
  v_gens  int;
begin
  insert into public.avatar_usage (user_id, month, month_gens)
    values (p_user_id, p_month, 0)
    on conflict (user_id) do nothing;

  select month, month_gens into v_month, v_gens
    from public.avatar_usage where user_id = p_user_id for update;

  if v_month is distinct from p_month then
    v_gens := 0; -- counter resets on a new month
  end if;

  if v_gens >= p_cap then
    return false;
  end if;

  update public.avatar_usage
    set month = p_month, month_gens = v_gens + 1, updated_at = now()
    where user_id = p_user_id;
  return true;
end;
$$;

-- Hand one generation back (best-effort) when a claimed generation ultimately
-- fails, so a failed render doesn't cost the user a credit.
create or replace function public.release_avatar_gen(p_user_id uuid, p_month text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.avatar_usage
    set month_gens = greatest(month_gens - 1, 0), updated_at = now()
    where user_id = p_user_id and month = p_month;
end;
$$;

-- Atomically claim one anonymous generation for a (hashed) IP for the day.
create or replace function public.claim_ip_gen(p_ip_hash text, p_day date, p_cap int)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_gens int;
begin
  insert into public.ip_usage (ip_hash, day, gens)
    values (p_ip_hash, p_day, 0)
    on conflict (ip_hash, day) do nothing;

  select gens into v_gens
    from public.ip_usage where ip_hash = p_ip_hash and day = p_day for update;

  if v_gens >= p_cap then
    return false;
  end if;

  update public.ip_usage set gens = v_gens + 1, updated_at = now()
    where ip_hash = p_ip_hash and day = p_day;
  return true;
end;
$$;

-- Lock down execution: only the service-role backend may run these.
revoke execute on function public.claim_avatar_gen(uuid, text, int) from public, anon, authenticated;
revoke execute on function public.release_avatar_gen(uuid, text) from public, anon, authenticated;
revoke execute on function public.claim_ip_gen(text, date, int) from public, anon, authenticated;
grant execute on function public.claim_avatar_gen(uuid, text, int) to service_role;
grant execute on function public.release_avatar_gen(uuid, text) to service_role;
grant execute on function public.claim_ip_gen(text, date, int) to service_role;
