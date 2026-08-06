/**
 * Цикл транзакции внутренней покупки, отделённый от плагина стора.
 *
 * Здесь живёт вся логика, из-за которой экран оплаты либо выпускает человека,
 * либо не выпускает: кто ждёт какую покупку, что делать с одобренной
 * транзакцией, когда закрывать её через finish() и с каким исходом отвечать
 * тому, кто нажал кнопку. Работа с `window.CdvPurchase`, сетью и Supabase
 * осталась в native/iap.ts — этот модуль о ней не знает.
 *
 * Разделение сделано не ради красоты. Путь покупки нельзя пройти ни в браузере,
 * ни в проверке, пока он сцеплен с нативным плагином: события приходят из
 * StoreKit, а его на машине сборки нет. Поэтому модуль намеренно не имеет ни
 * одного импорта — ни алиасов `@/`, ни плагинов — и загружается напрямую в Node
 * проверкой fastlane/.iap-purchase-check.mjs, которая гоняет весь цикл на
 * поддельном сторе. Ровно так же живёт offline/deadline.ts.
 */

/** Транзакция плагина — ровно те поля, которые трогает цикл. */
export interface PurchaseTransaction {
  products?: Array<{ id?: string }>;
  productId?: string;
  finish?: () => void;
}

/** Ответ серверной проверки чека. */
export interface VerifyOutcome {
  ok: boolean;
  /** Стор окончательно отверг чек (402/403) — повторять бессмысленно. */
  permanent: boolean;
}

/** Что получает тот, кто нажал кнопку покупки. */
export interface PurchaseOutcome {
  ok: boolean;
  error?: string;
}

/** Подписи, которыми цикл объясняет исход. Локаль выбирает вызывающий. */
export interface PurchaseMessages {
  cancelled: string;
  alreadyOwned: string;
  storeTimeout: string;
}

export interface PurchaseFlowPorts {
  /** Проверка чека на нашем сервере. */
  verify(productId: string, transaction: PurchaseTransaction): Promise<VerifyOutcome>;
  /** Телеметрия: сбои клиентского пути иначе не видны при разборе отказа. */
  log(stage: string, details: { productId?: string; code?: string | number; message?: string }): void;
  /** Сколько токенов даёт товар; null — подписка (токенов не даёт). */
  tokensFor(productId: string): number | null;
}

export interface OrderRequest {
  productId: string;
  /** Заказ у плагина: offer.order(). */
  place: () => Promise<unknown>;
  timeoutMs: number;
  messages: PurchaseMessages;
  /**
   * Незакрытая consumable-покупка блокирует повторную в Google Play
   * (ITEM_ALREADY_OWNED — окно оплаты даже не открывается). У подписок такого
   * тупика нет, и подсказка про перезапуск там только путала бы.
   */
  explainAlreadyOwned?: boolean;
}

export interface PurchaseFlow {
  /** Обработчик события approved плагина. */
  approved(transaction: PurchaseTransaction): Promise<void>;
  /** Обработчик события finished плагина. */
  finished(transaction: PurchaseTransaction): void;
  /** Заказать товар и дождаться исхода. */
  order(request: OrderRequest): Promise<PurchaseOutcome>;
  /** Кому сообщать о «фоновом» начислении токенов (допроведённая покупка). */
  setBackgroundCredit(cb: ((tokens: number) => void) | null): void;
}

/** productId транзакции: у плагина он лежит в двух разных местах. */
export function productIdOf(transaction: PurchaseTransaction | null | undefined): string | undefined {
  return transaction?.products?.[0]?.id ?? transaction?.productId;
}

/** Транзакцию закрываем «мягко»: сбой не должен ломать исход покупки. */
function finishQuietly(transaction: PurchaseTransaction): void {
  try {
    transaction.finish?.();
  } catch {
    /* допроведётся при следующем запуске */
  }
}

