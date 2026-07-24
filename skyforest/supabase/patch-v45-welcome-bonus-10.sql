-- PATCH v45: Re-enable the welcome bonus for new users (10 tokens)
--
-- New users get 10 bonus tokens so they can try the paid services
-- (identify, forecast, rain map, compare) without buying first.
--
-- Bonus tokens land in bonus_balance (spendable on platform services,
-- NOT withdrawable). Anti-abuse: if the email was previously deleted
-- (recorded in deleted_accounts, see patch-v28), the bonus is skipped so
-- users can't farm it by delete + re-register.
--
-- Supersedes patch-v44 (bonus disabled) and patch-v28 section 2 (was 20).
-- The description is left NULL so the UI shows the localized "Bonus"
-- label (txTypeBonus) instead of a hardcoded language.

CREATE OR REPLACE FUNCTION public.handle_new_profile_tokens()
RETURNS trigger AS $$
DECLARE
  v_was_deleted boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.deleted_accounts WHERE email = new.email
  ) INTO v_was_deleted;

  INSERT INTO public.token_balances (user_id, balance, bonus_balance, total_purchased, total_spent)
  VALUES (new.id, 0, CASE WHEN v_was_deleted THEN 0 ELSE 10 END, 0, 0);

  IF NOT v_was_deleted THEN
    INSERT INTO public.token_transactions (user_id, amount, type, description, balance_after)
    VALUES (new.id, 10, 'bonus', NULL, 10);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
