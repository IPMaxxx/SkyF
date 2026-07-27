"use client";

/**
 * Состояние подписки Mushroom Checker для UI: сколько распознаваний осталось
 * в этом месяце и когда счётчик обнулится.
 *
 * Источник — GET /api/subscription (тот же, что у пейволла). Пока запрос идёт,
 * `loading = true`, и экраны не показывают карточку квоты, чтобы не мигать
 * неверным числом.
 */

import { useCallback, useEffect, useState } from "react";

/**
 * Определений в месяц по подписке. Дублирует TIER_BENEFITS.checker
 * (src/lib/subscription.ts) — тот модуль серверный, в клиентские экраны его
 * не тянем. Значение нужно до загрузки статуса подписки: на пейволле и
 * у пользователей без подписки показываем «25 определений в месяц».
 */
export const CHECKER_MONTHLY_LIMIT = 25;

export interface CheckerSubscription {
  tier: string;
  period: "monthly" | "yearly";
  status: "active" | "grace" | "canceled";
  platform: "ios" | "android" | "web";
  current_period_end: string;
  identify_used: number;
  identify_limit: number;
  quota_resets_at: string;
}

export interface CheckerSubscriptionState {
  subscription: CheckerSubscription | null;
  loading: boolean;
  /** Осталось распознаваний в текущем месяце (null — подписки нет). */
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
  const left =
    subscription && limit != null
      ? Math.max(0, limit - subscription.identify_used)
      : null;

  return { subscription, loading, left, limit, refresh };
}

/** «12 August» / «12 августа» — дата обнуления счётчика без года. */
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
