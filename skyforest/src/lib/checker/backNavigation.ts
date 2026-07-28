"use client";

/**
 * Безопасный «назад» для Mushroom Checker.
 *
 * Нативная оболочка — это один WebView с одной историей, и она начинается с
 * того URL, который WebView загрузил последним. Если iOS выгрузила процесс
 * WebView из фона или сработал `errorPath`, приложение открывается заново
 * прямо на текущем экране, и перед ним в стеке нет ничего. В такой ситуации
 * `router.back()` молча ничего не делает — именно поэтому с экрана аккаунта
 * нельзя было выйти.
 *
 * Поэтому считаем собственные переходы: `pushState` вызывает и next/link, и
 * `router.push`, а `popstate` приходит на каждый возврат. Если считать нечего,
 * уходим на запасной экран через `replace`, чтобы не растить стек.
 */

import { useCallback, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

/** Домашний экран приложения: сюда возвращаемся, когда истории нет. */
export const CHECKER_HOME = "/dashboard/identify";

let pushCount = 0;
let installed = false;

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalPushState = window.history.pushState.bind(window.history);
  window.history.pushState = function trackedPushState(
    ...args: Parameters<History["pushState"]>
  ) {
    pushCount += 1;
    return originalPushState(...args);
  };

  window.addEventListener("popstate", () => {
    pushCount = Math.max(0, pushCount - 1);
  });
}

/** Ставится один раз в layout приложения — до любых переходов. */
export function useCheckerHistoryTracking() {
  useEffect(install, []);
}

/** Есть ли куда возвращаться внутри этой сессии WebView. */
export function canGoBackInApp(): boolean {
  return pushCount > 0;
}

/**
 * Обработчик кнопки «назад»: предыдущий экран, а если истории нет —
 * `fallback` (по умолчанию домашний экран).
 */
export function useCheckerBack(fallback: string = CHECKER_HOME) {
  const router = useRouter();
  return useCallback(() => {
    if (canGoBackInApp()) router.back();
    else router.replace(fallback);
  }, [router, fallback]);
}
