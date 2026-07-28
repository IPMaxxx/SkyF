"use client";

/**
 * Позиция для карты стартового экрана WayBack.
 *
 * Карта показывается сразу, а координаты подтягиваются асинхронно, поэтому
 * хук держит три вещи отдельно: чем центрировать карту прямо сейчас
 * (`lastKnown`, читается синхронно из localStorage), свежий фикс (`position`)
 * и состояние поиска для подписи под картой.
 *
 * Три случая, в которых экран не должен зависнуть на спиннере:
 *  - разрешение не выдано никогда (в браузере видно из Permissions API — тогда
 *    системный запрос даже не показываем, он всё равно не появится);
 *  - разрешение отклонено при запросе (code 1 / «denied» в сообщении плагина);
 *  - холодный GPS в лесу молчит — свой таймаут, потому что у Capacitor
 *    Geolocation в общей обёртке getCurrentPosition его нет.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentPosition, type Coords } from "@/lib/native/geolocation";
import { loadLastKnownPosition } from "@/lib/lastKnownPosition";
import { isNativeApp } from "@/lib/native/capacitor";

/** Дольше этого спиннер висеть не должен — показываем «позиции нет». */
const FIX_TIMEOUT_MS = 20_000;

export type PositionStatus = "locating" | "ready" | "denied" | "unavailable";

export interface HomePosition {
  /** Свежий фикс GPS; null — ещё не получен. */
  position: Coords | null;
  /** Последняя известная позиция: центр карты до первого фикса. */
  lastKnown: Coords | null;
  status: PositionStatus;
  /** Повтор по кнопке. Возвращает координаты, если фикс получен. */
  locate: () => Promise<Coords | null>;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("geo_timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** Отказ в разрешении: code 1 у браузера, текст сообщения у плагина. */
function isPermissionDenied(err: unknown): boolean {
  const e = err as { code?: number; message?: string } | null;
  if (!e || typeof e !== "object") return false;
  if (e.code === 1) return true;
  return /denied|permission/i.test(e.message ?? "");
}

/**
 * Отклонено ли разрешение навсегда. Только для браузера: в нативной оболочке
 * решение принимает плагин, а WebView отвечает на этот запрос неточно.
 */
async function deniedUpfront(): Promise<boolean> {
  if (isNativeApp()) return false;
  try {
    const query = navigator.permissions?.query;
    if (!query) return false;
    const status = await navigator.permissions.query({
      name: "geolocation" as PermissionName,
    });
    return status.state === "denied";
  } catch {
    return false;
  }
}

export function useHomePosition(known: Coords | null): HomePosition {
  // Синхронно, до первой отрисовки: карта сразу открывается в знакомом месте,
  // а не на обзоре страны, и потом не прыгает.
  const [lastKnown] = useState<Coords | null>(() => {
    if (typeof window === "undefined") return null;
    return loadLastKnownPosition();
  });
  const [position, setPosition] = useState<Coords | null>(known);
  const [status, setStatus] = useState<PositionStatus>(
    known ? "ready" : "locating",
  );

  const alive = useRef(true);
  /** Один замер в единицу времени: повторное нажатие не плодит подписки. */
  const inFlight = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const locate = useCallback(async (): Promise<Coords | null> => {
    if (inFlight.current) return null;
    inFlight.current = true;
    if (alive.current) setStatus("locating");
    try {
      const pos = await withTimeout(getCurrentPosition(), FIX_TIMEOUT_MS);
      if (alive.current) {
        setPosition(pos);
        setStatus("ready");
      }
      return pos;
    } catch (err) {
      if (alive.current) {
        setStatus(isPermissionDenied(err) ? "denied" : "unavailable");
      }
      return null;
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Первый замер сам, без действий пользователя: точка «я здесь» должна
  // появиться на карте при открытии экрана.
  useEffect(() => {
    if (known) return;
    void deniedUpfront().then((denied) => {
      if (!alive.current) return;
      if (denied) {
        setStatus("denied");
        return;
      }
      void locate();
    });
  }, [known, locate]);

  return { position, lastKnown, status, locate };
}
