"use client";

/**
 * Покупка и восстановление годовой подписки WayBack.
 *
 * Один хук на два экрана — пейволл (`/payment`) и стартовый гейт: логика у них
 * одна, и разъезжаться ей нельзя. Именно здесь живёт пауза после
 * `restorePurchases()`: плагин доставляет чеки асинхронно, и без ожидания
 * перечитанный `/api/subscription` ещё не знает о восстановленной подписке.
 *
 * Покупка возможна только в нативной оболочке: в браузере плагина стора нет.
 */

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { FLAVORS } from "@/lib/appFlavor";
import { isNativeApp } from "@/lib/native/capacitor";
import {
  getSubscriptionPrices,
  initIap,
  purchaseSubscription,
  restorePurchases,
  subscribeSubscriptionPrices,
} from "@/lib/native/iap";
import {
  subscriptionProductsForBundle,
  WAYBACK_BUNDLE_ID,
} from "@/lib/native/iapProducts";

export const WAYBACK_PLAN = FLAVORS.wayback.subscriptionPlan!;

/** Единственный товар приложения — годовая подписка. */
export const WAYBACK_PRODUCT = subscriptionProductsForBundle(WAYBACK_BUNDLE_ID)[0];

/** Плагин доставляет восстановленные чеки не мгновенно. */
const RESTORE_SETTLE_MS = 2500;

export interface WaybackPurchaseState {
  native: boolean;
  /** Цена из стора, до её загрузки — из конфига флейвора. */
  price: string;
  trialDays: number;
  purchasing: boolean;
  restoring: boolean;
  error: string;
  subscribe: () => Promise<boolean>;
  restore: () => Promise<void>;
}

export function useWaybackPurchase(
  /** Перечитать право после успешной покупки или восстановления. */
  onEntitled: () => void | Promise<void>,
  /** Подпись для кнопки на случай, если стор не назвал причину отказа. */
  fallbackError: string,
): WaybackPurchaseState {
  const locale = useLocale();
  const [native, setNative] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setNative(isNativeApp());
  }, []);

  useEffect(() => {
    if (!native) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      await initIap();
      if (cancelled) return;
      setPrices(getSubscriptionPrices());
      unsub = subscribeSubscriptionPrices(setPrices);
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [native]);

  const subscribe = useCallback(async () => {
    if (purchasing) return false;
    setPurchasing(true);
    setError("");
    try {
      const r = await purchaseSubscription(WAYBACK_PRODUCT.productId, locale);
      if (r.ok) {
        await onEntitled();
        return true;
      }
      setError(r.error || fallbackError);
      return false;
    } finally {
      setPurchasing(false);
    }
  }, [fallbackError, locale, onEntitled, purchasing]);

  const restore = useCallback(async () => {
    if (restoring) return;
    setRestoring(true);
    setError("");
    try {
      await restorePurchases();
      await new Promise((r) => setTimeout(r, RESTORE_SETTLE_MS));
      await onEntitled();
    } finally {
      setRestoring(false);
    }
  }, [onEntitled, restoring]);

  return {
    native,
    price: prices[WAYBACK_PRODUCT.productId] || WAYBACK_PRODUCT.fallbackPrice,
    trialDays: WAYBACK_PLAN.trialDays,
    purchasing,
    restoring,
    error,
    subscribe,
    restore,
  };
}
