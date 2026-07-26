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
 * набор маршрутов, layout подставляет название/манифест/иконки, навигация
 * (AppHeader/NativeTabBar) обрезается через useAppFlavor().
 */

export type AppFlavor = "skyforest" | "checker" | "wayback";

export interface FlavorConfig {
  id: AppFlavor;
  /** Публичное имя приложения (заголовки, манифест, header). */
  name: string;
  /** Домашняя страница кабинета — сюда уводим с чужих маршрутов. */
  homePath: string;
  /** Пути, разрешённые на поддомене (префиксы после отрезания локали). null = всё. */
  allowedPaths: string[] | null;
  /**
   * Защищённые пути, доступные БЕЗ логина в этом флейворе
   * (wayback: трек должен работать анонимно — история хранится в localStorage).
   */
  anonymousPaths: string[];
  /** Пункты навигации кабинета (href из AppHeader.NAV / NativeTabBar). null = все. */
  navHrefs: string[] | null;
  /** Показывать ли баланс токенов/оплату в шапке. */
  showTokens: boolean;
  /** PWA-манифест и favicon этого флейвора. */
  manifestPath: string;
  faviconPath: string;
  /** id нативного приложения (Capacitor appId). */
  nativeAppId: string;
}

const COMMON_ALLOWED = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-mfa",
  "/account",
  "/privacy",
  "/delete-account",
  "/landing",
];

export const FLAVORS: Record<AppFlavor, FlavorConfig> = {
  skyforest: {
    id: "skyforest",
    name: "SkyForest",
    homePath: "/dashboard",
    allowedPaths: null,
    anonymousPaths: [],
    navHrefs: null,
    showTokens: true,
    manifestPath: "/manifest.webmanifest",
    faviconPath: "/favicon.png",
    nativeAppId: "ai.skyforest.app",
  },
  checker: {
    id: "checker",
    name: "Mushroom Checker",
    homePath: "/dashboard/identify",
    allowedPaths: [
      ...COMMON_ALLOWED,
      "/dashboard/identify",
      "/payment",
      "/offer",
    ],
    anonymousPaths: [],
    navHrefs: ["/dashboard/identify"],
    showTokens: true,
    manifestPath: "/manifest-checker.webmanifest",
    faviconPath: "/icons/checker-192.png",
    nativeAppId: "ai.skyforest.mushroomchecker",
  },
  wayback: {
    id: "wayback",
    name: "WayBack",
    homePath: "/dashboard/track",
    allowedPaths: [...COMMON_ALLOWED, "/dashboard/track"],
    anonymousPaths: ["/dashboard/track"],
    navHrefs: ["/dashboard/track"],
    showTokens: false,
    manifestPath: "/manifest-wayback.webmanifest",
    faviconPath: "/icons/wayback-192.png",
    nativeAppId: "ai.skyforest.wayback",
  },
};

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
