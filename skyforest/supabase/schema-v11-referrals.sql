-- ============================================================
-- v11: Referral / affiliate system (10% perpetual bonus)
-- ============================================================

-- Referral codes (one per user, auto-generated)
create table if not exists public.referral_codes (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  code       text not null unique,
  uses_count int  not null default 0,
  created_at timestamptz not null default now(),
  constraint referral_codes_user_unique unique (user_id)
);

alter table public.referral_codes enable row level security;

create policy "Users can read own referral code"
  on public.referral_codes for select
  using (auth.uid() = user_id);

-- Referral links: which user registered via which referral code
create table if not exists public.referral_links (
  id               uuid default gen_random_uuid() primary key,
  referral_code_id uuid not null references public.referral_codes(id) on delete cascade,
  referrer_id      uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  constraint referral_links_user_unique unique (referred_user_id)
);

alter table public.referral_links enable row level security;

create policy "Users can read own referral links"
  on public.referral_links for select
  using (
    referred_user_id = auth.uid()
    or referrer_id = auth.uid()
  );

-- Log of referral bonuses from purchases
create table if not exists public.referral_bonuses (
  id               uuid default gen_random_uuid() primary key,
  referral_link_id uuid not null references public.referral_links(id) on delete cascade,
  purchase_tokens  int not null,
  buyer_bonus      int not null,
  referrer_bonus   int not null,
  payment_id       text,
  created_at       timestamptz not null default now()
);

alter table public.referral_bonuses enable row level security;

create policy "Users can read own referral bonuses"
  on public.referral_bonuses for select
  using (
    referral_link_id in (
      select id from public.referral_links
      where referrer_id = auth.uid() or referred_user_id = auth.uid()
    )
  );

-- Generate a short referral code from user id
create or replace function public.generate_referral_code(p_user_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_code text;
  v_exists boolean;
begin
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

-- Link a new user to a referrer (called once at registration)
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

-- Apply 10% referral bonus on purchase (called from webhook)
-- Returns bonus amounts or null if no referral link exists
create or replace function public.apply_referral_purchase_bonus(
  p_buyer_id uuid,
  p_purchased_tokens int,
  p_payment_id text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_link_id uuid;
  v_referrer_id uuid;
  v_buyer_bonus int;
  v_referrer_bonus int;
begin
  select rl.id, rl.referrer_id into v_link_id, v_referrer_id
  from public.referral_links rl
  where rl.referred_user_id = p_buyer_id;

  if v_link_id is null then
    return null;
  end if;

  -- Idempotency: skip if this payment was already processed
  if p_payment_id is not null and exists(
    select 1 from public.referral_bonuses where payment_id = p_payment_id
  ) then
    return null;
  end if;

  v_buyer_bonus := greatest(1, round(p_purchased_tokens * 0.10));
  v_referrer_bonus := greatest(1, round(p_purchased_tokens * 0.10));

  -- Log the bonus
  insert into public.referral_bonuses (referral_link_id, purchase_tokens, buyer_bonus, referrer_bonus, payment_id)
  values (v_link_id, p_purchased_tokens, v_buyer_bonus, v_referrer_bonus, p_payment_id);

  -- Give bonus to buyer
  perform public.add_tokens(
    p_buyer_id,
    v_buyer_bonus,
    'bonus',
    'Реферальный бонус +10% к покупке',
    null
  );

  -- Give bonus to referrer
  perform public.add_tokens(
    v_referrer_id,
    v_referrer_bonus,
    'bonus',
    'Партнёрский бонус 10% от покупки реферала',
    null
  );

  return jsonb_build_object(
    'buyer_bonus', v_buyer_bonus,
    'referrer_bonus', v_referrer_bonus
  );
end;
$$;

-- Get referral stats for a user
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

-- Check if a user has a referrer (lightweight, for payment page)
create or replace function public.has_referrer(p_user_id uuid)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists(
    select 1 from public.referral_links where referred_user_id = p_user_id
  );
end;
$$;
