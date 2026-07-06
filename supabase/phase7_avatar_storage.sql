-- thisisme — Phase 7: avatar image storage
-- Run this in Supabase → SQL Editor → New query → Run.
--
-- Moves generated avatars out of the profile JSON (where each was a multi-MB
-- base64 data URL, re-downloaded and re-written on every load/save) into a
-- Storage bucket; the profile then holds only small public URLs. Public read
-- (avatars appear on public profiles); each user may only write files under
-- their own folder: avatars/<user_id>/<file>.
--
-- Backward-compatible: existing data-URL avatars keep working; new ones upload
-- here. The app falls back to a data URL if this bucket/policies aren't present.

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do update set public = true;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars owner insert" on storage.objects;
create policy "avatars owner insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
