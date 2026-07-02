/**
 * Клиент внутренних покупок (In-App Purchase) на базе cordova-plugin-purchase.
 * Активен только в нативной оболочке. Токены — consumable-товары.
 *
 * Поток: order() → approved → верификация чека на нашем сервере
 * (/api/native/iap/verify, начисляет токены) → finish().
 *
 * В браузере/PWA все функции — no-op.
 */
import { isNativeApp, getPlatform } from "./capacitor";
import { IAP_PRODUCTS, productForPack } from "./iapProducts";

// Тип плагина не импортируем как модуль — он подключается нативно и доступен
// как глобальный объект window.CdvPurchase.
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyStore = any;

let initialized = false;
const pending = new Map<string, { resolve: (ok: boolean) => void; reject: (e: unknown) => void }>();

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

/** Инициализация магазина: регистрация товаров и обработчиков. Идемпотентна. */
export async function initIap(): Promise<boolean> {
  if (!isNativeApp()) return false;
  const CdvPurchase = cdv();
  if (!CdvPurchase) return false;
  if (initialized) return true;

  const store: AnyStore = CdvPurchase.store;
  const platform = platformConst();

  store.register(
    IAP_PRODUCTS.map((p) => ({
      id: p.productId,
      type: CdvPurchase.ProductType.CONSUMABLE,
      platform,
    })),
  );

  store
    .when()
    .approved(async (transaction: any) => {
      const productId = transaction?.products?.[0]?.id ?? transaction?.productId;
      const ok = productId ? await verifyOnServer(productId, transaction) : false;
      if (ok) {
        transaction.finish();
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

/**
 * Купить пакет токенов. Возвращает { ok } после верификации чека сервером
 * и начисления токенов.
 */
export async function purchasePack(packId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isNativeApp()) return { ok: false, error: "IAP доступен только в приложении" };
  const CdvPurchase = cdv();
  if (!CdvPurchase) return { ok: false, error: "Магазин недоступен" };

  await initIap();
  const product = productForPack(packId);
  if (!product) return { ok: false, error: "Товар не найден" };

  const store: AnyStore = CdvPurchase.store;
  const storeProduct = store.get(product.productId, platformConst());
  const offer = storeProduct?.getOffer?.();
  if (!offer) return { ok: false, error: "Товар недоступен в магазине" };

  return new Promise((resolve) => {
    pending.set(product.productId, { resolve: (ok) => resolve({ ok }), reject: () => resolve({ ok: false }) });
    offer.order().catch((e: any) => {
      pending.delete(product.productId);
      resolve({ ok: false, error: e?.message || "Покупка отменена" });
    });
  });
}
