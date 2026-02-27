-- SECURITY PATCH: Restrict RPC functions to prevent unauthorized access
-- Run this in Supabase SQL Editor

-- 1. Recreate spend_tokens with strict auth check
-- Allows: authenticated user for own ID, or service_role for any ID (cron)
create or replace function public.spend_tokens(
  p_user_id uuid,
  p_amount integer,
  p_description text
) returns jsonb as $$
declare
  v_balance integer;
  v_new_balance integer;
begin
  if auth.role() != 'service_role' and (auth.uid() is null or auth.uid() != p_user_id) then
    return jsonb_build_object('success', false, 'error', 'forbidden', 'balance', 0);
  end if;

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

-- 2. Recreate add_tokens: ONLY service_role can call this
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
  if auth.role() != 'service_role' then
    raise exception 'Forbidden: only service_role can add tokens';
  end if;

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

-- 3. Recreate get_token_balance with strict auth check
-- Allows: authenticated user for own ID, or service_role for any ID (cron)
create or replace function public.get_token_balance(p_user_id uuid)
returns integer as $$
begin
  if auth.role() != 'service_role' and (auth.uid() is null or auth.uid() != p_user_id) then
    return 0;
  end if;

  return coalesce(
    (select balance from public.token_balances where user_id = p_user_id),
    0
  );
end;
$$ language plpgsql stable security definer;

-- 4. Restrict get_daily_request_count
-- Only own user or service_role
create or replace function public.get_daily_request_count(p_user_id uuid, p_type text)
returns integer as $$
begin
  if auth.role() != 'service_role' and (auth.uid() is null or auth.uid() != p_user_id) then
    return 0;
  end if;

  return (
    select count(*)::integer
    from public.search_requests
    where user_id = p_user_id
      and request_type = p_type
      and created_at >= current_date
  );
end;
$$ language plpgsql stable security definer;

-- 5. Restrict has_active_subscription
-- Only own user or service_role
create or replace function public.has_active_subscription(p_user_id uuid)
returns boolean as $$
begin
  if auth.role() != 'service_role' and (auth.uid() is null or auth.uid() != p_user_id) then
    return false;
  end if;

  return exists(
    select 1 from public.subscriptions
    where user_id = p_user_id
      and status = 'active'
      and expires_at > now()
  );
end;
$$ language plpgsql stable security definer;

-- 6. Revoke direct execution of add_tokens from anon and authenticated roles
revoke execute on function public.add_tokens from anon;
revoke execute on function public.add_tokens from authenticated;
