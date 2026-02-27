-- Skyforest V3: Token system (replaces subscriptions)
-- Run this in Supabase SQL Editor AFTER schema-v2.sql

-- Token balances
create table if not exists public.token_balances (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  balance integer not null default 0,
  total_purchased integer not null default 0,
  total_spent integer not null default 0,
  updated_at timestamptz default now()
);

alter table public.token_balances enable row level security;

create policy "Users can view own balance"
  on public.token_balances for select using (auth.uid() = user_id);

-- Auto-create token balance on profile creation
create or replace function public.handle_new_profile_tokens()
returns trigger as $$
begin
  insert into public.token_balances (user_id, balance, total_purchased, total_spent)
  values (new.id, 50, 50, 0);

  insert into public.token_transactions (user_id, amount, type, description)
  values (new.id, 50, 'bonus', 'Приветственный бонус');

  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_profile_created_tokens
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile_tokens();

-- Token transactions log
create table if not exists public.token_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount integer not null,
  type text not null check (type in ('purchase', 'spend', 'bonus', 'refund')),
  description text,
  payment_id text,
  balance_after integer,
  created_at timestamptz default now()
);

alter table public.token_transactions enable row level security;

create policy "Users can view own transactions"
  on public.token_transactions for select using (auth.uid() = user_id);

create index idx_token_transactions_user on public.token_transactions(user_id, created_at desc);

-- Spend tokens (atomic: check balance + deduct + log in one transaction)
create or replace function public.spend_tokens(
  p_user_id uuid,
  p_amount integer,
  p_description text
) returns jsonb as $$
declare
  v_balance integer;
  v_new_balance integer;
begin
  -- Lock the row to prevent race conditions
  select balance into v_balance
  from public.token_balances
  where user_id = p_user_id
  for update;

  if v_balance is null then
    return jsonb_build_object('success', false, 'error', 'no_account', 'balance', 0);
  end if;

  if v_balance < p_amount then
    return jsonb_build_object('success', false, 'error', 'insufficient', 'balance', v_balance);
  end if;

  v_new_balance := v_balance - p_amount;

  update public.token_balances
  set balance = v_new_balance,
      total_spent = total_spent + p_amount,
      updated_at = now()
  where user_id = p_user_id;

  insert into public.token_transactions (user_id, amount, type, description, balance_after)
  values (p_user_id, -p_amount, 'spend', p_description, v_new_balance);

  return jsonb_build_object('success', true, 'balance', v_new_balance);
end;
$$ language plpgsql security definer;

-- Add tokens (for purchases / bonuses)
create or replace function public.add_tokens(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_description text,
  p_payment_id text default null
) returns jsonb as $$
declare
  v_new_balance integer;
begin
  insert into public.token_balances (user_id, balance, total_purchased, total_spent)
  values (p_user_id, p_amount, case when p_type = 'purchase' then p_amount else 0 end, 0)
  on conflict (user_id) do update
  set balance = token_balances.balance + p_amount,
      total_purchased = token_balances.total_purchased + case when p_type = 'purchase' then p_amount else 0 end,
      updated_at = now()
  returning balance into v_new_balance;

  insert into public.token_transactions (user_id, amount, type, description, payment_id, balance_after)
  values (p_user_id, p_amount, p_type, p_description, p_payment_id, v_new_balance);

  return jsonb_build_object('success', true, 'balance', v_new_balance);
end;
$$ language plpgsql security definer;

-- Get user balance (simple helper)
create or replace function public.get_token_balance(p_user_id uuid)
returns integer as $$
  select coalesce(balance, 0)
  from public.token_balances
  where user_id = p_user_id;
$$ language sql stable security definer;
