-- =============================================================================
-- Realtime
-- =============================================================================
-- Customers subscribe to `queues` (public, no PII) and their own
-- `queue_entries` / `notifications` rows; staff subscribe to their shop's
-- `queue_entries`. Postgres Changes honours RLS for every subscriber.
alter publication supabase_realtime add table public.queues;
alter publication supabase_realtime add table public.queue_entries;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.shops;

-- Full row images so UPDATE events carry the filter columns.
alter table public.queues replica identity full;
alter table public.queue_entries replica identity full;
alter table public.notifications replica identity full;

-- =============================================================================
-- Storage buckets (public read; uploads scoped to the uploader's folder)
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('shop-images', 'shop-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('barber-photos', 'barber-photos', true, 3145728, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Objects are stored at `<auth.uid()>/<filename>`; users may only write inside their own folder.
create policy "public read images" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('shop-images', 'barber-photos', 'avatars'));

create policy "users upload to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('shop-images', 'barber-photos', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update own objects" on storage.objects
  for update to authenticated
  using (bucket_id in ('shop-images', 'barber-photos', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('shop-images', 'barber-photos', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete own objects" on storage.objects
  for delete to authenticated
  using (bucket_id in ('shop-images', 'barber-photos', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
