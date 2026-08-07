"use client";

/**
 * Покупка и восстановление подписки WayBack.
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
 * Второе, за что отвечает хук, — какие тарифы вообще предлагать. Список
 * строится из ответа стора (`getPurchasableSubscriptions`), а не из каталога:
 * недельный товар одобряют в App Store и в Google Play в разное время, и до
 * одобрения его не должно быть на экране. Флага для этого нет и не нужно —
 * см. `waybackPlansFor`.
 *
 * Покупка возможна только в нативной оболочке: в браузере плагина стора нет.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { FLAVORS } from "@/lib/appFlavor";
import { isNativeApp } from "@/lib/native/capacitor";
import {
  getPurchasableSubscriptions,
  getSubscriptionPrices,
  initIap,
  onIapEntitlement,
  purchaseSubscription,
  restorePurchases,
  subscribeSubscriptionPrices,
} from "@/lib/native/iap";
import {
  WAYBACK_PLANS,
  waybackPlansFor,
  type WaybackPlan,
} from "@/lib/wayback/subscriptionProducts";

export const WAYBACK_PLAN = FLAVORS.wayback.subscriptionPlan!;

export interface WaybackPurchaseState {
  native: boolean;
  /**
   * Тарифы, которые можно купить прямо сейчас. Один — экран показывает цену
   * без выбора, два — выбор из недели и года.
   */
  plans: WaybackPlan[];
  /** Цена тарифа: из стора, а до его ответа — заглушка из конфига флейвора. */
  priceOf: (plan: WaybackPlan) => string;
  /** Цена по идентификатору товара: нужна карточке уже активной подписки. */
  priceOfProduct: (productId: string) => string;
  trialDays: number;
  purchasing: boolean;
  restoring: boolean;
  error: string;
  /** Восстановление прошло и ничего не нашло — об этом надо сказать. */
  nothingRestored: boolean;
  subscribe: (productId: string) => Promise<boolean>;
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
  const [purchasable, setPurchasable] = useState<string[]>([]);
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
    // Цены и список заказуемых товаров приходят одним событием плагина
    // (productUpdated), поэтому читаются вместе: разъехавшись, они дали бы
    // тариф с ценой, но без кнопки, или наоборот.
    const readStore = () => {
      setPrices(getSubscriptionPrices());
      setPurchasable(getPurchasableSubscriptions());
    };
    (async () => {
      await initIap();
      if (cancelled) return;
      readStore();
      unsub = subscribeSubscriptionPrices(readStore);
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

  const plans = useMemo(
    // В браузере стора нет вовсе, и спрашивать его не о чем: там экран не
    // продаёт, а объясняет, что оформить подписку можно в приложении, —
    // поэтому показывает полный прейскурант продукта.
    () => (native ? waybackPlansFor(purchasable) : WAYBACK_PLANS),
    [native, purchasable],
  );

  const priceOfProduct = useCallback(
    (productId: string) =>
      prices[productId] ||
      WAYBACK_PLANS.find((p) => p.productId === productId)?.fallbackPrice ||
      "",
    [prices],
  );

  const priceOf = useCallback(
    (plan: WaybackPlan) => prices[plan.productId] || plan.fallbackPrice,
    [prices],
  );

  const subscribe = useCallback(
    async (productId: string) => {
      if (purchasing) return false;
      setPurchasing(true);
      setError("");
      setNothingRestored(false);
      try {
        const r = await purchaseSubscription(productId, locale);
        if (r.ok) {
          await onEntitled();
          return true;
        }
        setError(r.error || fallbackError);
        return false;
      } finally {
        setPurchasing(false);
      }
    },
    [fallbackError, locale, onEntitled, purchasing],
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
      await onEntitled();
      setNothingRestored(!found);
      return found;
    } finally {
      setRestoring(false);
    }
  }, [onEntitled, restoring]);

  return {
    native,
    plans,
    priceOf,
    priceOfProduct,
    trialDays: WAYBACK_PLAN.trialDays,
    purchasing,
    restoring,
    error,
    nothingRestored,
    subscribe,
    restore,
  };
}
