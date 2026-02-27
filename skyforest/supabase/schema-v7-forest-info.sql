-- Skyforest V7: Forest Info (type of forest, tree species)
-- Run this in Supabase SQL Editor AFTER schema-v6

-- Add forest_info JSONB column to locations
alter table public.locations
  add column if not exists forest_info jsonb;

-- Cache table for forest info (shared across users for same coordinates)
create table if not exists public.forest_info_cache (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null,
  lng double precision not null,
  data jsonb not null,
  created_at timestamptz default now(),
  unique(lat, lng)
);

alter table public.forest_info_cache enable row level security;

create policy "Anyone can read forest info cache"
  on public.forest_info_cache for select using (true);
create policy "Authenticated can insert forest info cache"
  on public.forest_info_cache for insert with check (auth.uid() is not null);
create policy "Authenticated can update forest info cache"
  on public.forest_info_cache for update using (auth.uid() is not null);

create index if not exists idx_forest_info_cache_coords
  on public.forest_info_cache(lat, lng);
