-- PATCH: Fix marketplace RLS so listings are visible to all users
-- Run this if you already applied schema-v8-marketplace.sql

-- 1. Allow reading profiles for marketplace seller display
-- (drop first in case it already exists)
drop policy if exists "Anyone can read basic profile info" on public.profiles;
create policy "Anyone can read basic profile info"
  on public.profiles for select
  using (
    auth.uid() = id
    or id in (select seller_id from marketplace_listings where status = 'active')
  );

-- 2. Allow reading best_days that are listed on the marketplace
drop policy if exists "Anyone can view marketplace best days" on public.best_days;
create policy "Anyone can view marketplace best days"
  on public.best_days for select
  using (
    id in (select best_day_id from marketplace_listings where status = 'active')
  );

-- 3. Allow reading locations of marketplace best days
drop policy if exists "Anyone can view marketplace locations" on public.locations;
create policy "Anyone can view marketplace locations"
  on public.locations for select
  using (
    id in (
      select bd.location_id from best_days bd
      join marketplace_listings ml on ml.best_day_id = bd.id
      where ml.status = 'active'
    )
  );

-- 4. RPC function that returns listings with full data (security definer = bypasses RLS)
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
          'lat', round(loc.lat::numeric, 1),
          'lng', round(loc.lng::numeric, 1),
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
