-- V9: Compare redesign — comparison = Best Day + Location
-- Includes table creation (from v5) + new columns

-- Create the table if it doesn't exist yet
create table if not exists public.auto_compares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  best_day_id uuid references public.best_days(id) on delete cascade not null,
  enabled boolean not null default true,
  run_time time not null default '08:00',
  weights jsonb not null default '{"rain_sum":30,"temperature_mean":25,"temperature_min":10,"temperature_max":10,"wind_speed_max":10,"relative_humidity_mean":15}',
  last_run_at timestamptz,
  last_score numeric,
  created_at timestamptz default now()
);

alter table public.auto_compares enable row level security;

-- RLS: each user sees only their own comparisons
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'auto_compares' and policyname = 'Users can manage own auto compares'
  ) then
    create policy "Users can manage own auto compares"
      on public.auto_compares for all using (auth.uid() = user_id);
  end if;
end $$;

-- Index for cron queries
create index if not exists idx_auto_compares_enabled on public.auto_compares(enabled, run_time);

-- New columns for redesign
alter table public.auto_compares
  add column if not exists location_id uuid references public.locations(id) on delete cascade;

alter table public.auto_compares
  add column if not exists last_result jsonb;

alter table public.auto_compares
  add column if not exists name text;

-- Drop old unique constraint (same best_day can be used in multiple comparisons)
alter table public.auto_compares
  drop constraint if exists auto_compares_user_id_best_day_id_key;

-- Backfill location_id from best_days for existing rows
update public.auto_compares ac
set location_id = bd.location_id
from public.best_days bd
where ac.best_day_id = bd.id
  and ac.location_id is null;

-- Add location_id and auto_compare_id to saved_compares for history tracking
alter table public.saved_compares
  add column if not exists location_id uuid references public.locations(id) on delete cascade;

alter table public.saved_compares
  add column if not exists auto_compare_id uuid references public.auto_compares(id) on delete set null;
