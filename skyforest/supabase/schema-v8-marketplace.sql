-- Marketplace: sell/buy Best Days between users
-- v8 — marketplace_listings table + RPC helpers

create table if not exists marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  best_day_id uuid not null references best_days(id) on delete cascade,
  price integer not null check (price > 0),
  season text not null check (season in ('winter','spring','summer','autumn')),
  status text not null default 'active' check (status in ('active','sold','cancelled')),
  buyer_id uuid references profiles(id),
  sold_at timestamptz,
  created_at timestamptz default now()
);

create index idx_marketplace_status on marketplace_listings(status);
create index idx_marketplace_seller on marketplace_listings(seller_id);
create unique index idx_marketplace_bestday_active on marketplace_listings(best_day_id)
  where status = 'active';

alter table marketplace_listings enable row level security;

create policy "Anyone can view active listings"
  on marketplace_listings for select
  using (status = 'active' or seller_id = auth.uid() or buyer_id = auth.uid());

create policy "Seller can insert own listings"
  on marketplace_listings for insert
  with check (seller_id = auth.uid());

create policy "Seller can cancel own listings"
  on marketplace_listings for update
  using (seller_id = auth.uid() and status = 'active');

-- NOTE: No extra profiles policy needed. The marketplace RPC uses security
-- definer and reads profiles directly. The existing "Users can view own
-- profile" policy is sufficient.

-- NOTE: No permissive RLS policies on best_days or locations for marketplace.
-- The marketplace RPC get_marketplace_listings() uses security definer and
-- bypasses RLS. Adding permissive SELECT policies here would leak other
-- users' data into normal dashboard queries (PERMISSIVE policies are OR'd).

-- RPC: get all active marketplace listings with full data (security definer bypasses RLS)
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
        'best_date', bd.best_date,
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

-- RPC: atomically buy a listing (spend tokens, clone best day & location)
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
  -- Lock listing row
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

  -- Check buyer balance
  select balance into v_buyer_balance
    from token_balances
    where user_id = p_buyer_id
    for update;

  if v_buyer_balance is null or v_buyer_balance < v_listing.price then
    return jsonb_build_object('success', false, 'error', 'insufficient', 'balance', coalesce(v_buyer_balance, 0));
  end if;

  -- Load best_day
  select * into v_best_day
    from best_days
    where id = v_listing.best_day_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'bestday_missing');
  end if;

  -- Load location
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
    values (p_buyer_id, v_listing.price, 'spend',
            'Покупка Best Day: ' || v_best_day.name,
            v_buyer_balance - v_listing.price);

  -- Credit seller
  update token_balances
    set balance = balance + v_listing.price,
        total_purchased = total_purchased + v_listing.price,
        updated_at = now()
    where user_id = v_listing.seller_id;

  if not found then
    insert into token_balances (user_id, balance, total_purchased, total_spent)
      values (v_listing.seller_id, v_listing.price, v_listing.price, 0);
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
