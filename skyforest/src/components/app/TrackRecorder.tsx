"use client";

/**
 * Невидимый глобальный «магнитофон» похода: живёт в (app)-layout, поэтому
 * точки пути пишутся раз в ~1,5 минуты на любой странице приложения, а не
 * только на странице трека. Плюс мгновенный замер при возврате вкладки
 * (visibilitychange) и приложения из фона (Capacitor appStateChange).
 * Без активного похода каждый тик — дешёвый no-op без обращения к GPS.
 */

import { useEffect } from "react";
import { isNativeApp } from "@/lib/native/capacitor";
import { captureTrackPoint, TRACK_CAPTURE_INTERVAL_MS } from "@/lib/trackRecorder";

export function TrackRecorder() {
  useEffect(() => {
    void captureTrackPoint();
    const interval = setInterval(() => void captureTrackPoint(), TRACK_CAPTURE_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void captureTrackPoint();
    };
    document.addEventListener("visibilitychange", onVisibility);

    let removeListener: (() => void) | undefined;
    if (isNativeApp()) {
      void import("@capacitor/app").then(({ App }) =>
        App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) void captureTrackPoint();
        }).then((sub) => {
          removeListener = () => void sub.remove();
        }),
      );
    }

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      removeListener?.();
    };
  }, []);

  return null;
}
