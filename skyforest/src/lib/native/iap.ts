/**
 * Клиент внутренних покупок (In-App Purchase) на базе cordova-plugin-purchase.
 * Активен только в нативной оболочке. Токены — consumable-товары.
 *
 * Поток: order() → approved → верификация чека на нашем сервере
 * (/api/native/iap/verify, начисляет токены) → finish().
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
import { IAP_PRODUCTS, productForPack, tokensForProduct } from "./iapProducts";

// Тип плагина не импортируем как модуль — он подключается нативно и доступен
// как глобальный объект window.CdvPurchase.
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyStore = any;

let initialized = false;
const pending = new Map<string, { resolve: (ok: boolean) => void; reject: (e: unknown) => void }>();

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

async function verifyOnServer(productId: string, transaction: any): Promise<boolean> {
  try {
    const res = await fetch("/api/native/iap/verify", {
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
    return res.ok && data?.ok === true;
  } catch {
    return false;
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

/** Подписка на обновление цен из стора. Возвращает функцию отписки. */
export function subscribeStorePrices(cb: PricesListener): () => void {
  priceListeners.add(cb);
  return () => priceListeners.delete(cb);
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

  store.register(
    IAP_PRODUCTS.map((p) => ({
      id: p.productId,
      type: CdvPurchase.ProductType.CONSUMABLE,
      platform,
    })),
  );

  store
    .when()
    .productUpdated(() => {
      const prices = getStorePrices();
      priceListeners.forEach((cb) => cb(prices));
    })
    .approved(async (transaction: any) => {
      const productId = transaction?.products?.[0]?.id ?? transaction?.productId;
      const wasPending = Boolean(productId && pending.has(productId));
      const ok = productId ? await verifyOnServer(productId, transaction) : false;
      if (ok) {
        transaction.finish();
        if (!wasPending) {
          // Фоновое допроведение (прерванная ранее покупка) — сообщаем UI.
          const tokens = tokensForProduct(productId);
          if (tokens && onBackgroundCredit) onBackgroundCredit(tokens);
        }
      } else {
        const p = productId && pending.get(productId);
        if (p) {
          pending.delete(productId);
          p.resolve(false);
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

  await store.initialize([platform]);
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
  },
  en: {
    nativeOnly: "In-app purchases are only available in the app",
    storeUnavailable: "Store is unavailable",
    productNotFound: "Product not found",
    productUnavailable: "Product is unavailable in the store",
    cancelled: "Purchase cancelled",
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
  if (!offer) return { ok: false, error: msg.productUnavailable };

  return new Promise((resolve) => {
    pending.set(product.productId, { resolve: (ok) => resolve({ ok }), reject: () => resolve({ ok: false }) });
    offer.order().catch((e: any) => {
      pending.delete(product.productId);
      resolve({ ok: false, error: e?.message || msg.cancelled });
    });
  });
}
