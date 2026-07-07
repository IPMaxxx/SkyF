-- PATCH v41: Премиум-подписки (Forager / Pro) + новое правило вывода токенов
--
-- Применяется вручную в Supabase SQL Editor.
--
-- 1. user_subscriptions — состояние подписок App Store / Google Play
--    (+ месячные счётчики включённых лимитов identify/forecast).
-- 2. use_subscription_quota — атомарное расходование месячного лимита.
-- 3. add_bonus_tokens — идемпотентное зачисление бонусных токенов
--    (месячный пул подписки) в bonus_balance.
-- 4. Вывод токенов: согласно политике сторов купленные и бонусные токены
--    не подлежат обмену на деньги. Доступная к выводу сумма считается
--    только от дохода на маркетплейсе (token_balances.total_earned)
--    минус уже выведенное (новая колонка total_withdrawn, новый тип
--    транзакции 'withdraw', RPC withdraw_tokens / get_withdrawable).


-- ============================================================
-- 1. Таблица подписок
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  product_id text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('forager', 'pro')),
  period text NOT NULL CHECK (period IN ('monthly', 'yearly')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'canceled', 'grace')),
  -- iOS: originalTransactionId; Android: purchaseToken. Ключ идемпотентности.
  original_transaction_id text,
  purchase_token text,
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  -- Последнее зачисление месячного бонус-пула (у годовых — помесячно).
  last_bonus_grant_at timestamptz,
  -- Месячные счётчики включённых лимитов (сбрасываются при зачислении пула).
  identify_used integer NOT NULL DEFAULT 0,
  forecast_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_original_tx_unique
  ON public.user_subscriptions (original_transaction_id)
  WHERE original_transaction_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_purchase_token_unique
  ON public.user_subscriptions (purchase_token)
  WHERE purchase_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status
  ON public.user_subscriptions (user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status_period_end
  ON public.user_subscriptions (status, current_period_end);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Пользователь видит только свои подписки; запись — только service_role.
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);


-- ============================================================
-- 2. Атомарное расходование месячного лимита подписки
--    (identify_used / forecast_used). Возвращает jsonb:
--    { success, used, limit } — success=false, если лимит исчерпан
--    или активной подписки нет.
-- ============================================================

CREATE OR REPLACE FUNCTION public.use_subscription_quota(
  p_user_id uuid,
  p_kind text,      -- 'identify' | 'forecast'
  p_limit integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
  v_used integer;
BEGIN
  IF auth.role() != 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() != p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF p_kind NOT IN ('identify', 'forecast') OR p_limit <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_args');
  END IF;

  -- 'canceled' (автопродление выключено) сохраняет права до конца периода.
  IF p_kind = 'identify' THEN
    UPDATE public.user_subscriptions
      SET identify_used = identify_used + 1, updated_at = now()
      WHERE user_id = p_user_id
        AND status IN ('active', 'grace', 'canceled')
        AND current_period_end > now()
        AND identify_used < p_limit
      RETURNING id, identify_used INTO v_id, v_used;
  ELSE
    UPDATE public.user_subscriptions
      SET forecast_used = forecast_used + 1, updated_at = now()
      WHERE user_id = p_user_id
        AND status IN ('active', 'grace', 'canceled')
        AND current_period_end > now()
        AND forecast_used < p_limit
      RETURNING id, forecast_used INTO v_id, v_used;
  END IF;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'quota_exhausted');
  END IF;

  RETURN jsonb_build_object('success', true, 'used', v_used, 'limit', p_limit);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.use_subscription_quota(uuid, text, integer) FROM anon;


-- ============================================================
-- 3. Зачисление бонусных токенов подписки в bonus_balance.
--    Идемпотентность — по payment_id (partial UNIQUE-индекс из patch-v40):
--    повторная вставка падает с 23505, код трактует это как успех.
-- ============================================================

