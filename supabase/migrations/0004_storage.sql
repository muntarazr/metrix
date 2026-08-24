-- ============================================================================
-- METRIX — storage buckets
--
-- Both buckets are public because the app hands their getPublicUrl() straight
-- to <img>. Writes stay restricted.
--   avatars    — uploaded by the user, path is "<user_id>/avatar.<ext>"
--   milestones — written server-side with the service role key
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('milestones', 'milestones', true)
on conflict (id) do update set public = true;

-- ── avatars ─────────────────────────────────────────────────────────────────
drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

-- a user may only write inside their own <user_id>/ folder
drop policy if exists avatars_own_write on storage.objects;
create policy avatars_own_write on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_own_update on storage.objects;
create policy avatars_own_update on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_own_delete on storage.objects;
create policy avatars_own_delete on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── milestones ──────────────────────────────────────────────────────────────
-- Read is public; no write policy is declared, so only the service role key
-- (which bypasses RLS) can upload — matching how the API route writes them.
drop policy if exists milestones_public_read on storage.objects;
create policy milestones_public_read on storage.objects
  for select using (bucket_id = 'milestones');
