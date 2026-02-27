-- Skyforest V5: Auto-compare scheduling
-- Run in Supabase SQL Editor AFTER schema-v4

create table if not exists public.auto_compares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  best_day_id uuid references public.best_days(id) on delete cascade not null,
  enabled boolean not null default true,
  run_time time not null default '08:00',
  weights jsonb not null default '{"rain_sum":30,"temperature_mean":25,"temperature_min":10,"temperature_max":10,"wind_speed_max":10,"relative_humidity_mean":15}',
  last_run_at timestamptz,
  last_score numeric,
  created_at timestamptz default now(),
  unique(user_id, best_day_id)
);

alter table public.auto_compares enable row level security;

create policy "Users can manage own auto compares"
  on public.auto_compares for all using (auth.uid() = user_id);

create index idx_auto_compares_enabled on public.auto_compares(enabled, run_time);
