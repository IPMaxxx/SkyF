-- Skyforest V2: Dashboard, Locations, Best Days
-- Run this in Supabase SQL Editor AFTER the initial schema.sql

-- User locations (saved pins on the map)
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz default now()
);

alter table public.locations enable row level security;

create policy "Users can view own locations"
  on public.locations for select using (auth.uid() = user_id);
create policy "Users can insert own locations"
  on public.locations for insert with check (auth.uid() = user_id);
create policy "Users can update own locations"
  on public.locations for update using (auth.uid() = user_id);
create policy "Users can delete own locations"
  on public.locations for delete using (auth.uid() = user_id);

-- Mushroom species (cached from iNaturalist)
create table if not exists public.mushroom_species (
  id uuid primary key default gen_random_uuid(),
  inaturalist_id integer unique not null,
  latin_name text not null,
  common_name text,
  image_url text,
  created_at timestamptz default now()
);

alter table public.mushroom_species enable row level security;

create policy "Anyone can read mushroom species"
  on public.mushroom_species for select using (true);
create policy "Authenticated users can insert species"
  on public.mushroom_species for insert with check (auth.uid() is not null);

-- Best days (golden standard days with weather patterns)
create table if not exists public.best_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  location_id uuid references public.locations(id) on delete cascade not null,
  mushroom_id uuid references public.mushroom_species(id) not null,
  name text not null,
  best_date date not null,
  weather_data jsonb, -- 14 days of weather stored as JSON
  created_at timestamptz default now()
);

alter table public.best_days enable row level security;

create policy "Users can view own best days"
  on public.best_days for select using (auth.uid() = user_id);
create policy "Users can insert own best days"
  on public.best_days for insert with check (auth.uid() = user_id);
create policy "Users can update own best days"
  on public.best_days for update using (auth.uid() = user_id);
create policy "Users can delete own best days"
  on public.best_days for delete using (auth.uid() = user_id);

-- Weather cache (to avoid re-fetching same data)
create table if not exists public.weather_cache (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null,
  lng double precision not null,
  date_from date not null,
  date_to date not null,
  data jsonb not null,
  created_at timestamptz default now(),
  unique(lat, lng, date_from, date_to)
);

alter table public.weather_cache enable row level security;

create policy "Anyone can read weather cache"
  on public.weather_cache for select using (true);
create policy "Authenticated can insert weather cache"
  on public.weather_cache for insert with check (auth.uid() is not null);

create index idx_locations_user on public.locations(user_id);
create index idx_best_days_user on public.best_days(user_id);
create index idx_best_days_location on public.best_days(location_id);
create index idx_weather_cache_coords on public.weather_cache(lat, lng, date_from, date_to);
