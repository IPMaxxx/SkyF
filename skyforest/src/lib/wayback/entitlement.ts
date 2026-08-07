"use client";

/**
 * Право на приложение WayBack: пускать пользователя внутрь или показать гейт.
 *
 * В нативной оболочке подписка обязательна с первого запуска, а само право
 * живёт на сервере (`/api/subscription` → `user_subscriptions`, скоуп по
 * приложению). Приложение при этом задумано для похода без связи, поэтому
 * серверная проверка НЕ может быть условием входа: если её провалить по
 * таймауту, заплативший человек останется снаружи ровно там, где стрелка домой
 * нужнее всего.
 *
 * Отсюда правило кеша: право, однажды подтверждённое сервером на этом
 * устройстве, запоминается, и при недоступном сервере оно пускает внутрь без
 * оглядки на дату окончания. Дату мы всё равно не можем проверить офлайн, а
 * ошибаться безопаснее в сторону пользователя. Обратная сторона — человек,
 * оформивший пробный период и навсегда ушедший в самолётный режим, останется с
 * приложением; это осознанный обмен, и он дешевле, чем запертый в глуши
 * подписчик.
 *
 * Кеш чистится, когда сервер ответил «подписки нет» или пользователь вышел из
 * аккаунта: он привязан к user id, и чужое право по нему не наследуется.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/offline/deadline";

const CACHE_KEY = "wb:entitlement:v1";

/** Сколько ждём `/api/subscription`, прежде чем считать сервер недоступным. */
const CHECK_TIMEOUT_MS = 8000;
/** Столько же — на чтение сессии: оно тоже умеет уходить в сеть, см. ниже. */
const SESSION_TIMEOUT_MS = 8000;

export interface CachedEntitlement {
  userId: string;
  currentPeriodEnd: string;
  /** Когда право последний раз подтвердил сервер. */
  checkedAt: number;
}

export function readEntitlementCache(): CachedEntitlement | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntitlement;
    return parsed && typeof parsed.userId === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeEntitlementCache(entry: CachedEntitlement): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* приватный режим или переполненное хранилище — кеш необязателен */
  }
}

export function clearEntitlementCache(): void {
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* см. writeEntitlementCache */
  }
}

export type WaybackGateStatus =
  /** Ещё не знаем — показываем нейтральную заглушку, а не «подписки нет». */
  | "resolving"
  /** Не вошёл: право привязано к учётной записи, покупать не к чему. */
  | "needAuth"
  /** Вошёл, активного права нет — пейволл. */
  | "needSubscription"
  /** Сервер недоступен, и подтверждённого права на устройстве никогда не было. */
  | "unreachable"
  | "allowed";

export interface WaybackGateState {
  status: WaybackGateStatus;
  /** Пустили по кешу: сервер не ответил, право не перепроверено. */
  fromCache: boolean;
  /** Почта вошедшего — гейту нужно показать, под кем он предлагает платить. */
  email: string | null;
  recheck: () => Promise<void>;
}

/**
 * Разрешение доступа для нативной оболочки.
 *
 * `enabled = false` (веб) отдаёт `allowed` сразу и не делает ни одного
 * запроса: в браузере покупка стора невозможна, и гейт там был бы тупиком.
 */
export function useWaybackGate(enabled: boolean): WaybackGateState {
  const [status, setStatus] = useState<WaybackGateStatus>(
    enabled ? "resolving" : "allowed",
  );
  const [fromCache, setFromCache] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  // Гонка двух проверок (монтирование + событие входа) могла бы вернуть на
  // экран уже снятый гейт: применяем только результат последней.
  const runRef = useRef(0);

  const check = useCallback(async () => {
    if (!enabled) {
      setStatus("allowed");
      return;
    }
    const run = (runRef.current += 1);
    const commit = (next: WaybackGateStatus, cached: boolean) => {
      if (runRef.current !== run) return;
      setStatus(next);
      setFromCache(cached);
    };

    const cached = readEntitlementCache();
    // `enabled` приезжает вторым рендером (useIsNative на сервере отдаёт false),
    // поэтому стартовое состояние успевает оказаться «allowed». Без этой строки
    // приложение мигнуло бы на кадр раньше гейта. Чтение кеша синхронно, так что
    // до первого await состояние уже верное.
    if (!cached) commit("resolving", false);
    const supabase = createClient();

    // getSession() читает локальное хранилище — единственный способ узнать
    // «вошёл ли» без связи. getUser() здесь не годится: без сети он вернул бы
    // ошибку, и гейт принял бы подписчика за анонима.
    //
    // Срок нужен и ему, хотя запрос он по себе не делает: протухший токен
    // auth-js обновляет прямо внутри, то есть уходит в сеть. На мёртвом
    // соединении это ожидание не кончается ничем, а гейт закрывает собой весь
    // экран похода — человек остался бы со спиннером вместо стрелки домой.
    let userId: string | null = null;
    try {
      const { data } = await withTimeout(
        supabase.auth.getSession(),
        SESSION_TIMEOUT_MS,
        "supabase.auth.getSession",
      );
      userId = data.session?.user?.id ?? null;
      setEmail(data.session?.user?.email ?? null);
    } catch {
      // Блокировка хранилища auth-js или молчание сети. Сессию не прочитать —
      // решаем по кешу.
      if (cached) {
        commit("allowed", true);
        return;
      }
      commit("unreachable", false);
      return;
    }

    if (!userId) {
      clearEntitlementCache();
      commit("needAuth", false);
      return;
    }

    const cachedForUser = cached?.userId === userId ? cached : null;
    // Подписчика не держим на заглушке, пока идёт запрос: пускаем сразу по
    // кешу, а ответ сервера при необходимости поправит картину.
    if (cachedForUser) commit("allowed", true);

    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch("/api/subscription", {
          cache: "no-store",
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timer);
      }

      if (res.status === 401) {
        // Сессия на сервере не принята — считаем, что человек не вошёл.
        clearEntitlementCache();
        commit("needAuth", false);
        return;
      }
      if (!res.ok) throw new Error(`subscription check failed: ${res.status}`);

      const data = (await res.json()) as {
        subscription?: { current_period_end?: string } | null;
      };
      const end = data.subscription?.current_period_end;
      if (end) {
        writeEntitlementCache({
          userId,
          currentPeriodEnd: end,
          checkedAt: Date.now(),
        });
        commit("allowed", false);
      } else {
        clearEntitlementCache();
        commit("needSubscription", false);
      }
    } catch {
      // Связи нет. Право, когда-то подтверждённое на этом устройстве, пускает
      // внутрь — см. комментарий в начале файла.
      if (cachedForUser) commit("allowed", true);
      else commit("unreachable", false);
    }
  }, [enabled]);

  useEffect(() => {
    void check();
    if (!enabled) return;

    // Вход из гейта и выход из аккаунта должны снимать и возвращать гейт без
    // перезагрузки: страница трека клиентская и переживает router.refresh().
    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
      // Колбэк выполняется под блокировкой auth-клиента, поэтому обращение к
      // нему откладываем на следующий тик (иначе повиснет сам выход).
      setTimeout(() => void check(), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [check, enabled]);

  return { status, fromCache, email, recheck: check };
}
