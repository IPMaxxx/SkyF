-- PATCH v44: Temporarily disable the welcome bonus for new users
--
-- New users still get a token_balances row, but with 0 bonus tokens
-- and no 'bonus' transaction. The deleted_accounts check (patch-v28)
-- becomes irrelevant while the bonus is off, but the logic is kept
-- out entirely for simplicity.
--
-- To RE-ENABLE the bonus later, re-run the function definition from
-- patch-v28-account-deletion.sql (section 2).

CREATE OR REPLACE FUNCTION public.handle_new_profile_tokens()
RETURNS trigger AS $$
BEGIN
  -- Welcome bonus temporarily disabled (was: 20 bonus tokens)
  INSERT INTO public.token_balances (user_id, balance, bonus_balance, total_purchased, total_spent)
  VALUES (new.id, 0, 0, 0, 0);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
