/**
 * Клиент внутренних покупок (In-App Purchase) на базе cordova-plugin-purchase.
 * Активен только в нативной оболочке. Токены — consumable-товары,
 * подписки Forager/Pro — auto-renewable (PAID_SUBSCRIPTION).
 *
 * Поток (consumable): order() → approved → верификация чека на нашем сервере
 * (/api/native/iap/verify, начисляет токены) → finish().
 * Поток (подписка): order() → approved → /api/native/iap/verify-subscription
 * (сверка статуса у стора, upsert user_subscriptions, бонус-пул) → finish().
 *
 * Чек привязывается к пользователю: store.applicationUsername = user.id
 * (UUID из Supabase). Обфускация отключена — сырой UUID уходит в
 * appAccountToken (iOS) / obfuscatedAccountId (Android), и сервер сверяет
 * его с авторизованным пользователем при верификации.
 *
 * В браузере/PWA все функции — no-op.
 */
import { isNativeApp, getPlatform } from "./capacitor";
import { createClient } from "@/lib/supabase/client";
import {
  IAP_PRODUCTS,
  SUBSCRIPTION_PRODUCTS,
  productForPack,
  tokensForProduct,
  isSubscriptionProduct,
} from "./iapProducts";

// Тип плагина не импортируем как модуль — он подключается нативно и доступен
// как глобальный объект window.CdvPurchase.
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyStore = any;

let initialized = false;
const pending = new Map<string, { resolve: (ok: boolean) => void; reject: (e: unknown) => void }>();

/** Watchdog покупки: не даём спиннеру крутиться вечно, если события плагина не пришли. */
const PURCHASE_TIMEOUT_MS = 90_000;

/** Кэш id пользователя для store.applicationUsername (getter вызывается синхронно). */
let currentUserId: string | undefined;

/**
 * Уведомление о начислении «фоновой» покупки — approved-транзакции,
 * допроведённой при старте приложения (без активного вызова purchasePack).
 */
let onBackgroundCredit: ((tokens: number) => void) | null = null;

/** Подписчики на обновление цен товаров из стора. */
type PricesListener = (prices: Record<string, string>) => void;
const priceListeners = new Set<PricesListener>();
const subPriceListeners = new Set<PricesListener>();

function cdv(): any | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { CdvPurchase?: any }).CdvPurchase ?? null;
}

function platformConst(): any | null {
  const CdvPurchase = cdv();
  if (!CdvPurchase) return null;
  return getPlatform() === "ios"
    ? CdvPurchase.Platform.APPLE_APPSTORE
    : CdvPurchase.Platform.GOOGLE_PLAY;
}

async function refreshUserId(): Promise<string | undefined> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    currentUserId = user?.id ?? undefined;
  } catch {
    /* оставляем прежнее значение */
  }
  return currentUserId;
}

interface VerifyResult {
  ok: boolean;
  /** Стор окончательно отверг чек (402/403) — повторная верификация не поможет. */
  permanent: boolean;
}

/**
 * Телеметрия ошибок IAP: шлёт событие на сервер (/api/native/iap/log),
 * где оно попадает в pm2-лог. Клиентские StoreKit-ошибки (товар не
 * загрузился, order() отклонён) иначе не видны при диагностике App Review.
 * Fire-and-forget: сбои телеметрии не влияют на поток покупки.
 */
function logIapError(
  stage: string,
  details: { productId?: string; code?: string | number; message?: string },
): void {
  try {
    void fetch("/api/native/iap/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage,
        platform: getPlatform(),
        productId: details.productId,
        code: details.code,
        message: details.message,
      }),
    }).catch(() => {});
  } catch {
    /* телеметрия не должна ломать покупку */
  }
}

async function verifyOnServer(productId: string, transaction: any): Promise<VerifyResult> {
  // Подписки верифицируются отдельным роутом (App Store Server API /
  // purchases.subscriptionsv2.get), consumable-токены — прежним verify.
  const endpoint = isSubscriptionProduct(productId)
    ? "/api/native/iap/verify-subscription"
    : "/api/native/iap/verify";
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: getPlatform(),
        productId,
        transactionId: transaction?.transactionId ?? transaction?.id ?? null,
        purchaseToken: transaction?.purchaseToken ?? transaction?.nativePurchase?.purchaseToken ?? null,
        receipt: transaction?.parentReceipt?.nativeData ?? transaction?.nativePurchase ?? null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && data?.ok === true;
    return { ok, permanent: !ok && (res.status === 402 || res.status === 403) };
  } catch {
    return { ok: false, permanent: false };
  }
}

