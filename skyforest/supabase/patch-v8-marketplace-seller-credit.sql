-- PATCH: Fix seller credit in marketplace — use total_earned instead of total_purchased
-- Also add total_earned column to token_balances for proper accounting

-- 1. Add total_earned column
alter table public.token_balances
  add column if not exists total_earned integer not null default 0;

-- 2. Backfill total_earned from existing marketplace sales
update public.token_balances tb
set total_earned = coalesce((
  select sum(tt.amount)
  from public.token_transactions tt
  where tt.user_id = tb.user_id
    and tt.type = 'bonus'
    and tt.description like 'Продажа Best Day:%'
), 0);

-- 3. Recreate buy_marketplace_listing with correct seller credit
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

  -- Credit seller (use total_earned, not total_purchased)
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

  -- Clone best_day for buyer
  insert into best_days (user_id, location_id, mushroom_id, name, best_date, weather_data, photos)
    values (p_buyer_id, coalesce(v_new_location_id, v_best_day.location_id),
            v_best_day.mushroom_id, v_best_day.name, v_best_day.best_date,
            v_best_day.weather_data, v_best_day.photos)
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
