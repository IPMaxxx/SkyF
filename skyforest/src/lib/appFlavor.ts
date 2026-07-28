/**
 * «Флейворы» приложения: из одной кодовой базы собираются три продукта.
 *
 *  - skyforest — полный SkyForest (skyforest.ai / skyforest.by), как раньше;
 *  - checker  — Mushroom Checker: только распознавание грибов
 *               (checker.skyforest.ai + нативная оболочка ai.skyforest.mushroomchecker);
 *  - wayback  — WayBack: только возврат к точке входа
 *               (wayback.skyforest.ai + нативная оболочка ai.skyforest.wayback).
 *
 * Флейвор определяется ПО ХОСТУ ЗАПРОСА (никаких отдельных сборок/деплоев):
 * один Next-инстанс обслуживает все три домена. Middleware ограничивает
 * набор маршрутов и подменяет путь на внутренние сегменты флейвора
 * (`internalRewrites`), layout подставляет название/манифест/иконки.
 *
 * Здесь только общие функции. Настройки каждого приложения — в его каталоге
 * src/flavors/<id>/config.ts, сборка — в src/flavors/registry.ts.
 */

import { FLAVORS } from "../flavors/registry";
import type { AppFlavor, FlavorConfig } from "../flavors/types";

export { FLAVORS };
export type { AppFlavor, FlavorConfig };

/** Внутренние сегменты всех флейворов — их нельзя открыть по прямому URL. */
const INTERNAL_SEGMENTS = Object.values(FLAVORS)
  .map((cfg) => cfg.internalSegment)
  .filter((seg): seg is string => Boolean(seg));

/** Флейвор по хосту: checker.* / wayback.* → соответствующий, иначе skyforest. */
export function flavorFromHost(host: string | null | undefined): AppFlavor {
  const h = (host || "").toLowerCase().split(":")[0];
  if (h === "checker.skyforest.ai" || h.startsWith("checker.")) return "checker";
  if (h === "wayback.skyforest.ai" || h.startsWith("wayback.")) return "wayback";
  return "skyforest";
}

export function flavorConfig(flavor: AppFlavor): FlavorConfig {
  return FLAVORS[flavor];
}

/** Разрешён ли путь (без локали) в данном флейворе. */
export function isPathAllowed(flavor: AppFlavor, pathname: string): boolean {
  const cfg = FLAVORS[flavor];
  if (!cfg.allowedPaths) return true;
  if (pathname === "/") return true; // корень переписывается на посадочную
  return cfg.allowedPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Внутренний путь флейвора (`/ck/...`), пришедший как публичный URL. Такие
 * запросы уводим на домашнюю: сегменты предназначены только для rewrite.
 */
export function isInternalPath(pathname: string): boolean {
  return INTERNAL_SEGMENTS.some(
    (seg) => pathname === seg || pathname.startsWith(`${seg}/`),
  );
}

/** Куда переписать публичный путь внутри этого флейвора (или undefined). */
export function internalRewrite(
  flavor: AppFlavor,
  pathname: string,
): string | undefined {
  return FLAVORS[flavor].internalRewrites[pathname];
}

/** Доступен ли защищённый путь анонимно в данном флейворе. */
export function isAnonymousAllowed(flavor: AppFlavor, pathname: string): boolean {
  return FLAVORS[flavor].anonymousPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** Флейвор на клиенте (по window.location). До гидрации — skyforest. */
export function getClientFlavor(): AppFlavor {
  if (typeof window === "undefined") return "skyforest";
  return flavorFromHost(window.location.hostname);
}