/** Текущие цены товаров из стора: packId → форматированная цена (например "$2.99"). */
export function getStorePrices(): Record<string, string> {
  const CdvPurchase = cdv();
  if (!CdvPurchase || !initialized) return {};
  const store: AnyStore = CdvPurchase.store;
  const platform = platformConst();
  const prices: Record<string, string> = {};
  for (const p of IAP_PRODUCTS) {
    const price = store.get(p.productId, platform)?.pricing?.price;
    if (typeof price === "string" && price) prices[p.packId] = price;
  }
  return prices;
}

/** Цены подписок из стора: productId → форматированная цена (например "$5.99"). */
export function getSubscriptionPrices(): Record<string, string> {
  const CdvPurchase = cdv();
  if (!CdvPurchase || !initialized) return {};
  const store: AnyStore = CdvPurchase.store;
  const platform = platformConst();
  const prices: Record<string, string> = {};
  for (const p of SUBSCRIPTION_PRODUCTS) {
    // Первая pricing phase при бесплатном триале — «Free», поэтому берём
    // последнюю фазу (базовая регулярная цена подписки).
    const phases = store.get(p.productId, platform)?.getOffer?.()?.pricingPhases;
    const basePhase = Array.isArray(phases) && phases.length > 0
      ? phases[phases.length - 1]
      : undefined;
    const price = basePhase?.price
      ?? store.get(p.productId, platform)?.pricing?.price;
    if (typeof price === "string" && price) prices[p.productId] = price;
  }
  return prices;
}

/** Подписка на обновление цен из стора. Возвращает функцию отписки. */
export function subscribeStorePrices(cb: PricesListener): () => void {
  priceListeners.add(cb);
  return () => priceListeners.delete(cb);
}

/** Подписка на обновление цен подписок из стора. Возвращает функцию отписки. */
export function subscribeSubscriptionPrices(cb: PricesListener): () => void {
  subPriceListeners.add(cb);
  return () => subPriceListeners.delete(cb);
}

/**
 * Инициализация магазина: регистрация товаров и обработчиков. Идемпотентна.
 *
 * `opts.onBackgroundCredit` — колбэк для approved-транзакций, допроведённых
 * без активной покупки (например, прерванная покупка при прошлом запуске):
 * после успешной верификации и начисления вызывается с числом токенов.
 */
