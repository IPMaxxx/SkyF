-- patch-v17: Fix add_tokens auth check for security definer callers
--
-- Problem: add_tokens checks auth.role() = 'service_role', but when called
-- from other security definer functions (apply_referral_purchase_bonus,
-- buy_marketplace_listing), auth.role() returns the function owner's role
-- (e.g. 'authenticated' or the db owner), not 'service_role'.
--
-- Fix: Remove the auth.role() check. Security is already enforced by
-- REVOKE EXECUTE from anon and authenticated roles (done in schema-v3).
-- Only service_role and security definer functions can call add_tokens.

create or replace function public.add_tokens(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_description text,
  p_payment_id text default null
) returns jsonb as $$
declare
  v_new_balance integer;
begin
  insert into public.token_balances (user_id, balance, total_purchased, total_spent)
  values (p_user_id, p_amount, case when p_type = 'purchase' then p_amount else 0 end, 0)
  on conflict (user_id) do update
  set balance = token_balances.balance + p_amount,
      total_purchased = token_balances.total_purchased + case when p_type = 'purchase' then p_amount else 0 end,
      updated_at = now()
  returning balance into v_new_balance;

  insert into public.token_transactions (user_id, amount, type, description, payment_id, balance_after)
  values (p_user_id, p_amount, p_type, p_description, p_payment_id, v_new_balance);

  return jsonb_build_object('success', true, 'balance', v_new_balance);
end;
$$ language plpgsql security definer;

-- Re-enforce REVOKE (idempotent, just in case)
revoke execute on function public.add_tokens from anon;
revoke execute on function public.add_tokens from authenticated;
