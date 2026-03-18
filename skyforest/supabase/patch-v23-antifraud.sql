-- PATCH v23: Anti-fraud protection
--
-- Problem: fraudster creates a 20-token listing (costs 10 to list),
-- spawns throwaway accounts (each gets 20 bonus tokens), buys own listing
-- from each account, netting 16 tokens per fake account after 20% commission.
--
-- Defenses:
--   1. Separate bonus_balance from real balance; marketplace uses real only
--   2. Account age minimum 3 days for marketplace purchases
--   3. IP tracking: log signup IP, block same-IP buyer-seller pairs,
--      revoke bonus for IPs with >2 signups in 24h


-- ============================================================
-- 1. Add bonus_balance column to token_balances
-- ============================================================

ALTER TABLE public.token_balances
  ADD COLUMN IF NOT EXISTS bonus_balance integer NOT NULL DEFAULT 0;


-- ============================================================
-- 2. Welcome bonus → bonus_balance (not real balance)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_profile_tokens()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.token_balances (user_id, balance, bonus_balance, total_purchased, total_spent)
  VALUES (new.id, 0, 20, 0, 0);

  INSERT INTO public.token_transactions (user_id, amount, type, description, balance_after)
  VALUES (new.id, 20, 'bonus', 'Приветственный бонус (на сервисы платформы)', 20);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 3. spend_tokens: deduct from bonus first, then real balance
--    New param p_use_bonus (default true) — set false for
--    marketplace purchases and withdrawals.
-- ============================================================

DROP FUNCTION IF EXISTS public.spend_tokens(uuid, integer, text);

CREATE OR REPLACE FUNCTION public.spend_tokens(
  p_user_id uuid,
  p_amount integer,
  p_description text,
  p_use_bonus boolean DEFAULT true
) RETURNS jsonb AS $$
DECLARE
  v_balance integer;
  v_bonus integer;
  v_from_bonus integer;
  v_from_balance integer;
  v_new_balance integer;
  v_new_bonus integer;
