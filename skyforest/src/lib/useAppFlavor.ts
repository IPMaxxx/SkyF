"use client";

import { useContext, useSyncExternalStore } from "react";
import { getClientFlavor, type AppFlavor } from "@/lib/appFlavor";
import { FlavorContext } from "@/lib/FlavorProvider";

/**
 * Флейвор приложения на клиенте.
 *
 * Основной источник — контекст, который заполняет серверный layout по хосту
 * запроса: тогда SSR-разметка и первый клиентский рендер совпадают. Фолбэк на
 * window.location остаётся для деревьев, отрендеренных без провайдера
 * (паттерн useIsNative(): до монтирования — "skyforest").
 */
function subscribe(): () => void {
  return () => {};
}

export function useAppFlavor(): AppFlavor {
  const fromServer = useContext(FlavorContext);
  const detected = useSyncExternalStore(
    subscribe,
    () => getClientFlavor(),
    () => "skyforest" as AppFlavor,
  );
  return fromServer ?? detected;
}
