-- V9: Compare redesign — comparison = Best Day + Location
-- Run AFTER schema-v5 (auto_compares table must already exist)
-- Adds location_id, name, last_result columns and links saved_compares
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
