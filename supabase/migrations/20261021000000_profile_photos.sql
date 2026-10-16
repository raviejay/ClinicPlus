-- ============================================================
-- PROFILE PHOTOS
-- The photo used to be looked up by guessing a file name in three different places, so it
-- disappeared on refresh. Now the address of the photo is saved on the profile itself.
--  * profiles.avatar_url: the public address of the user's current photo
--  * the "avatars" bucket (public read) where each user may only write inside their own folder
-- ============================================================
begin;

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles drop constraint if exists profiles_avatar_url_check;
alter table public.profiles add constraint profiles_avatar_url_check
  check (avatar_url is null or (length(avatar_url) <= 500 and avatar_url like 'https://%'));

-- Storage only exists on Supabase itself (not in the local test database)
do $$
begin
  if to_regnamespace('storage') is null then return; end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update set public = true, file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

  drop policy if exists avatars_public_read on storage.objects;
  create policy avatars_public_read on storage.objects for select
    using (bucket_id = 'avatars');

  drop policy if exists avatars_own_insert on storage.objects;
  create policy avatars_own_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

  drop policy if exists avatars_own_update on storage.objects;
  create policy avatars_own_update on storage.objects for update to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

  drop policy if exists avatars_own_delete on storage.objects;
  create policy avatars_own_delete on storage.objects for delete to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
end $$;

commit;
