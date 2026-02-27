-- Add photos column to best_days
alter table public.best_days add column if not exists photos text[] default '{}';

-- Storage bucket for best day photos
insert into storage.buckets (id, name, public)
values ('best-day-photos', 'best-day-photos', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their own folder
create policy "Users can upload best day photos"
  on storage.objects for insert
  with check (
    bucket_id = 'best-day-photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow anyone to view (public bucket)
create policy "Public read best day photos"
  on storage.objects for select
  using (bucket_id = 'best-day-photos');

-- Allow users to delete their own photos
create policy "Users can delete own best day photos"
  on storage.objects for delete
  using (
    bucket_id = 'best-day-photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );
