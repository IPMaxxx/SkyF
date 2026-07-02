"use client";

import { useSyncExternalStore } from "react";
import { isNativeApp } from "./capacitor";

/**
 * Hydration-safe признак нативной оболочки.
 *
 * На сервере и во время гидрации всегда возвращает `false` (default = веб),
 * чтобы разметка сервера и клиента совпадала. После монтирования на клиенте
 * пересчитывается в реальное значение `isNativeApp()`. Наличие Capacitor не
 * меняется в рамках сессии, поэтому подписка — no-op.
 */
function subscribe(): () => void {
  return () => {};
}

export function useIsNative(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isNativeApp(),
    () => false,
  );
}
