-- SECURITY PATCH: Restrict cache table writes
-- Run this in Supabase SQL Editor

-- mushroom_species: replace open insert policy with a more restrictive one
-- Only allow inserts that match an existing iNaturalist ID pattern
drop policy if exists "Authenticated users can insert species" on public.mushroom_species;
create policy "Authenticated users can insert species"
  on public.mushroom_species for insert
  with check (
    auth.uid() is not null
    and inaturalist_id > 0
    and latin_name is not null
    and char_length(latin_name) > 0
    and char_length(latin_name) < 200
  );

-- Prevent updates/deletes on mushroom_species by non-service roles
drop policy if exists "No updates on mushroom species" on public.mushroom_species;
create policy "No updates on mushroom species"
  on public.mushroom_species for update
  using (auth.role() = 'service_role');

drop policy if exists "No deletes on mushroom species" on public.mushroom_species;
create policy "No deletes on mushroom species"
  on public.mushroom_species for delete
  using (auth.role() = 'service_role');

-- weather_cache: add data validation
drop policy if exists "Authenticated can insert weather cache" on public.weather_cache;
create policy "Authenticated can insert weather cache"
  on public.weather_cache for insert
  with check (
    auth.uid() is not null
    and lat between -90 and 90
    and lng between -180 and 180
    and date_from <= date_to
  );

-- Prevent updates/deletes on weather_cache by non-service roles
drop policy if exists "No updates on weather cache" on public.weather_cache;
create policy "No updates on weather cache"
  on public.weather_cache for update
  using (auth.role() = 'service_role');

drop policy if exists "No deletes on weather cache" on public.weather_cache;
create policy "No deletes on weather cache"
  on public.weather_cache for delete
  using (auth.role() = 'service_role');
