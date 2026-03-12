-- v12: Archive tables for deleted locations and best_days (admin-only)

create table public.deleted_locations (
  id uuid primary key default gen_random_uuid(),
  original_id uuid not null,
  user_id uuid not null,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  forest_info jsonb,
  original_created_at timestamptz,
  deleted_at timestamptz default now(),
  deleted_by_user_id uuid not null
);

create table public.deleted_best_days (
  id uuid primary key default gen_random_uuid(),
  original_id uuid not null,
  user_id uuid not null,
  location_id uuid,
  mushroom_id uuid,
  name text not null,
  best_date date not null,
  weather_data jsonb,
  photos text[] default '{}',
  purchased_from_listing_id uuid,
  location_name text,
  location_lat double precision,
  location_lng double precision,
  mushroom_latin_name text,
  mushroom_common_name text,
  mushroom_image_url text,
  original_created_at timestamptz,
  deleted_at timestamptz default now(),
  deleted_by_user_id uuid not null
);

alter table public.deleted_locations enable row level security;
alter table public.deleted_best_days enable row level security;

create policy "Admins can read deleted_locations"
  on public.deleted_locations for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.account_type = 'admin'
    )
  );

create policy "Service role can insert deleted_locations"
  on public.deleted_locations for insert
  with check (true);

create policy "Admins can read deleted_best_days"
  on public.deleted_best_days for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.account_type = 'admin'
    )
  );

create policy "Service role can insert deleted_best_days"
  on public.deleted_best_days for insert
  with check (true);

create index idx_deleted_locations_user on public.deleted_locations(user_id);
create index idx_deleted_locations_deleted_at on public.deleted_locations(deleted_at);
create index idx_deleted_best_days_user on public.deleted_best_days(user_id);
create index idx_deleted_best_days_deleted_at on public.deleted_best_days(deleted_at);
create index idx_deleted_best_days_location on public.deleted_best_days(location_lat, location_lng);
