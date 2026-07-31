"use client";

/**
 * Состояние подписки Mushroom Checker для UI.
 *
 * Модель: бесплатный пробный период стора (3 дня) с общим лимитом
 * распознаваний, затем подписка без лимита. Все числа — в одном месте,
 * FLAVORS.checker.subscriptionPlan (src/flavors/checker/config.ts).
 *
 * Источник состояния — GET /api/subscription (тот же, что у пейволла). Пока
 * запрос идёт, `loading = true`, и экраны не показывают карточку квоты, чтобы
 * не мигать неверным числом.
 */

import { useCallback, useEffect, useState } from "react";
import { FLAVORS } from "@/lib/appFlavor";

/** Параметры подписки приложения: триал, лимит триала, цены. */
export const CHECKER_PLAN = FLAVORS.checker.subscriptionPlan!;

export interface CheckerSubscription {
  tier: string;
  /**
   * Период оплаченной подписки. «monthly» — только у подписок, купленных до
   * перехода на недельный тариф: новый товар месячного периода не продаётся,
   * но чужие старые строки в базе никуда не деваются.
   */
  period: "weekly" | "monthly" | "yearly";
  status: "active" | "grace" | "canceled";
  platform: "ios" | "android" | "web";
  current_period_end: string;
  identify_used: number;
  /** null — распознавания без лимита (оплаченная подписка). */
  identify_limit: number | null;
  quota_resets_at: string;
  is_trial: boolean;
}

export interface CheckerSubscriptionState {
  subscription: CheckerSubscription | null;
  loading: boolean;
  /** Идёт бесплатный пробный период. */
  isTrial: boolean;
  /** Подписка без лимита распознаваний. */
  unlimited: boolean;
  /** Осталось распознаваний (null — подписки нет либо лимита нет). */
  left: number | null;
  limit: number | null;
  refresh: () => Promise<void>;
}

export function useCheckerSubscription(): CheckerSubscriptionState {
  const [subscription, setSubscription] = useState<CheckerSubscription | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription");
      if (!res.ok) {
        setSubscription(null);
        return;
      }
      const data = await res.json();
      setSubscription((data?.subscription as CheckerSubscription) ?? null);
    } catch {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const limit = subscription?.identify_limit ?? null;
  const unlimited = Boolean(subscription) && limit === null;
  const left =
    subscription && limit != null
      ? Math.max(0, limit - subscription.identify_used)
      : null;

  return {
    subscription,
    loading,
    isTrial: Boolean(subscription?.is_trial),
    unlimited,
    left,
    limit,
    refresh,
  };
}

/** «12 August» / «12 августа» — короткая дата (окончание пробного периода). */
export function formatQuotaDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric",
    month: "long",
  });
}

/** «14 July 2027» — дата продления/окончания подписки. */
export function formatFullDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
