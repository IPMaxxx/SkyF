"use client";

/**
 * Невидимый глобальный «магнитофон» похода: живёт в layout приложения.
 *
 * Пока есть поход, работает непрерывный watch (частые точки, фильтры
 * точности/сдвига в trackRecorder). Что происходит при уходе в фон, зависит от
 * оболочки: с переданным `notice` и нативной частью фоновой записи watch не
 * снимается и точки продолжают писаться с погашенным экраном, без него — watch
 * глохнет (батарея; обычный WebView в фоне координат не получает), а при
 * возврате делается мгновенный замер и watch поднимается снова. Страховочный
 * редкий таймер оставлен на случай, если watch молчит. Без активного похода
 * каждый тик — дешёвый no-op без обращения к GPS.
 */

import { useEffect } from "react";
import { isNativeApp } from "@/lib/native/capacitor";
import {
  captureTrackPoint,
  syncTrackWatch,
  stopTrackWatch,
  setBackgroundNotice,
  TRACK_CAPTURE_INTERVAL_MS,
} from "@/lib/trackRecorder";
import type { BackgroundNotice } from "@/lib/track/backgroundWatch";
import { TRACK_STATE_EVENT, hydrateTrackFromNative } from "@/lib/trackState";

/**
 * `notice` — текст постоянного уведомления Android, без которого фоновую запись
 * включать нельзя. Приложение передаёт его из своего словаря; без него запись
 * работает по-старому и в фоне останавливается.
 */
export function TrackRecorder({ notice }: { notice?: BackgroundNotice }) {
  // По строкам, а не по объекту: родитель может пересобирать литерал на каждый
  // рендер, а лишняя сверка дёргает фоновую службу.
  const title = notice?.title;
  const message = notice?.message;
  useEffect(() => {
    if (title && message) setBackgroundNotice({ title, message });
  }, [title, message]);

  useEffect(() => {
    // Поход мог быть начат в офлайн-экране (Preferences). Если сеть появилась и
    // приложение открылось — переносим его в localStorage сайта, чтобы запись
    // пути и точка входа продолжились без потери.
    void hydrateTrackFromNative().then((restored) => {
      if (restored) syncTrackWatch(document.visibilityState === "visible");
    });

    void captureTrackPoint();
    syncTrackWatch(document.visibilityState === "visible");

    const interval = setInterval(() => void captureTrackPoint(), TRACK_CAPTURE_INTERVAL_MS);

    // Старт/завершение похода — включить/выключить watch немедленно.
    const onStateChange = () => syncTrackWatch(document.visibilityState === "visible");
    window.addEventListener(TRACK_STATE_EVENT, onStateChange);

    const onVisibility = () => {
      const visible = document.visibilityState === "visible";
      if (visible) void captureTrackPoint();
      syncTrackWatch(visible);
    };
    document.addEventListener("visibilitychange", onVisibility);

    let removeListener: (() => void) | undefined;
    if (isNativeApp()) {
      void import("@capacitor/app").then(({ App }) =>
        App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) void captureTrackPoint();
          syncTrackWatch(isActive);
        }).then((sub) => {
          removeListener = () => void sub.remove();
        }),
      );
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener(TRACK_STATE_EVENT, onStateChange);
      document.removeEventListener("visibilitychange", onVisibility);
      removeListener?.();
      stopTrackWatch();
    };
  }, []);

  return null;
}
