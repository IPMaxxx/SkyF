"use client";

import { useCheckerHistoryTracking } from "@/lib/checker/backNavigation";

/**
 * Считает переходы внутри документа, чтобы кнопки «назад» знали, есть ли куда
 * возвращаться. Монтируется в layout всего дерева `ck/*` — в том числе на
 * экранах входа, чтобы счётчик начинался с самого первого экрана сессии.
 */
export function CheckerHistoryTracker() {
  useCheckerHistoryTracking();
  return null;
}