CREATE OR REPLACE FUNCTION public.add_bonus_tokens(
  p_user_id uuid,
  p_amount integer,
  p_description text,
  p_payment_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance integer;
  v_bonus integer;
BEGIN
  IF auth.role() != 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF p_amount <= 0 OR p_payment_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_args');
  END IF;

  INSERT INTO public.token_balances (user_id, balance, bonus_balance, total_purchased, total_spent)
  VALUES (p_user_id, 0, p_amount, 0, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET bonus_balance = token_balances.bonus_balance + p_amount,
      updated_at = now()
  RETURNING balance, bonus_balance INTO v_balance, v_bonus;

  -- 23505 при дубле payment_id пробрасывается вызывающему коду.
  INSERT INTO public.token_transactions
    (user_id, amount, type, description, payment_id, balance_after)
  VALUES
    (p_user_id, p_amount, 'bonus', p_description, p_payment_id, v_balance + v_bonus);

  RETURN jsonb_build_object('success', true, 'balance', v_balance + v_bonus,
                            'bonus_balance', v_bonus);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_bonus_tokens(uuid, integer, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_bonus_tokens(uuid, integer, text, text) FROM authenticated;


-- ============================================================
-- 4. Вывод токенов: только доход с маркетплейса минус выведенное
-- ============================================================

-- 4.1. Новый тип транзакции 'withdraw'
ALTER TABLE public.token_transactions
  DROP CONSTRAINT IF EXISTS token_transactions_type_check;
ALTER TABLE public.token_transactions
  ADD CONSTRAINT token_transactions_type_check
  CHECK (type IN ('purchase', 'spend', 'bonus', 'refund', 'withdraw'));

-- 4.2. Счётчик выведенного
ALTER TABLE public.token_balances
  ADD COLUMN IF NOT EXISTS total_withdrawn integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.token_balances.total_withdrawn IS
  'Сумма токенов, выведенных в деньги (для правила вывода: total_earned - total_withdrawn)';

-- 4.3. Бэкфилл из существующих заявок на вывод
--      (spend_tokens писал их как type=spend с описанием «Вывод N токенов»)
UPDATE public.token_balances tb
SET total_withdrawn = sub.withdrawn
FROM (
  SELECT user_id, coalesce(sum(-amount), 0)::integer AS withdrawn
  FROM public.token_transactions
  WHERE type = 'spend' AND description LIKE 'Вывод % токенов'
  GROUP BY user_id
) sub
WHERE tb.user_id = sub.user_id AND tb.total_withdrawn = 0;

-- 4.4. Доступно к выводу
CREATE OR REPLACE FUNCTION public.get_withdrawable(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_balance integer;
  v_earned integer;
  v_withdrawn integer;
BEGIN
  IF auth.role() != 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() != p_user_id) THEN
    RETURN jsonb_build_object('available', 0, 'earned', 0, 'withdrawn', 0);
  END IF;

  SELECT balance, coalesce(total_earned, 0), coalesce(total_withdrawn, 0)
    INTO v_balance, v_earned, v_withdrawn
    FROM public.token_balances
    WHERE user_id = p_user_id;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('available', 0, 'earned', 0, 'withdrawn', 0);
  END IF;

  RETURN jsonb_build_object(
    'available', greatest(0, least(v_balance, v_earned - v_withdrawn)),
    'earned', v_earned,
    'withdrawn', v_withdrawn
  );
END;
$$;

-- 4.5. Списание при выводе: лимит — заработанное минус выведенное,
--      только реальный баланс (бонусные не выводятся).
CREATE OR REPLACE FUNCTION public.withdraw_tokens(
  p_user_id uuid,
  p_amount integer,
  p_description text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance integer;
  v_bonus integer;
  v_earned integer;
  v_withdrawn integer;
  v_available integer;
BEGIN
  IF auth.role() != 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() != p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  SELECT balance, coalesce(bonus_balance, 0),
         coalesce(total_earned, 0), coalesce(total_withdrawn, 0)
    INTO v_balance, v_bonus, v_earned, v_withdrawn
    FROM public.token_balances
    WHERE user_id = p_user_id
    FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_account');
  END IF;

  v_available := greatest(0, least(v_balance, v_earned - v_withdrawn));

  IF p_amount > v_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient',
                              'available', v_available);
  END IF;

  UPDATE public.token_balances
  SET balance         = balance - p_amount,
      total_spent     = total_spent + p_amount,
      total_withdrawn = total_withdrawn + p_amount,
      updated_at      = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.token_transactions
    (user_id, amount, type, description, balance_after)
  VALUES
    (p_user_id, -p_amount, 'withdraw', p_description,
     v_balance - p_amount + v_bonus);

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_balance - p_amount + v_bonus,
    'available', v_available - p_amount
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.withdraw_tokens(uuid, integer, text) FROM anon;
