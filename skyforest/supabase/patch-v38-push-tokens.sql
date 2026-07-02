-- v38: Push-токены устройств для нативных приложений (iOS/Android).
-- Один пользователь может иметь несколько устройств. Токен уникален глобально;
-- при повторной регистрации переносится на актуального пользователя (upsert по token).

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

alter table public.push_tokens enable row level security;

-- Пользователь видит и удаляет только свои токены. Запись/обновление токенов
-- выполняется серверным роутом через service role (минуя RLS), поэтому
-- insert/update-политики для anon не требуются.
create policy "Users can view own push tokens"
  on public.push_tokens for select
  using (auth.uid() = user_id);

create policy "Users can delete own push tokens"
  on public.push_tokens for delete
  using (auth.uid() = user_id);

create index idx_push_tokens_user on public.push_tokens(user_id);
create index idx_push_tokens_platform on public.push_tokens(platform);
