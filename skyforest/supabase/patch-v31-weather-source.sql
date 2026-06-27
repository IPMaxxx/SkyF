-- Skyforest patch v31: track weather data source on saved checks
-- Run in Supabase SQL Editor.

alter table public.saved_weather
  add column if not exists source text not null default 'open-meteo';
