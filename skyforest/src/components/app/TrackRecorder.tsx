"use client";

/**
 * Невидимый глобальный «магнитофон» похода: живёт в (app)-layout.
 *
 * Пока приложение активно и есть поход — работает непрерывный watchPosition
 * (частые точки, фильтры точности/сдвига в trackRecorder). При уходе в фон
 * watch останавливается (батарея; в фоне WebView координат всё равно нет),
 * при возврате — мгновенный одиночный замер + перезапуск watch. Страховочный
 * редкий таймер оставлен на случай, если watch молчит. Без активного похода
 * каждый тик — дешёвый no-op без обращения к GPS.
 */

import { useEffect } from "react";
import { isNativeApp } from "@/lib/native/capacitor";
import {
  captureTrackPoint,
  syncTrackWatch,
  stopTrackWatch,
  TRACK_CAPTURE_INTERVAL_MS,
} from "@/lib/trackRecorder";
import { TRACK_STATE_EVENT } from "@/lib/trackState";

export function TrackRecorder() {
  useEffect(() => {
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
