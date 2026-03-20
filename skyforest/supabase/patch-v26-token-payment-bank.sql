-- PATCH v26: Store bank payment details on token purchase (bePaid)

ALTER TABLE public.token_transactions
  ADD COLUMN IF NOT EXISTS payment_amount_cents integer,
  ADD COLUMN IF NOT EXISTS payment_currency text,
  ADD COLUMN IF NOT EXISTS payment_tracking_id text;

COMMENT ON COLUMN public.token_transactions.payment_amount_cents IS 'Amount charged in minor currency units (e.g. kopecks for BYN)';
COMMENT ON COLUMN public.token_transactions.payment_currency IS 'ISO currency code from payment gateway';
COMMENT ON COLUMN public.token_transactions.payment_tracking_id IS 'Gateway order tracking_id (e.g. userId:tokens)';

-- Replace 5-parameter add_tokens with 8-parameter version (new cols + bank meta)
DROP FUNCTION IF EXISTS public.add_tokens(uuid, integer, text, text, text);

CREATE OR REPLACE FUNCTION public.add_tokens(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_description text,
  p_payment_id text DEFAULT NULL,
  p_payment_amount_cents integer DEFAULT NULL,
  p_payment_currency text DEFAULT NULL,
  p_payment_tracking_id text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  INSERT INTO public.token_balances (user_id, balance, total_purchased, total_spent)
  VALUES (p_user_id, p_amount, CASE WHEN p_type = 'purchase' THEN p_amount ELSE 0 END, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = token_balances.balance + p_amount,
      total_purchased = token_balances.total_purchased + CASE WHEN p_type = 'purchase' THEN p_amount ELSE 0 END,
      updated_at = now()
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.token_transactions (
    user_id, amount, type, description, payment_id, balance_after,
    payment_amount_cents, payment_currency, payment_tracking_id
  )
  VALUES (
    p_user_id, p_amount, p_type, p_description, p_payment_id, v_new_balance,
    p_payment_amount_cents, p_payment_currency, p_payment_tracking_id
  );

  RETURN jsonb_build_object('success', true, 'balance', v_new_balance);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_tokens(uuid, integer, text, text, text, integer, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_tokens(uuid, integer, text, text, text, integer, text, text) FROM authenticated;
