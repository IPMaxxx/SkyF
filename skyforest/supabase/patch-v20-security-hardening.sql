-- patch-v20: Security hardening
--
-- 1. CRITICAL: Prevent users from changing their own account_type (self-escalation to admin)
-- 2. CRITICAL: Restrict forest_info_cache UPDATE to service_role only
-- 3. MEDIUM:   Add auth.uid() checks to referral functions
-- 4. MEDIUM:   Add p_amount > 0 check to spend_tokens

-- ============================================================
-- 1. Fix profiles UPDATE RLS — block account_type self-escalation
-- ============================================================

drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and account_type is not distinct from (
      select p.account_type from public.profiles p where p.id = auth.uid()
    )
  );

-- ============================================================
-- 2. Fix forest_info_cache UPDATE — restrict to service_role
-- ============================================================

drop policy if exists "Authenticated can update forest info cache" on public.forest_info_cache;

create policy "Service role can update forest info cache"
  on public.forest_info_cache for update
  using (auth.role() = 'service_role');

-- ============================================================
-- 3. Add auth checks to referral functions
-- ============================================================

-- generate_referral_code: only own user
create or replace function public.generate_referral_code(p_user_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_code text;
  v_exists boolean;
begin
  if auth.uid() is null or (auth.uid() != p_user_id and auth.role() != 'service_role') then
    raise exception 'Forbidden';
  end if;

  select code into v_code
  from public.referral_codes
  where user_id = p_user_id;

  if v_code is not null then
    return v_code;
  end if;

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    select exists(select 1 from public.referral_codes where code = v_code) into v_exists;
    exit when not v_exists;
  end loop;

  insert into public.referral_codes (user_id, code)
  values (p_user_id, v_code);

  return v_code;
end;
$$;

-- apply_referral: only the new user themselves (or service_role)
create or replace function public.apply_referral(
  p_code text,
  p_new_user_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_referral_code_id uuid;
  v_referrer_id uuid;
  v_already_linked boolean;
begin
  if auth.uid() is null or (auth.uid() != p_new_user_id and auth.role() != 'service_role') then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  select id, user_id into v_referral_code_id, v_referrer_id
  from public.referral_codes
  where code = upper(p_code);

  if v_referral_code_id is null then
    return jsonb_build_object('success', false, 'error', 'invalid_code');
  end if;

  if v_referrer_id = p_new_user_id then
    return jsonb_build_object('success', false, 'error', 'self_referral');
  end if;

  select exists(
    select 1 from public.referral_links where referred_user_id = p_new_user_id
  ) into v_already_linked;

  if v_already_linked then
    return jsonb_build_object('success', false, 'error', 'already_linked');
  end if;

  insert into public.referral_links (referral_code_id, referrer_id, referred_user_id)
  values (v_referral_code_id, v_referrer_id, p_new_user_id);

  update public.referral_codes
  set uses_count = uses_count + 1
  where id = v_referral_code_id;

  return jsonb_build_object('success', true);
end;
$$;

-- get_referral_stats: only own user
create or replace function public.get_referral_stats(p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_code text;
  v_uses_count int;
  v_total_earned int;
  v_has_referrer boolean;
begin
  if auth.uid() is null or (auth.uid() != p_user_id and auth.role() != 'service_role') then
    return jsonb_build_object('error', 'forbidden');
  end if;

  select code, uses_count into v_code, v_uses_count
  from public.referral_codes
  where user_id = p_user_id;

  if v_code is null then
    v_code := public.generate_referral_code(p_user_id);
    v_uses_count := 0;
  end if;

  select coalesce(sum(rb.referrer_bonus), 0) into v_total_earned
  from public.referral_bonuses rb
  join public.referral_links rl on rl.id = rb.referral_link_id
  where rl.referrer_id = p_user_id;

  select exists(
    select 1 from public.referral_links where referred_user_id = p_user_id
  ) into v_has_referrer;

  return jsonb_build_object(
    'code', v_code,
    'uses_count', v_uses_count,
    'total_earned', v_total_earned,
    'has_referrer', v_has_referrer
  );
end;
$$;

-- has_referrer: only own user
create or replace function public.has_referrer(p_user_id uuid)
returns boolean
language plpgsql
security definer
as $$
begin
  if auth.uid() is null or (auth.uid() != p_user_id and auth.role() != 'service_role') then
    return false;
  end if;

  return exists(
    select 1 from public.referral_links where referred_user_id = p_user_id
  );
end;
$$;

-- ============================================================
-- 4. Harden spend_tokens: reject non-positive amounts
-- ============================================================

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

  if p_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount', 'balance', 0);
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

-- ============================================================
-- 5. Add CHECK constraint on account_type
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_account_type_check'
  ) then
    alter table public.profiles
      add constraint profiles_account_type_check
      check (account_type in ('user', 'admin'));
  end if;
end;
$$;
