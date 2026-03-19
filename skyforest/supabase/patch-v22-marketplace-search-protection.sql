-- PATCH v22: Anti-triangulation protection for marketplace search
-- 1. Search rate-limit log table
-- 2. Jitter ±20% on radius boundary
-- 3. Minimum radius 50 km enforced in SQL

-- 1. Rate-limit log
create table if not exists marketplace_search_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  searched_at timestamptz not null default now()
);

create index if not exists idx_search_log_user_time
  on marketplace_search_log (user_id, searched_at desc);

alter table marketplace_search_log enable row level security;

-- 2. Recreate search function with jitter + min radius
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
  v_radius double precision;
  v_search_count integer;
begin
  -- Enforce minimum radius
  v_radius := greatest(p_radius_km, 50);

  -- Rate-limit: count searches in last hour (only for authenticated users)
  if p_user_id is not null then
    select count(*) into v_search_count
      from marketplace_search_log
      where user_id = p_user_id
        and searched_at > now() - interval '1 hour';

    if v_search_count >= 5 then
      return jsonb_build_object(
        'error', 'rate_limit',
        'remaining', 0,
        'retry_after_seconds', extract(epoch from (
          (select min(searched_at) from marketplace_search_log
           where user_id = p_user_id and searched_at > now() - interval '1 hour')
          + interval '1 hour' - now()
        ))::integer
      );
    end if;

    insert into marketplace_search_log (user_id) values (p_user_id);
  end if;

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
      loc.lat + (('x' || substr(md5(ml.id::text), 1, 4))::bit(16)::int::double precision / 65535.0 - 0.5) * 0.18 as display_lat,
      loc.lng + (('x' || substr(md5(ml.id::text), 5, 4))::bit(16)::int::double precision / 65535.0 - 0.5) * 0.18 as display_lng,
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
      ) <= v_radius * (0.8 + random() * 0.4)
    order by ml.created_at desc
  ) t;

  -- Return results with remaining searches info
  if p_user_id is not null then
    return jsonb_build_object(
      'listings', v_result,
      'remaining_searches', greatest(0, 5 - (coalesce(v_search_count, 0) + 1))
    );
  end if;

  return v_result;
end;
$$;

-- 3. Cleanup: auto-delete old search logs (older than 2 hours)
create or replace function cleanup_old_search_logs()
returns void
language sql
security definer
as $$
  delete from marketplace_search_log
  where searched_at < now() - interval '2 hours';
$$;
