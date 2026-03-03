-- V10: Forest search history — save every token-costing search for later restoration
-- Run in Supabase SQL Editor AFTER schema-v9

create table if not exists public.forest_search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  ref_lat double precision not null,
  ref_lng double precision not null,
  search_lat double precision not null,
  search_lng double precision not null,
  radius_km integer not null,
  token_cost integer not null,
  ref_pattern jsonb not null,
  matches jsonb not null,
  stats jsonb,
  created_at timestamptz default now()
);

alter table public.forest_search_history enable row level security;

create policy "Users can view own forest search history"
  on public.forest_search_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own forest search history"
  on public.forest_search_history for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own forest search history"
  on public.forest_search_history for delete
  using (auth.uid() = user_id);

create index idx_forest_search_history_user
  on public.forest_search_history(user_id, created_at desc);
