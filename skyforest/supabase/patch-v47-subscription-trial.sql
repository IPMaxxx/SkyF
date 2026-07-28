-- v47: признак бесплатного пробного периода у подписки.
--
-- Нужен приложениям со своей моделью подписки (Mushroom Checker): в триале
-- число распознаваний ограничено (FLAVORS.checker.subscriptionPlan
-- .trialIdentifyLimit), в оплаченной подписке лимита нет. Пишется только
-- service-role — из /api/native/iap/verify-subscription и крона подписок
-- по ответу стора (introductory offer / free trial).

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS is_trial boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_subscriptions.is_trial IS
  'Текущий период — бесплатный пробный (introductory offer стора)';
