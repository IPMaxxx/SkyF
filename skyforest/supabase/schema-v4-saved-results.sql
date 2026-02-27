-- Skyforest V4: Saved results (weather, compare, rain map)
-- Run in Supabase SQL Editor AFTER schema-v3-tokens.sql

-- Saved weather checks
create table if not exists public.saved_weather (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  location_id uuid references public.locations(id) on delete cascade not null,
  check_date date not null,
  weather_data jsonb not null,
  created_at timestamptz default now()
);

alter table public.saved_weather enable row level security;
create policy "Users can manage own saved weather" on public.saved_weather for all using (auth.uid() = user_id);
create index idx_saved_weather_user on public.saved_weather(user_id, created_at desc);

-- Saved compare results
create table if not exists public.saved_compares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  best_day_id uuid references public.best_days(id) on delete cascade not null,
  compare_date date not null,
  current_weather jsonb not null,
  weights jsonb not null,
  overall_score numeric not null,
  by_parameter jsonb,
  by_day jsonb,
  created_at timestamptz default now()
);

alter table public.saved_compares enable row level security;
create policy "Users can manage own saved compares" on public.saved_compares for all using (auth.uid() = user_id);
create index idx_saved_compares_user on public.saved_compares(user_id, created_at desc);

-- Saved rain map results
create table if not exists public.saved_rain_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_km integer not null,
  step_km integer not null,
  days integer not null,
  grid_data jsonb not null,
  created_at timestamptz default now()
);

alter table public.saved_rain_maps enable row level security;
create policy "Users can manage own saved rain maps" on public.saved_rain_maps for all using (auth.uid() = user_id);
create index idx_saved_rain_maps_user on public.saved_rain_maps(user_id, created_at desc);
