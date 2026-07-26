"use client";

import { useSyncExternalStore } from "react";
import { getClientFlavor, type AppFlavor } from "@/lib/appFlavor";

/**
 * Hydration-safe флейвор приложения на клиенте (по hostname).
 *
 * На сервере и во время гидрации возвращает "skyforest" (разметка совпадает
 * с прежней), после монтирования пересчитывается по window.location — тот же
 * паттерн, что useIsNative(). Хост в рамках сессии не меняется.
 */
function subscribe(): () => void {
  return () => {};
}

export function useAppFlavor(): AppFlavor {
  return useSyncExternalStore(
    subscribe,
    () => getClientFlavor(),
    () => "skyforest" as AppFlavor,
  );
}
