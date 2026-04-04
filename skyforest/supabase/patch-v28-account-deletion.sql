-- PATCH v28: Account self-deletion with email preservation
--
-- Users can delete their account. The email is saved in deleted_accounts
-- so that re-registration does not grant free welcome bonus tokens again.

-- ============================================================
-- 1. deleted_accounts table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.deleted_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_user_id uuid NOT NULL,
  email text NOT NULL,
  deleted_at timestamptz DEFAULT now()
);

ALTER TABLE public.deleted_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages deleted accounts"
  ON public.deleted_accounts FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_deleted_accounts_email
  ON public.deleted_accounts (email);


-- ============================================================
-- 2. Modify welcome bonus: skip if email was previously deleted
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_profile_tokens()
RETURNS trigger AS $$
DECLARE
  v_was_deleted boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.deleted_accounts WHERE email = new.email
  ) INTO v_was_deleted;

  INSERT INTO public.token_balances (user_id, balance, bonus_balance, total_purchased, total_spent)
  VALUES (new.id, 0, CASE WHEN v_was_deleted THEN 0 ELSE 20 END, 0, 0);

  IF NOT v_was_deleted THEN
    INSERT INTO public.token_transactions (user_id, amount, type, description, balance_after)
    VALUES (new.id, 20, 'bonus', 'Приветственный бонус (на сервисы платформы)', 20);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
