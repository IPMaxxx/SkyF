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
import { getClientFlavor } from "@/lib/appFlavor";
import {
  MAIN_BUNDLE_ID,
  CHECKER_BUNDLE_ID,
  WAYBACK_BUNDLE_ID,
  iapProductsForBundle,
  subscriptionProductsForBundle,
  productForPack,
  tokensForProduct,
  isSubscriptionProduct,
} from "./iapProducts";
import {
  createPurchaseFlow,
  type PurchaseTransaction,
  type VerifyOutcome,
} from "./purchaseFlow";

/**
 * Bundle id активной оболочки: во флейворах Mushroom Checker / WayBack
 * (поддомены в WebView своих приложений) — свои товары со своими id;
 * в основном приложении — как раньше.
 */
function activeBundleId(): string {
  const flavor = getClientFlavor();
  if (flavor === "checker") return CHECKER_BUNDLE_ID;
  if (flavor === "wayback") return WAYBACK_BUNDLE_ID;
  return MAIN_BUNDLE_ID;
}

/** Consumable-товары активной оболочки (во флейворах — пусто, только подписка). */
function activeProducts() {
  return iapProductsForBundle(activeBundleId());
}

/** Подписки активной оболочки: SkyForest — Forager/Pro, флейворы — своя одна. */
function activeSubscriptions() {
  return subscriptionProductsForBundle(activeBundleId());
}

// Тип плагина не импортируем как модуль — он подключается нативно и доступен
// как глобальный объект window.CdvPurchase.
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyStore = any;

let initialized = false;

/** Watchdog покупки: не даём спиннеру крутиться вечно, если события плагина не пришли. */
const PURCHASE_TIMEOUT_MS = 90_000;

/** Кэш id пользователя для store.applicationUsername (getter вызывается синхронно). */
let currentUserId: string | undefined;

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

async function verifyOnServer(productId: string, transaction: any): Promise<VerifyOutcome> {
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

/**
 * Цикл транзакции: кто ждёт покупку, что делать с одобренной транзакцией и
 * когда её закрывать. Логика — в purchaseFlow, здесь только порты к сети,
 * каталогу товаров и телеметрии.
 */
const flow = createPurchaseFlow({
  verify: verifyOnServer,
  log: logIapError,
  tokensFor: tokensForProduct,
});

/** Текущие цены товаров из стора: packId → форматированная цена (например "$2.99"). */
export function getStorePrices(): Record<string, string> {
  const CdvPurchase = cdv();
  if (!CdvPurchase || !initialized) return {};
  const store: AnyStore = CdvPurchase.store;
  const platform = platformConst();
  const prices: Record<string, string> = {};
  for (const p of activeProducts()) {
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
  for (const p of activeSubscriptions()) {
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
  if (opts?.onBackgroundCredit) flow.setBackgroundCredit(opts.onBackgroundCredit);
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
    ...activeProducts().map((p) => ({
      id: p.productId,
      type: CdvPurchase.ProductType.CONSUMABLE,
      platform,
    })),
    ...activeSubscriptions().map((p) => ({
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
    .approved((transaction: PurchaseTransaction) => void flow.approved(transaction))
    .finished((transaction: PurchaseTransaction) => flow.finished(transaction));

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
    alreadyOwned:
      "Предыдущая покупка этого пакета ещё не проведена до конца. Перезапустите приложение — она зачислится автоматически, после чего пакет снова можно купить.",
    storeTimeout:
      "Магазин не ответил. Если оплата прошла, токены или подписка будут зачислены автоматически — перезапустите приложение.",
  },
  en: {
    nativeOnly: "In-app purchases are only available in the app",
    storeUnavailable: "Store is unavailable",
    productNotFound: "Product not found",
    productUnavailable: "Product is unavailable in the store",
    cancelled: "Purchase cancelled",
    alreadyOwned:
      "A previous purchase of this pack has not been fully processed yet. Restart the app — it will be credited automatically, then you can buy this pack again.",
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
  const product = productForPack(packId, activeBundleId());
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

  // ITEM_ALREADY_OWNED: незакрытая consumable-покупка блокирует повторную
  // (Google Play не показывает окно оплаты) — подсказываем перезапуск, при
  // котором approved допроведётся и товар разблокируется.
  return flow.order({
    productId: product.productId,
    place: () => offer.order(),
    timeoutMs: PURCHASE_TIMEOUT_MS,
    messages: msg,
    explainAlreadyOwned: true,
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

  // Watchdog — см. purchasePack: спиннер не должен крутиться вечно.
  return flow.order({
    productId,
    place: () => offer.order(),
    timeoutMs: PURCHASE_TIMEOUT_MS,
    messages: msg,
  });
}

/**
 * Восстановить покупки (кнопка «Restore» на пейволле — требование
 * App Review 3.1.1). Плагин переотправляет чеки как approved-транзакции,
 * которые проходят обычную верификацию на сервере; после паузы вызывающий
 * код перечитывает /api/subscription и видит восстановленную подписку.
 */
export async function restorePurchases(): Promise<boolean> {
  if (!isNativeApp()) return false;
  const CdvPurchase = cdv();
  if (!CdvPurchase) return false;
  await initIap();
  await refreshUserId();
  try {
    await CdvPurchase.store.restorePurchases();
    return true;
  } catch (e: any) {
    logIapError("restore_failed", {
      code: e?.code,
      message: e?.message ?? String(e),
    });
    return false;
  }
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
