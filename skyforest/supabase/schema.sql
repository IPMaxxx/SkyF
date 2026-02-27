-- Skyforest Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- DEPRECATED: Subscriptions replaced by token system (schema-v3-tokens.sql)
-- Table kept for data preservation; not used by application code
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null check (status in ('active', 'expired', 'cancelled')) default 'active',
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  payment_id text,
  amount numeric not null,
  created_at timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Only service role can insert/update subscriptions (via API routes)
create policy "Service role can manage subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role');

create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_status on public.subscriptions(status);

-- Search requests (for rate limiting free users)
create table if not exists public.search_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  request_type text not null check (request_type in ('mushroom_search', 'rain_map')),
  lat numeric,
  lng numeric,
  created_at timestamptz default now()
);

alter table public.search_requests enable row level security;

create policy "Users can view own search requests"
  on public.search_requests for select
  using (auth.uid() = user_id);

create policy "Users can insert own search requests"
  on public.search_requests for insert
  with check (auth.uid() = user_id);

create index idx_search_requests_user_date
  on public.search_requests(user_id, created_at);

-- Helper function: count today's requests for a user
create or replace function public.get_daily_request_count(p_user_id uuid, p_type text)
returns integer as $$
  select count(*)::integer
  from public.search_requests
  where user_id = p_user_id
    and request_type = p_type
    and created_at >= current_date;
$$ language sql stable security definer;

-- DEPRECATED: replaced by token_balances check
create or replace function public.has_active_subscription(p_user_id uuid)
returns boolean as $$
  select exists(
    select 1 from public.subscriptions
    where user_id = p_user_id
      and status = 'active'
      and expires_at > now()
  );
$$ language sql stable security definer;