export function createPurchaseFlow(ports: PurchaseFlowPorts): PurchaseFlow {
  /** Кто ждёт покупку прямо сейчас: productId → как ему ответить. */
  const pending = new Map<string, (outcome: PurchaseOutcome) => void>();
  let onBackgroundCredit: ((tokens: number) => void) | null = null;

  function settle(productId: string | undefined, outcome: PurchaseOutcome): boolean {
    if (!productId) return false;
    const waiting = pending.get(productId);
    if (!waiting) return false;
    pending.delete(productId);
    waiting(outcome);
    return true;
  }

  async function approved(transaction: PurchaseTransaction): Promise<void> {
    const productId = productIdOf(transaction);
    const wasPending = Boolean(productId && pending.has(productId));
    const result: VerifyOutcome = productId
      ? await ports.verify(productId, transaction)
      : { ok: false, permanent: false };

    if (result.ok) {
      // Резолвим ждущего сразу после серверной проверки: покупка зачислена,
      // ждать события finished незачем. На iOS finished после finish() иногда
      // не приходит (cordova-plugin-purchase 13.x), и спиннер покупки крутился
      // бесконечно при успешной оплате.
      settle(productId, { ok: true });
      finishQuietly(transaction);
      if (!wasPending && productId) {
        // Фоновое допроведение (прерванная ранее покупка) — сообщаем UI.
        const tokens = ports.tokensFor(productId);
        if (tokens && onBackgroundCredit) onBackgroundCredit(tokens);
      }
      return;
    }

    ports.log("verify_failed", {
      productId,
      code: result.permanent ? "permanent" : "transient",
      message: wasPending ? "active purchase" : "background transaction",
    });
    // Сначала отвечаем ждущему отказом: finish() ниже породил бы событие
    // finished, которое резолвит ожидание успехом.
    if (wasPending) settle(productId, { ok: false });
    // Окончательно отклонённые транзакции (402/403) закрываем — и подписки,
    // и consumable-токены:
    //  - подписки: истёкшие sandbox-транзакции висят в очереди StoreKit,
    //    повторно доставляются как approved и «съедают» ожидание новой
    //    покупки; право на подписку от finish() не теряется — статус всегда
    //    перепроверяется у стора;
    //  - consumable: незакрытая покупка НАВСЕГДА блокирует повторную покупку
    //    того же товара в Google Play. Pending-платежи сервер помечает 409
    //    (НЕ permanent) — их не финишируем.
    if (result.permanent && productId) finishQuietly(transaction);
  }

  function finished(transaction: PurchaseTransaction): void {
    settle(productIdOf(transaction), { ok: true });
  }

  function order(request: OrderRequest): Promise<PurchaseOutcome> {
    const { productId, messages } = request;
    return new Promise((resolve) => {
      // Сторож: если события approved/finished так и не пришли (зависшая
      // транзакция StoreKit/Billing), не крутим спиннер вечно. Реальная оплата
      // не теряется: approved допроведётся при следующем запуске.
      const timer = setTimeout(() => {
        if (!pending.has(productId)) return;
        pending.delete(productId);
        ports.log("timeout", {
          productId,
          message: `no purchase event within ${request.timeoutMs / 1000}s`,
        });
        resolve({ ok: false, error: messages.storeTimeout });
      }, request.timeoutMs);

      pending.set(productId, (outcome) => {
        clearTimeout(timer);
        resolve(outcome);
      });

      request.place().catch((e: unknown) => {
        clearTimeout(timer);
        pending.delete(productId);
        const message = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
        ports.log("order_rejected", {
          productId,
          code: (e as { code?: string | number })?.code,
          message,
        });
        const alreadyOwned = request.explainAlreadyOwned && /already.?own/i.test(message);
        resolve({ ok: false, error: alreadyOwned ? messages.alreadyOwned : message || messages.cancelled });
      });
    });
  }

  return {
    approved,
    finished,
    order,
    setBackgroundCredit(cb) {
      onBackgroundCredit = cb;
    },
  };
}
