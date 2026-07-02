-- PATCH v39: история определений грибов по фото (фича «Определение гриба по фото»).
-- Запускать в Supabase SQL Editor ПОСЛЕ patch-v38.
--
-- Хранит результат распознавания Kindwise + обогащения (GBIF/iNaturalist) и
-- курируемых справочников. Списание токенов идёт через существующий
-- spend_tokens (mushroom_identify = 1 токен). request_id уникален per-user —
-- защита от повторного списания при ретраях.

-- ============================================================
-- 1. Таблица mushroom_identifications
-- ============================================================

create table if not exists public.mushroom_identifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  photo_path text,
  top_species text,
  top_probability double precision,
  result_json jsonb not null,
  token_cost integer not null default 1,
  request_id text,
  created_at timestamptz default now()
);

alter table public.mushroom_identifications enable row level security;

-- RLS: пользователь видит/создаёт/удаляет только свои записи.
create policy "Users can view own mushroom identifications"
  on public.mushroom_identifications for select
  using (auth.uid() = user_id);

create policy "Users can insert own mushroom identifications"
  on public.mushroom_identifications for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own mushroom identifications"
  on public.mushroom_identifications for delete
  using (auth.uid() = user_id);

create index if not exists idx_mushroom_identifications_user
  on public.mushroom_identifications(user_id, created_at desc);

-- Идемпотентность: один request_id на пользователя.
create unique index if not exists uq_mushroom_identifications_request
  on public.mushroom_identifications(user_id, request_id)
  where request_id is not null;

-- ============================================================
-- 2. Приватный storage-bucket для фото определений
-- ============================================================

insert into storage.buckets (id, name, public)
values ('mushroom-photos', 'mushroom-photos', false)
on conflict (id) do nothing;

-- Загрузка только в свою папку (первый сегмент пути = user_id).
create policy "Users can upload own mushroom photos"
  on storage.objects for insert
  with check (
    bucket_id = 'mushroom-photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view own mushroom photos"
  on storage.objects for select
  using (
    bucket_id = 'mushroom-photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own mushroom photos"
  on storage.objects for delete
  using (
    bucket_id = 'mushroom-photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );
