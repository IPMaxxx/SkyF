-- PATCH v40: защита от двойного начисления токенов по одному платежу (IAP-аудит)
--
-- Проблема: creditTokenPurchase делает select-then-insert без блокировки —
-- два конкурентных запроса verify (например, retry клиента или повторное
-- событие approved) могут оба пройти select-проверку и начислить токены дважды.
--
-- Решение: partial UNIQUE-индекс на token_transactions.payment_id.
-- payment_id заполняется только при начислении покупки (creditTokenPurchase);
-- бонусы/списания пишут NULL и под индекс не попадают.
-- Код (payment-credit.ts) обрабатывает нарушение уникальности (SQLSTATE 23505)
-- как «уже начислено» — идемпотентный успех.
--
-- ПЕРЕД созданием индекса проверьте, что существующие данные не содержат
-- дублей (запрос должен вернуть 0 строк):
--
--   SELECT payment_id, count(*)
--   FROM public.token_transactions
--   WHERE payment_id IS NOT NULL
--   GROUP BY payment_id
--   HAVING count(*) > 1;
--
-- Если дубли есть — разберитесь с ними вручную (это следы уже случившегося
-- двойного начисления), затем создайте индекс.

CREATE UNIQUE INDEX IF NOT EXISTS token_transactions_payment_id_unique
  ON public.token_transactions (payment_id)
  WHERE payment_id IS NOT NULL;
