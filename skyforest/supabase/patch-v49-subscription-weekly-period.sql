-- v49: недельный период подписки в user_subscriptions.
--
-- Применяется вручную в Supabase SQL Editor.
--
-- Короткий тариф Mushroom Checker стал недельным ($5/неделя вместо $2/месяц,
-- товар ai.skyforest.mushroomchecker.sub.weekly). Ограничение из patch-v41
-- допускало только 'monthly' и 'yearly', поэтому первая же недельная покупка
-- не записалась бы вовсе: verify-subscription получил бы 23514 на insert и
-- ответил 500, а оплаченная подписка осталась бы без прав в приложении.
--
-- 'monthly' остаётся разрешённым намеренно: месячный товар снят с продажи, но
-- по нему есть действующие подписчики, и их строки продлеваются как раньше.
-- Значения периодов совпадают с типом SubscriptionPeriod
-- (src/lib/native/iapProducts.ts).
--
-- Порядок выкатки не важен: патч только расширяет набор допустимых значений,
-- существующие строки под новое ограничение подходят все.

ALTER TABLE public.user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_period_check;

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_period_check
  CHECK (period IN ('weekly', 'monthly', 'yearly'));