export async function initIap(opts?: { onBackgroundCredit?: (tokens: number) => void }): Promise<boolean> {
  if (!isNativeApp()) return false;
  const CdvPurchase = cdv();
  if (!CdvPurchase) return false;
  if (opts?.onBackgroundCredit) onBackgroundCredit = opts.onBackgroundCredit;
  if (initialized) return true;

  const store: AnyStore = CdvPurchase.store;
  const platform = platformConst();

  // Привязка покупки к пользователю: user.id (UUID) уходит как
  // appAccountToken (iOS SK2 требует валидный UUID) / obfuscatedAccountId
  // (Android). Обфускацию отключаем, чтобы сервер сверял значение напрямую.
  await refreshUserId();
  store.applicationUsername = () => currentUserId;
  store.obfuscator = "disabled";

  store.register([
    ...IAP_PRODUCTS.map((p) => ({
      id: p.productId,
      type: CdvPurchase.ProductType.CONSUMABLE,
      platform,
    })),
    ...SUBSCRIPTION_PRODUCTS.map((p) => ({
      id: p.productId,
      type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
      platform,
    })),
  ]);

  // Глобальные ошибки плагина (инициализация, StoreKit/Billing и пр.).
  store.error((err: any) => {
    logIapError("store.error", {
      code: err?.code,
      message: err?.message ?? String(err),
    });
  });

  store
    .when()
    .productUpdated(() => {
      const prices = getStorePrices();
      priceListeners.forEach((cb) => cb(prices));
      const subPrices = getSubscriptionPrices();
      subPriceListeners.forEach((cb) => cb(subPrices));
    })
    .approved(async (transaction: any) => {
      const productId = transaction?.products?.[0]?.id ?? transaction?.productId;
      const wasPending = Boolean(productId && pending.has(productId));
      const result: VerifyResult = productId
        ? await verifyOnServer(productId, transaction)
        : { ok: false, permanent: false };
      if (result.ok) {
        // Резолвим pending сразу после серверной верификации: покупка
        // зачислена, ждать события finished незачем. На iOS finished после
        // finish() иногда не приходит (cordova-plugin-purchase 13.x), и
        // спиннер покупки крутился бесконечно при успешной оплате.
        const p = productId && pending.get(productId);
        if (p) {
          pending.delete(productId);
          p.resolve(true);
        }
        try {
          transaction.finish();
        } catch {
          /* транзакция допроведётся при следующем запуске */
        }
        if (!wasPending) {
          // Фоновое допроведение (прерванная ранее покупка) — сообщаем UI.
          const tokens = tokensForProduct(productId);
          if (tokens && onBackgroundCredit) onBackgroundCredit(tokens);
        }
      } else {
        logIapError("verify_failed", {
          productId,
          code: result.permanent ? "permanent" : "transient",
          message: wasPending ? "active purchase" : "background transaction",
        });
        // Сначала резолвим pending ошибкой (finish() ниже породил бы событие
        // finished, которое резолвит pending успехом).
        const p = productId && pending.get(productId);
        if (p && wasPending) {
          pending.delete(productId);
          p.resolve(false);
        }
        // Окончательно отклонённые ПОДПИСОЧНЫЕ транзакции (например,
        // истёкшая sandbox-подписка из прошлой сессии) закрываем: иначе
        // они висят в очереди StoreKit, повторно доставляются как approved
        // при каждом запуске и «съедают» pending новой покупки, показывая
        // ложную ошибку. Право на подписку от finish() не теряется —
        // текущий статус всегда перепроверяется у стора по transactionId.
        // Consumable-токены без верификации НЕ закрываем никогда.
        if (result.permanent && productId && isSubscriptionProduct(productId)) {
          try {
            transaction.finish();
          } catch {
            /* очередь очистится при следующем запуске */
          }
        }
      }
    })
    .finished((transaction: any) => {
      const productId = transaction?.products?.[0]?.id ?? transaction?.productId;
      const p = productId && pending.get(productId);
      if (p) {
        pending.delete(productId);
        p.resolve(true);
      }
    });

  try {
    await store.initialize([platform]);
  } catch (e: any) {
    logIapError("initialize", { code: e?.code, message: e?.message ?? String(e) });
    throw e;
  }
  initialized = true;
  return true;
}

// Сообщения об ошибках IAP по локали (обычный модуль — хуки next-intl недоступны).
const IAP_ERRORS = {
  ru: {
    nativeOnly: "IAP доступен только в приложении",
    storeUnavailable: "Магазин недоступен",
    productNotFound: "Товар не найден",
    productUnavailable: "Товар недоступен в магазине",
    cancelled: "Покупка отменена",
    storeTimeout:
      "Магазин не ответил. Если оплата прошла, токены или подписка будут зачислены автоматически — перезапустите приложение.",
  },
  en: {
    nativeOnly: "In-app purchases are only available in the app",
    storeUnavailable: "Store is unavailable",
    productNotFound: "Product not found",
    productUnavailable: "Product is unavailable in the store",
    cancelled: "Purchase cancelled",
    storeTimeout:
      "Store did not respond. If you were charged, tokens/subscription will be credited automatically — restart the app.",
  },
} as const;

/**
 * Купить пакет токенов. Возвращает { ok } после верификации чека сервером
 * и начисления токенов.
 */
