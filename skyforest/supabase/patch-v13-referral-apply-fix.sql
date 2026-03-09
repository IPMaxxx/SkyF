-- patch-v13: Fix apply_referral race condition (ON CONFLICT DO NOTHING)
--
-- Problem: apply_referral checked v_already_linked separately from the INSERT,
-- creating a race condition. If two concurrent requests both passed the check
-- and then both tried to insert, the second would throw a unique constraint
-- violation (PostgreSQL error), causing a 500 in the API route instead of
-- a graceful "already_linked" response.
--
-- Fix: use INSERT ... ON CONFLICT DO NOTHING and check the result to distinguish
-- "just linked for the first time" from "was already linked".

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
  v_referrer_id      uuid;
  v_rows_affected    int := 0;
begin
  -- Lookup the referral code
  select id, user_id into v_referral_code_id, v_referrer_id
  from public.referral_codes
  where code = upper(p_code);

  if v_referral_code_id is null then
    return jsonb_build_object('success', false, 'error', 'invalid_code');
  end if;

  -- Prevent self-referral
  if v_referrer_id = p_new_user_id then
    return jsonb_build_object('success', false, 'error', 'self_referral');
  end if;

  -- Insert link; ON CONFLICT handles both race conditions and deliberate retries
  insert into public.referral_links (referral_code_id, referrer_id, referred_user_id)
  values (v_referral_code_id, v_referrer_id, p_new_user_id)
  on conflict (referred_user_id) do nothing;

  get diagnostics v_rows_affected = row_count;

  -- Already linked (row already existed before this call)
  if v_rows_affected = 0 then
    return jsonb_build_object('success', false, 'error', 'already_linked');
  end if;

  -- Increment uses counter only on actual new link
  update public.referral_codes
  set uses_count = uses_count + 1
  where id = v_referral_code_id;

  return jsonb_build_object('success', true);
end;
$$;
