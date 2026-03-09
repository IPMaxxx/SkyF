-- PATCH v12: Marketplace resale protection + hide exact date from buyers
-- 1. Add purchased_from_listing_id to best_days (NULL = original, non-NULL = bought)
-- 2. Update buy_marketplace_listing: mark cloned best_day, replace date with season date
-- 3. Remove best_date from search/get marketplace listing RPCs

-- 1. Column to track purchased best days
alter table public.best_days
  add column if not exists purchased_from_listing_id uuid
  references marketplace_listings(id);

-- 2. Recreate buy_marketplace_listing with resale protection + date hiding
create or replace function buy_marketplace_listing(
  p_listing_id uuid,
  p_buyer_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_listing marketplace_listings;
  v_best_day best_days;
  v_location locations;
  v_buyer_balance integer;
  v_new_location_id uuid;
  v_new_bestday_id uuid;
  v_season_date date;
begin
  select * into v_listing
    from marketplace_listings
    where id = p_listing_id and status = 'active'
    for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if v_listing.seller_id = p_buyer_id then
    return jsonb_build_object('success', false, 'error', 'own_listing');
  end if;

  select balance into v_buyer_balance
    from token_balances
    where user_id = p_buyer_id
    for update;

  if v_buyer_balance is null or v_buyer_balance < v_listing.price then
    return jsonb_build_object('success', false, 'error', 'insufficient', 'balance', coalesce(v_buyer_balance, 0));
  end if;

  select * into v_best_day
    from best_days
    where id = v_listing.best_day_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'bestday_missing');
  end if;

  select * into v_location
    from locations
    where id = v_best_day.location_id;

  -- Replace exact date with first day of season (protect seller's data)
  v_season_date := case v_listing.season
    when 'winter' then make_date(extract(year from v_best_day.best_date)::int, 1, 1)
    when 'spring' then make_date(extract(year from v_best_day.best_date)::int, 4, 1)
    when 'summer' then make_date(extract(year from v_best_day.best_date)::int, 7, 1)
    when 'autumn' then make_date(extract(year from v_best_day.best_date)::int, 10, 1)
  end;

  -- Debit buyer
  update token_balances
    set balance = balance - v_listing.price,
        total_spent = total_spent + v_listing.price,
        updated_at = now()
    where user_id = p_buyer_id;

  insert into token_transactions (user_id, amount, type, description, balance_after)
    values (p_buyer_id, -v_listing.price, 'spend',
            'Покупка Best Day: ' || v_best_day.name,
            v_buyer_balance - v_listing.price);

  -- Credit seller
  update token_balances
    set balance = balance + v_listing.price,
        total_earned = total_earned + v_listing.price,
        updated_at = now()
    where user_id = v_listing.seller_id;

  if not found then
    insert into token_balances (user_id, balance, total_purchased, total_spent, total_earned)
      values (v_listing.seller_id, v_listing.price, 0, 0, v_listing.price);
  end if;

  insert into token_transactions (user_id, amount, type, description)
    values (v_listing.seller_id, v_listing.price, 'bonus',
            'Продажа Best Day: ' || v_best_day.name);

  -- Clone location for buyer
  if v_location.id is not null then
    insert into locations (user_id, name, lat, lng, forest_info)
      values (p_buyer_id, v_location.name, v_location.lat, v_location.lng, v_location.forest_info)
      returning id into v_new_location_id;
  end if;

  -- Clone best_day for buyer (season date instead of exact, mark as purchased)
  insert into best_days (user_id, location_id, mushroom_id, name, best_date, weather_data, photos, purchased_from_listing_id)
    values (p_buyer_id, coalesce(v_new_location_id, v_best_day.location_id),
            v_best_day.mushroom_id, v_best_day.name, v_season_date,
            v_best_day.weather_data, v_best_day.photos, p_listing_id)
    returning id into v_new_bestday_id;

  -- Mark listing as sold
  update marketplace_listings
    set status = 'sold', buyer_id = p_buyer_id, sold_at = now()
    where id = p_listing_id;

  return jsonb_build_object(
    'success', true,
    'new_bestday_id', v_new_bestday_id,
    'new_location_id', v_new_location_id,
    'balance', v_buyer_balance - v_listing.price
  );
end;
$$;

-- 3. Remove best_date from search results (only season is shown)
create or replace function search_marketplace_listings(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_result jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into v_result
  from (
    select
      ml.id,
      ml.seller_id,
      ml.best_day_id,
      ml.price,
      ml.season,
      ml.status,
      ml.created_at,
      jsonb_build_object(
        'id', bd.id,
        'name', bd.name,
        'photos', bd.photos,
        'location', case when loc.id is not null then jsonb_build_object(
          'id', loc.id,
          'name', loc.name,
          'forest_info', loc.forest_info
        ) else null end,
        'mushroom', case when ms.id is not null then jsonb_build_object(
          'id', ms.id,
          'inaturalist_id', ms.inaturalist_id,
          'latin_name', ms.latin_name,
          'common_name', ms.common_name,
          'image_url', ms.image_url
        ) else null end
      ) as best_day,
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name
      ) as seller
    from marketplace_listings ml
    join best_days bd on bd.id = ml.best_day_id
    left join locations loc on loc.id = bd.location_id
    left join mushroom_species ms on ms.id = bd.mushroom_id
    left join profiles p on p.id = ml.seller_id
    where ml.status = 'active'
      and loc.id is not null
      and (p_user_id is null or ml.seller_id != p_user_id)
      and (
        6371 * acos(
          cos(radians(p_lat)) * cos(radians(loc.lat))
          * cos(radians(loc.lng) - radians(p_lng))
          + sin(radians(p_lat)) * sin(radians(loc.lat))
        )
      ) <= p_radius_km
    order by ml.created_at desc
  ) t;

  return v_result;
end;
$$;

-- 4. Remove best_date from legacy listing function too
create or replace function get_marketplace_listings()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_result jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into v_result
  from (
    select
      ml.id,
      ml.seller_id,
      ml.best_day_id,
      ml.price,
      ml.season,
      ml.status,
      ml.created_at,
      jsonb_build_object(
        'id', bd.id,
        'name', bd.name,
        'photos', bd.photos,
        'location', case when loc.id is not null then jsonb_build_object(
          'id', loc.id,
          'name', loc.name,
          'forest_info', loc.forest_info
        ) else null end,
        'mushroom', case when ms.id is not null then jsonb_build_object(
          'id', ms.id,
          'inaturalist_id', ms.inaturalist_id,
          'latin_name', ms.latin_name,
          'common_name', ms.common_name,
          'image_url', ms.image_url
        ) else null end
      ) as best_day,
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name
      ) as seller
    from marketplace_listings ml
    join best_days bd on bd.id = ml.best_day_id
    left join locations loc on loc.id = bd.location_id
    left join mushroom_species ms on ms.id = bd.mushroom_id
    left join profiles p on p.id = ml.seller_id
    where ml.status = 'active'
    order by ml.created_at desc
  ) t;

  return v_result;
end;
$$;
