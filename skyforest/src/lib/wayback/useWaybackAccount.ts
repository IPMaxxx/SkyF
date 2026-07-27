"use client";

/**
 * Состояние аккаунта WayBack для UI: вошёл ли пользователь и есть ли подписка.
 *
 * Флейвор устроен так, что трек работает анонимно, поэтому почти каждый экран
 * должен уметь показать оба состояния. Хук держит их в одном месте, чтобы
 * меню, главный экран и аккаунт не расходились в трактовке.
 *
 * Источник подписки — GET /api/subscription (тот же, что у пейволла). Пока
 * запрос идёт, `loading = true`: экраны не должны мигать «подписки нет».
 */

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface WaybackSubscription {
  tier: string;
  period: "monthly" | "yearly";
  status: "active" | "grace" | "canceled";
  platform: "ios" | "android" | "web";
  current_period_end: string;
  trial_end?: string | null;
}

export interface WaybackAccountState {
  /** null — ещё не знаем (не мигаем состоянием «аноним» до ответа). */
  email: string | null;
  signedIn: boolean;
  subscription: WaybackSubscription | null;
  loading: boolean;
  /** Дней до конца триала, если он идёт прямо сейчас. */
  trialDaysLeft: number | null;
  refresh: () => Promise<void>;
}

export function useWaybackAccount(): WaybackAccountState {
  const [email, setEmail] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [subscription, setSubscription] = useState<WaybackSubscription | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setSignedIn(Boolean(user));
      setEmail(user?.email ?? null);

      if (!user) {
        setSubscription(null);
        return;
      }

      const res = await fetch("/api/subscription");
      if (!res.ok) {
        setSubscription(null);
        return;
      }
      const data = await res.json();
      setSubscription((data?.subscription as WaybackSubscription) ?? null);
    } catch {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const trialDaysLeft = (() => {
    const end = subscription?.trial_end;
    if (!end) return null;
    const ms = new Date(end).getTime() - Date.now();
    if (Number.isNaN(ms) || ms <= 0) return null;
    return Math.ceil(ms / 86_400_000);
  })();

  return { email, signedIn, subscription, loading, trialDaysLeft, refresh };
}

/** «27 July 2027» / «27 июля 2027» — дата окончания подписки. */
export function formatWaybackDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Инициалы для аватара: из имени, иначе из почты. «anna@…» → «AN». */
export function initialsFrom(email: string | null, name?: string | null) {
  const source = (name || email || "").trim();
  if (!source) return "";
  const words = source.split(/[\s.@_-]+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
