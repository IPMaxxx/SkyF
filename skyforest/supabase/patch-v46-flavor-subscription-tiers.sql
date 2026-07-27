-- v46: тиры подписок флейвор-приложений Mushroom Checker и WayBack.
-- Подписки ai.skyforest.mushroomchecker.sub.* / ai.skyforest.wayback.sub.*
-- пишутся в user_subscriptions с tier 'checker' / 'wayback' (без бонус-токенов,
-- бенефиты определяются в src/lib/subscription.ts TIER_BENEFITS).

ALTER TABLE user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_tier_check;

ALTER TABLE user_subscriptions
  ADD CONSTRAINT user_subscriptions_tier_check
  CHECK (tier IN ('forager', 'pro', 'checker', 'wayback'));
