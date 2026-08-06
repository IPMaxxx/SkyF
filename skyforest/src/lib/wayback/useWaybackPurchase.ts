"use client";

/**
 * Покупка и восстановление годовой подписки WayBack.
 *
 * Один хук на два экрана — пейволл (`/payment`) и стартовый гейт: логика у них
 * одна, и разъезжаться ей нельзя.
 *
 * Хук отвечает за то, чтобы экран оплаты всегда кончался исходом. Их три, и
 * каждый обязан быть виден:
 *
 *  - право появилось — `onEntitled()` перечитывает статус, и экран снимается.
 *    Сигнал приходит не только от кнопки: `onIapEntitlement` срабатывает и на
 *    транзакциях, которые StoreKit доставляет из своей очереди при запуске
 *    приложения. Без этой подписки оплаченная подписка оставалась бы за
 *    экраном оплаты до второго перезапуска;
 *  - покупка не удалась — сообщение от `purchaseSubscription` с причиной и
 *    возможностью повторить (кнопка снова активна);
 *  - восстанавливать было нечего — `restore()` говорит об этом прямо, а не
 *    гасит спиннер на том же экране без объяснений.
 *
 * Покупка возможна только в нативной оболочке: в браузере плагина стора нет.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { FLAVORS } from "@/lib/appFlavor";
import { isNativeApp } from "@/lib/native/capacitor";
import {
  getSubscriptionPrices,
  initIap,
  onIapEntitlement,
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

export interface WaybackPurchaseState {
  native: boolean;
  /** Цена из стора, до её загрузки — из конфига флейвора. */
  price: string;
  trialDays: number;
  purchasing: boolean;
  restoring: boolean;
  error: string;
  /** Восстановление прошло и ничего не нашло — об этом надо сказать. */
  nothingRestored: boolean;
  subscribe: () => Promise<boolean>;
  restore: () => Promise<boolean>;
}

export function useWaybackPurchase(
  /** Перечитать право после успешной покупки или восстановления. */
  onEntitled: () => void | Promise<void>,
  /** Сообщение на случай, если стор не назвал причину отказа. */
  fallbackError: string,
): WaybackPurchaseState {
  const locale = useLocale();
  const [native, setNative] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState("");
  const [nothingRestored, setNothingRestored] = useState(false);

  // Подписка на право живёт весь срок жизни экрана, а `onEntitled` может
  // прийти новой функцией на каждом рендере: держим её в ссылке, иначе
  // переподписка гасила бы сигнал ровно в тот момент, когда он нужен.
  const entitledRef = useRef(onEntitled);
  entitledRef.current = onEntitled;

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

  // Право, подтверждённое сервером в обход кнопки: транзакция из очереди
  // StoreKit при запуске, восстановление, покупка, доехавшая после сторожа.
  useEffect(() => {
    if (!native) return;
    return onIapEntitlement(() => {
      setError("");
      setNothingRestored(false);
      void entitledRef.current();
    });
  }, [native]);

  const subscribe = useCallback(async () => {
    if (purchasing) return false;
    setPurchasing(true);
    setError("");
    setNothingRestored(false);
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
    if (restoring) return false;
    setRestoring(true);
    setError("");
    setNothingRestored(false);
    try {
      // restorePurchases() сам дожидается подтверждения права сервером (со
      // своим сроком), поэтому угадывать паузу перед перечитыванием статуса
      // больше не нужно.
      const found = await restorePurchases();
      await onEntitled();
      setNothingRestored(!found);
      return found;
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
    nothingRestored,
    subscribe,
    restore,
  };
}
