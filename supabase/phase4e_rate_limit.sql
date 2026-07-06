-- thisisme — Phase 4e: shared-store burst rate limiter
-- Run this in Supabase → SQL Editor → New query → Run.
--
-- The last piece of avatar throttling that still lived in per-instance memory
-- (the short "you're going too fast" burst limit) moves to the database so it
-- actually enforces across serverless instances, like the monthly/IP caps.
-- Fixed-window counter keyed by an opaque bucket string (e.g. hashed IP).

create table if not exists public.rate_hits (
  bucket       text primary key,
  window_start timestamptz not null default now(),
  count        int not null default 0
);
alter table public.rate_hits enable row level security;
-- No policies: only the service-role backend (via the function) touches it.

-- Claim one hit against `bucket` within a rolling fixed window. Returns true if
-- under the limit (and counted), false if the window is full. The FOR UPDATE
-- lock serializes concurrent requests for the same bucket.
create or replace function public.claim_rate(p_bucket text, p_window_secs int, p_limit int)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_start timestamptz;
  v_count int;
begin
  insert into public.rate_hits (bucket, window_start, count)
    values (p_bucket, now(), 0)
    on conflict (bucket) do nothing;

  select window_start, count into v_start, v_count
    from public.rate_hits where bucket = p_bucket for update;

  if now() - v_start >= make_interval(secs => p_window_secs) then
    update public.rate_hits set window_start = now(), count = 1 where bucket = p_bucket;
    return true; -- window expired → reset
  end if;

  if v_count >= p_limit then
    return false;
  end if;

  update public.rate_hits set count = count + 1 where bucket = p_bucket;
  return true;
end;
$$;

revoke execute on function public.claim_rate(text, int, int) from public, anon, authenticated;
grant execute on function public.claim_rate(text, int, int) to service_role;
