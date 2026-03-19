-- PATCH v24: Allow multiple buyers per listing
--
-- Listings stay active after purchase. Only the seller can delist.
-- Same user cannot buy the same listing twice.
-- Search excludes listings already purchased by the current user.


-- 1. Rebuild buy_marketplace_listing: no status change, duplicate check
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
  v_already_bought boolean;
BEGIN
  SELECT p.signup_ip
    INTO v_buyer_ip
    FROM profiles p
    WHERE p.id = p_buyer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_account');
  END IF;

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

  -- Prevent duplicate purchase
  SELECT EXISTS(
    SELECT 1 FROM best_days
    WHERE user_id = p_buyer_id
      AND purchased_from_listing_id = p_listing_id
  ) INTO v_already_bought;

  IF v_already_bought THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_purchased');
  END IF;

  -- IP cross-check
  IF v_buyer_ip IS NOT NULL THEN
    SELECT p.signup_ip INTO v_seller_ip
      FROM profiles p
      WHERE p.id = v_listing.seller_id;

    IF v_seller_ip IS NOT NULL AND v_buyer_ip = v_seller_ip THEN
      RETURN jsonb_build_object('success', false, 'error', 'ip_conflict');
    END IF;
  END IF;

  -- Check REAL balance only
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

  v_season_date := CASE v_listing.season
    WHEN 'winter' THEN make_date(extract(year FROM v_best_day.best_date)::int, 1, 1)
    WHEN 'spring' THEN make_date(extract(year FROM v_best_day.best_date)::int, 4, 1)
    WHEN 'summer' THEN make_date(extract(year FROM v_best_day.best_date)::int, 7, 1)
    WHEN 'autumn' THEN make_date(extract(year FROM v_best_day.best_date)::int, 10, 1)
  END;

  -- Debit buyer (real balance only)
  UPDATE token_balances
    SET balance     = balance - v_listing.price,
        total_spent = total_spent + v_listing.price,
        updated_at  = now()
    WHERE user_id = p_buyer_id;

  INSERT INTO token_transactions (user_id, amount, type, description, balance_after)
    VALUES (p_buyer_id, -v_listing.price, 'spend',
            'Покупка Best Day: ' || v_best_day.name,
            v_buyer_balance - v_listing.price + v_buyer_bonus);

  -- Credit seller (minus 20% commission)
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

  -- Clone best_day for buyer (season date, marked as purchased)
  INSERT INTO best_days
    (user_id, location_id, mushroom_id, name, best_date, weather_data, photos, purchased_from_listing_id)
    VALUES (p_buyer_id, coalesce(v_new_location_id, v_best_day.location_id),
            v_best_day.mushroom_id, v_best_day.name, v_season_date,
            v_best_day.weather_data, v_best_day.photos, p_listing_id)
    RETURNING id INTO v_new_bestday_id;

  -- Listing stays active — only seller can delist

  RETURN jsonb_build_object(
    'success', true,
    'new_bestday_id', v_new_bestday_id,
    'new_location_id', v_new_location_id,
    'balance', v_buyer_balance - v_listing.price + v_buyer_bonus
  );
END;
$$;


-- 2. Update search: exclude listings already purchased by the current user
--    (full function from patch-v22 with display coords, rate limit, + this filter)
CREATE OR REPLACE FUNCTION search_marketplace_listings(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision,
  p_user_id uuid default null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_radius double precision;
  v_search_count integer;
BEGIN
  v_radius := greatest(p_radius_km, 50);

  IF p_user_id IS NOT NULL THEN
    SELECT count(*) INTO v_search_count
      FROM marketplace_search_log
      WHERE user_id = p_user_id
        AND searched_at > now() - interval '1 hour';

    IF v_search_count >= 20 THEN
      RETURN jsonb_build_object(
        'error', 'rate_limit',
        'remaining', 0,
        'retry_after_seconds', extract(epoch FROM (
          (SELECT min(searched_at) FROM marketplace_search_log
           WHERE user_id = p_user_id AND searched_at > now() - interval '1 hour')
          + interval '1 hour' - now()
        ))::integer
      );
    END IF;

    INSERT INTO marketplace_search_log (user_id) VALUES (p_user_id);
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      ml.id,
      ml.seller_id,
      ml.best_day_id,
      ml.price,
      ml.season,
      ml.status,
      ml.created_at,
      loc.lat + (('x' || substr(md5(ml.id::text), 1, 4))::bit(16)::int::double precision / 65535.0 - 0.5) * 0.18 AS display_lat,
      loc.lng + (('x' || substr(md5(ml.id::text), 5, 4))::bit(16)::int::double precision / 65535.0 - 0.5) * 0.18 AS display_lng,
      jsonb_build_object(
        'id', bd.id,
        'name', bd.name,
        'photos', bd.photos,
        'location', CASE WHEN loc.id IS NOT NULL THEN jsonb_build_object(
          'id', loc.id,
          'name', loc.name,
          'forest_info', loc.forest_info
        ) ELSE null END,
        'mushroom', CASE WHEN ms.id IS NOT NULL THEN jsonb_build_object(
          'id', ms.id,
          'inaturalist_id', ms.inaturalist_id,
          'latin_name', ms.latin_name,
          'common_name', ms.common_name,
          'image_url', ms.image_url
        ) ELSE null END
      ) AS best_day,
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name
      ) AS seller
    FROM marketplace_listings ml
    JOIN best_days bd ON bd.id = ml.best_day_id
    LEFT JOIN locations loc ON loc.id = bd.location_id
    LEFT JOIN mushroom_species ms ON ms.id = bd.mushroom_id
    LEFT JOIN profiles p ON p.id = ml.seller_id
    WHERE ml.status = 'active'
      AND loc.id IS NOT NULL
      AND (p_user_id IS NULL OR ml.seller_id != p_user_id)
      AND (p_user_id IS NULL OR NOT EXISTS(
        SELECT 1 FROM best_days bd2
        WHERE bd2.user_id = p_user_id
          AND bd2.purchased_from_listing_id = ml.id
      ))
      AND (
        6371 * acos(
          cos(radians(p_lat)) * cos(radians(loc.lat))
          * cos(radians(loc.lng) - radians(p_lng))
          + sin(radians(p_lat)) * sin(radians(loc.lat))
        )
      ) <= v_radius * (0.8 + random() * 0.4)
    ORDER BY ml.created_at DESC
  ) t;

  IF p_user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'listings', v_result,
      'remaining_searches', greatest(0, 20 - (coalesce(v_search_count, 0) + 1))
    );
  END IF;

  RETURN v_result;
END;
$$;
