"use client";

/**
 * Покупка и восстановление подписки Mushroom Checker.
 *
 * Логика пейволла вынесена из компонента по той же причине, по которой она
 * вынесена у WayBack: экран оплаты обязан всегда кончаться исходом, и этот
 * исход нельзя держать в разметке. Их три, и каждый обязан быть виден:
 *
 *  - право появилось — статус перечитан, и пейволл сменяется карточкой
 *    активной подписки. Сигнал приходит не только от кнопки: приняв чек,
 *    сервер сообщает о праве через `onIapEntitlement`, и это происходит и с
 *    транзакциями, которые StoreKit доставляет из своей очереди при запуске
 *    приложения (прерванная покупка, покупка, подтверждённая после
 *    перезапуска, восстановление). Перечитывает статус
 *    `useCheckerSubscription` — он живёт на всех экранах приложения, поэтому
 *    оплаченная подписка доходит и до распознавания, а не только до пейволла;
 *  - покупка не удалась — сообщение от `purchaseSubscription` с причиной и
 *    возможностью повторить (кнопка снова активна);
 *  - восстанавливать было нечего — `restore()` говорит об этом прямо. Прежде
 *    здесь стояла слепая пауза в 2.5 секунды и «успех» на любой ответ плагина:
 *    на медленной связи она истекала до ответа сервера, и восстановление
 *    выглядело неудачным при живой подписке, а на чужом аккаунте стора —
 *    удачным при отсутствующей.
 *
 * Покупка возможна только в нативной оболочке: в браузере плагина стора нет.
 */

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { isNativeApp } from "@/lib/native/capacitor";
import {
  getSubscriptionPrices,
  initIap,
  onIapEntitlement,
  purchaseSubscription,
  restorePurchases,
  subscribeSubscriptionPrices,
} from "@/lib/native/iap";

export interface CheckerPurchaseState {
  native: boolean;
  /** Цены из стора: productId → отформатированная цена. До загрузки — пусто. */
  prices: Record<string, string>;
  purchasing: boolean;
  restoring: boolean;
  error: string;
  /** Восстановление прошло и ничего не нашло — об этом надо сказать. */
  nothingRestored: boolean;
  subscribe: (productId: string) => Promise<boolean>;
  restore: () => Promise<boolean>;
}

export function useCheckerPurchase(
  /** Сообщение на случай, если ни стор, ни сервер не назвали причину отказа. */
  fallbackError: string,
): CheckerPurchaseState {
  const locale = useLocale();
  const [native, setNative] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState("");
  const [nothingRestored, setNothingRestored] = useState(false);

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

  // Право подтверждено сервером: сообщения прошлой неудачной попытки больше не
  // о чём. Статус подписки перечитывает `useCheckerSubscription` — он подписан
  // на тот же сигнал, и второй запрос за тем же ответом здесь не нужен.
  useEffect(() => {
    if (!native) return;
    return onIapEntitlement(() => {
      setError("");
      setNothingRestored(false);
    });
  }, [native]);

  const subscribe = useCallback(
    async (productId: string) => {
      if (purchasing) return false;
      setPurchasing(true);
      setError("");
      setNothingRestored(false);
      try {
        const r = await purchaseSubscription(productId, locale);
        if (r.ok) return true;
        setError(r.error || fallbackError);
        return false;
      } finally {
        setPurchasing(false);
      }
    },
    [fallbackError, locale, purchasing],
  );

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
      setNothingRestored(!found);
      return found;
    } finally {
      setRestoring(false);
    }
  }, [restoring]);

  return {
    native,
    prices,
    purchasing,
    restoring,
    error,
    nothingRestored,
    subscribe,
    restore,
  };
}
