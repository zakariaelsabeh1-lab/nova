-- ============================================================================
-- 0007 · Storage buckets for avatars (public) and attachments (authenticated)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Avatars: anyone can read; a user may write only under their own {uid}/ prefix
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars owner write" on storage.objects;
create policy "avatars owner write" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Attachments: any authenticated user may read/write (fine-grained board checks
-- are enforced on the files metadata table; objects are namespaced by workspace)
drop policy if exists "attachments read" on storage.objects;
create policy "attachments read" on storage.objects
  for select using (bucket_id = 'attachments' and auth.role() = 'authenticated');

drop policy if exists "attachments write" on storage.objects;
create policy "attachments write" on storage.objects
  for insert with check (bucket_id = 'attachments' and auth.role() = 'authenticated');

drop policy if exists "attachments delete" on storage.objects;
create policy "attachments delete" on storage.objects
  for delete using (bucket_id = 'attachments' and auth.role() = 'authenticated');
