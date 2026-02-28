-- PATCH: Fix marketplace RLS so listings are visible to all users
-- Run this if you already applied schema-v8-marketplace.sql

-- 1. Allow reading profiles for marketplace seller display
-- (drop first in case it already exists)
-- Remove overly permissive profiles policy. The marketplace RPC uses
-- security definer so it doesn't need this. Only own profile should be visible.
drop policy if exists "Anyone can read basic profile info" on public.profiles;

-- 2. Remove marketplace permissive policies on best_days and locations.
-- These leaked other users' data into normal queries because PERMISSIVE
-- policies are OR'd. The marketplace RPC uses security definer and
-- does not need these.
drop policy if exists "Anyone can view marketplace best days" on public.best_days;
drop policy if exists "Anyone can view marketplace locations" on public.locations;

-- RPC: search marketplace listings by radius (Haversine). No coordinates in response.
create or replace function search_marketplace_listings(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision
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
      and loc.id is not null
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

-- Legacy: get all listings without coordinates (for backward compat)
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
