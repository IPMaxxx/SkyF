"use client";

import { createContext } from "react";
import type { AppFlavor } from "@/lib/appFlavor";

/**
 * Флейвор, определённый на сервере по хосту запроса.
 *
 * Нужен, чтобы брендированная разметка (логотип на входе, сплэш, футеры)
 * приходила правильной уже в SSR: без этого первый кадр показывал бы
 * SkyForest, а после гидрации перерисовывался в Checker/WayBack.
 */
export const FlavorContext = createContext<AppFlavor | null>(null);

export function FlavorProvider({
  flavor,
  children,
}: {
  flavor: AppFlavor;
  children: React.ReactNode;
}) {
  return <FlavorContext.Provider value={flavor}>{children}</FlavorContext.Provider>;
}
