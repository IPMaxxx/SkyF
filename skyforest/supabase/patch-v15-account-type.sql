-- patch-v15: Add account_type column to profiles
-- Allows marking certain users as "admin" (set manually in DB).
-- Admin users will be visually distinguished in the UI.

alter table public.profiles
  add column if not exists account_type text not null default 'user';

comment on column public.profiles.account_type is
  'Account role: "user" (default) or "admin". Set manually via SQL/dashboard.';

-- Update search_marketplace_listings to include account_type in seller object
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
        'full_name', p.full_name,
        'account_type', p.account_type
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

-- Update legacy get_marketplace_listings too
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
        'full_name', p.full_name,
        'account_type', p.account_type
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
