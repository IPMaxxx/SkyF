-- Saved rolling forecast compare (6 anchors). Retention: app deletes rows older than 5 days.
create table if not exists public.saved_forecast_compares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  best_day_id uuid references public.best_days(id) on delete cascade not null,
  location_id uuid references public.locations(id) on delete cascade not null,
  run_minsk_date date not null,
  weather_start date not null,
  weather_end date not null,
  scores jsonb not null,
  created_at timestamptz default now() not null
);

alter table public.saved_forecast_compares enable row level security;

create policy "Users can manage own saved forecast compares"
  on public.saved_forecast_compares for all
  using (auth.uid() = user_id);

create index if not exists idx_saved_forecast_compares_user_created
  on public.saved_forecast_compares (user_id, created_at desc);