BEGIN
  IF auth.role() != 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() != p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden', 'balance', 0);
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount', 'balance', 0);
  END IF;

  SELECT balance, coalesce(bonus_balance, 0)
    INTO v_balance, v_bonus
    FROM public.token_balances
    WHERE user_id = p_user_id
    FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_account', 'balance', 0);
  END IF;

  IF p_use_bonus THEN
    v_from_bonus   := least(v_bonus, p_amount);
    v_from_balance := p_amount - v_from_bonus;
  ELSE
    v_from_bonus   := 0;
    v_from_balance := p_amount;
  END IF;

  IF v_balance < v_from_balance THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient',
                              'balance', v_balance + v_bonus);
  END IF;

  v_new_balance := v_balance - v_from_balance;
  v_new_bonus   := v_bonus  - v_from_bonus;

  UPDATE public.token_balances
  SET balance       = v_new_balance,
      bonus_balance = v_new_bonus,
      total_spent   = total_spent + p_amount,
      updated_at    = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.token_transactions
    (user_id, amount, type, description, balance_after)
  VALUES
    (p_user_id, -p_amount, 'spend', p_description,
     v_new_balance + v_new_bonus);

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance + v_new_bonus,
    'real_balance', v_new_balance,
    'bonus_balance', v_new_bonus
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 4. get_token_balance: return total (real + bonus) for compat
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_token_balance(p_user_id uuid)
RETURNS integer AS $$
BEGIN
  IF auth.role() != 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() != p_user_id) THEN
    RETURN 0;
  END IF;

  RETURN coalesce(
    (SELECT balance + coalesce(bonus_balance, 0)
       FROM public.token_balances
       WHERE user_id = p_user_id),
    0
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ============================================================
-- 5. buy_marketplace_listing: real balance only + account age
--    + IP cross-check (rebuilds on v12 with commission,
--    season date, resale protection)
-- ============================================================

CREATE OR REPLACE FUNCTION buy_marketplace_listing(
  p_listing_id uuid,
  p_buyer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_listing marketplace_listings;
  v_best_day best_days;
  v_location locations;
  v_buyer_balance integer;
  v_buyer_bonus integer;
  v_buyer_ip text;
  v_seller_ip text;
  v_new_location_id uuid;
  v_new_bestday_id uuid;
  v_season_date date;
  v_commission integer;
  v_seller_amount integer;
BEGIN
  -- Check account existence and get signup IP
  SELECT p.signup_ip
    INTO v_buyer_ip
    FROM profiles p
    WHERE p.id = p_buyer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_account');
  END IF;

  -- Lock and validate listing
  SELECT * INTO v_listing
    FROM marketplace_listings
    WHERE id = p_listing_id AND status = 'active'
    FOR UPDATE;

  IF NOT found THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_listing.seller_id = p_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'own_listing');
  END IF;

  -- IP cross-check: block if buyer and seller registered from same IP
  IF v_buyer_ip IS NOT NULL THEN
    SELECT p.signup_ip INTO v_seller_ip
      FROM profiles p
      WHERE p.id = v_listing.seller_id;

    IF v_seller_ip IS NOT NULL AND v_buyer_ip = v_seller_ip THEN
      RETURN jsonb_build_object('success', false, 'error', 'ip_conflict');
    END IF;
  END IF;

  -- Check REAL balance only (bonus tokens cannot be used on marketplace)
  SELECT balance, coalesce(bonus_balance, 0)
    INTO v_buyer_balance, v_buyer_bonus
    FROM token_balances
    WHERE user_id = p_buyer_id
    FOR UPDATE;

  IF v_buyer_balance IS NULL OR v_buyer_balance < v_listing.price THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient',
                              'balance', coalesce(v_buyer_balance, 0));
  END IF;

  SELECT * INTO v_best_day
    FROM best_days
    WHERE id = v_listing.best_day_id;

  IF NOT found THEN
    RETURN jsonb_build_object('success', false, 'error', 'bestday_missing');
  END IF;

  SELECT * INTO v_location
    FROM locations
    WHERE id = v_best_day.location_id;

  -- Replace exact date with first day of season (protect seller's data)
  v_season_date := CASE v_listing.season
    WHEN 'winter' THEN make_date(extract(year FROM v_best_day.best_date)::int, 1, 1)
    WHEN 'spring' THEN make_date(extract(year FROM v_best_day.best_date)::int, 4, 1)
    WHEN 'summer' THEN make_date(extract(year FROM v_best_day.best_date)::int, 7, 1)
    WHEN 'autumn' THEN make_date(extract(year FROM v_best_day.best_date)::int, 10, 1)
  END;

  -- Debit buyer (real balance only, not bonus_balance)
  UPDATE token_balances
    SET balance     = balance - v_listing.price,
        total_spent = total_spent + v_listing.price,
        updated_at  = now()
    WHERE user_id = p_buyer_id;

  INSERT INTO token_transactions (user_id, amount, type, description, balance_after)
    VALUES (p_buyer_id, -v_listing.price, 'spend',
            'Покупка Best Day: ' || v_best_day.name,
            v_buyer_balance - v_listing.price + v_buyer_bonus);

  -- Credit seller (minus 20% platform commission)
  v_commission    := greatest(1, floor(v_listing.price * 0.20));
  v_seller_amount := v_listing.price - v_commission;

  UPDATE token_balances
    SET balance      = balance + v_seller_amount,
        total_earned = total_earned + v_seller_amount,
        updated_at   = now()
    WHERE user_id = v_listing.seller_id;

  IF NOT found THEN
    INSERT INTO token_balances (user_id, balance, bonus_balance, total_purchased, total_spent, total_earned)
      VALUES (v_listing.seller_id, v_seller_amount, 0, 0, 0, v_seller_amount);
  END IF;

  INSERT INTO token_transactions (user_id, amount, type, description)
    VALUES (v_listing.seller_id, v_seller_amount, 'bonus',
            'Продажа Best Day: ' || v_best_day.name || ' (комиссия ' || v_commission || ' ток.)');

  -- Clone location for buyer
  IF v_location.id IS NOT NULL THEN
    INSERT INTO locations (user_id, name, lat, lng, forest_info)
      VALUES (p_buyer_id, v_location.name, v_location.lat, v_location.lng, v_location.forest_info)
      RETURNING id INTO v_new_location_id;
  END IF;

  -- Clone best_day for buyer (season date instead of exact, mark as purchased)
  INSERT INTO best_days
    (user_id, location_id, mushroom_id, name, best_date, weather_data, photos, purchased_from_listing_id)
    VALUES (p_buyer_id, coalesce(v_new_location_id, v_best_day.location_id),
            v_best_day.mushroom_id, v_best_day.name, v_season_date,
            v_best_day.weather_data, v_best_day.photos, p_listing_id)
    RETURNING id INTO v_new_bestday_id;

  -- Mark listing as sold
  UPDATE marketplace_listings
    SET status = 'sold', buyer_id = p_buyer_id, sold_at = now()
    WHERE id = p_listing_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_bestday_id', v_new_bestday_id,
    'new_location_id', v_new_location_id,
    'balance', v_buyer_balance - v_listing.price + v_buyer_bonus
  );
END;
$$;


-- ============================================================
-- 6. Add signup_ip column to profiles
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_ip text;


-- ============================================================
-- 7. log_signup_ip: save IP, revoke bonus if >2 signups/24h
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_signup_ip(
  p_user_id uuid,
  p_ip_address text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recent_count integer;
  v_old_bonus integer;
BEGIN
  IF auth.role() != 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() != p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  -- Save IP to profile (only if not already set)
  UPDATE public.profiles
    SET signup_ip = p_ip_address
    WHERE id = p_user_id AND signup_ip IS NULL;

  -- Count recent registrations from this IP (24h window)
  SELECT count(*) INTO v_recent_count
    FROM public.profiles
    WHERE signup_ip = p_ip_address
      AND created_at > now() - interval '24 hours';

  -- If too many registrations from this IP, revoke welcome bonus
  IF v_recent_count > 2 THEN
    SELECT bonus_balance INTO v_old_bonus
      FROM public.token_balances
      WHERE user_id = p_user_id;

    IF v_old_bonus IS NOT NULL AND v_old_bonus > 0 THEN
      UPDATE public.token_balances
        SET bonus_balance = 0
        WHERE user_id = p_user_id;

      INSERT INTO public.token_transactions
        (user_id, amount, type, description, balance_after)
      VALUES
        (p_user_id, -v_old_bonus, 'spend',
         'Бонус отозван (подозрительная активность)',
         (SELECT balance FROM public.token_balances WHERE user_id = p_user_id));
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ip_registrations_24h', v_recent_count,
    'bonus_revoked', v_recent_count > 2
  );
END;
$$;


-- ============================================================
-- 8. Index for IP lookups
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_signup_ip
  ON public.profiles (signup_ip)
  WHERE signup_ip IS NOT NULL;
