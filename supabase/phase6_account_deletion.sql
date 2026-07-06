-- thisisme — Phase 6: account deletion (right to erasure)
-- Run this in Supabase → SQL Editor → New query → Run.
--
-- Full account deletion is done by the /api/account/delete route, which uses
-- the service_role key to delete the auth.users row. Every user table
-- references auth.users(id) ON DELETE CASCADE (profiles, public_profiles,
-- usernames, entitlements, avatar_usage, profile_snapshots), so that single
-- delete removes ALL of the user's data.
--
-- This migration adds a DELETE policy on `profiles` for defense in depth, so a
-- signed-in user can also clear their own profile row directly if ever needed.
-- (public_profiles and usernames already have owner-delete policies.)

create policy "delete own profile"
  on public.profiles for delete
  using (auth.uid() = id);