export async function purchasePack(packId: string, locale?: string): Promise<{ ok: boolean; error?: string }> {
  const msg = locale === "en" ? IAP_ERRORS.en : IAP_ERRORS.ru;
  if (!isNativeApp()) return { ok: false, error: msg.nativeOnly };
  const CdvPurchase = cdv();
  if (!CdvPurchase) return { ok: false, error: msg.storeUnavailable };

  await initIap();
  // Обновляем id пользователя перед заказом (мог войти после initIap).
  await refreshUserId();
  const product = productForPack(packId);
  if (!product) return { ok: false, error: msg.productNotFound };

  const store: AnyStore = CdvPurchase.store;
  const storeProduct = store.get(product.productId, platformConst());
  const offer = storeProduct?.getOffer?.();
  if (!offer) {
    logIapError("offer_unavailable", {
      productId: product.productId,
      message: storeProduct ? "product loaded without offer" : "product not loaded from store",
    });
    return { ok: false, error: msg.productUnavailable };
  }

  return new Promise((resolve) => {
    // Watchdog: если события approved/finished так и не пришли (зависшая
    // транзакция StoreKit/Billing), не крутим спиннер вечно. Реальная
    // оплата не теряется: approved допроведётся при следующем запуске.
    const timer = window.setTimeout(() => {
      if (pending.get(product.productId)) {
        pending.delete(product.productId);
        logIapError("timeout", {
          productId: product.productId,
          message: `no purchase event within ${PURCHASE_TIMEOUT_MS / 1000}s`,
        });
        resolve({ ok: false, error: msg.storeTimeout });
      }
    }, PURCHASE_TIMEOUT_MS);
    pending.set(product.productId, {
      resolve: (ok) => {
        window.clearTimeout(timer);
        resolve({ ok });
      },
      reject: () => {
        window.clearTimeout(timer);
        resolve({ ok: false });
      },
    });
    offer.order().catch((e: any) => {
      window.clearTimeout(timer);
      pending.delete(product.productId);
      logIapError("order_rejected", {
        productId: product.productId,
        code: e?.code,
        message: e?.message ?? String(e),
      });
      resolve({ ok: false, error: e?.message || msg.cancelled });
    });
  });
}

/**
 * Купить подписку (Forager/Pro). Возвращает { ok } после серверной
 * верификации (/api/native/iap/verify-subscription) и finish().
 */
export async function purchaseSubscription(
  productId: string,
  locale?: string,
): Promise<{ ok: boolean; error?: string }> {
  const msg = locale === "en" ? IAP_ERRORS.en : IAP_ERRORS.ru;
  if (!isNativeApp()) return { ok: false, error: msg.nativeOnly };
  const CdvPurchase = cdv();
  if (!CdvPurchase) return { ok: false, error: msg.storeUnavailable };

  await initIap();
  await refreshUserId();
  if (!isSubscriptionProduct(productId)) return { ok: false, error: msg.productNotFound };

  const store: AnyStore = CdvPurchase.store;
  const storeProduct = store.get(productId, platformConst());
  const offer = storeProduct?.getOffer?.();
  if (!offer) {
    logIapError("sub_offer_unavailable", {
      productId,
      message: storeProduct ? "product loaded without offer" : "product not loaded from store",
    });
    return { ok: false, error: msg.productUnavailable };
  }

  return new Promise((resolve) => {
    // Watchdog — см. purchasePack: спиннер не должен крутиться вечно.
    const timer = window.setTimeout(() => {
      if (pending.get(productId)) {
        pending.delete(productId);
        logIapError("sub_timeout", {
          productId,
          message: `no purchase event within ${PURCHASE_TIMEOUT_MS / 1000}s`,
        });
        resolve({ ok: false, error: msg.storeTimeout });
      }
    }, PURCHASE_TIMEOUT_MS);
    pending.set(productId, {
      resolve: (ok) => {
        window.clearTimeout(timer);
        resolve({ ok });
      },
      reject: () => {
        window.clearTimeout(timer);
        resolve({ ok: false });
      },
    });
    offer.order().catch((e: any) => {
      window.clearTimeout(timer);
      pending.delete(productId);
      logIapError("sub_order_rejected", {
        productId,
        code: e?.code,
        message: e?.message ?? String(e),
      });
      resolve({ ok: false, error: e?.message || msg.cancelled });
    });
  });
}

/** Открыть управление подписками стора (App Store / Google Play). */
export async function manageSubscriptions(): Promise<void> {
  if (!isNativeApp()) return;
  const CdvPurchase = cdv();
  if (!CdvPurchase) return;
  await initIap();
  try {
    await CdvPurchase.store.manageSubscriptions(platformConst());
  } catch {
    /* стор недоступен — молча игнорируем */
  }
}
