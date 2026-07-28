import { COMMON_ALLOWED_PATHS, type FlavorConfig } from "../types";

/**
 * Mushroom Checker — только распознавание грибов
 * (checker.skyforest.ai + нативная оболочка ai.skyforest.mushroomchecker).
 *
 * Все экраны живут в src/app/[locale]/ck и попадают туда через
 * `internalRewrites`: публичные URL при этом не меняются.
 */
export const checkerFlavor: FlavorConfig = {
  id: "checker",
  name: "Mushroom Checker",
  // Приложение международное: основной язык английский, русский — по выбору.
  defaultLocale: "en",
  homePath: "/dashboard/identify",
  allowedPaths: [
    ...COMMON_ALLOWED_PATHS,
    "/dashboard/identify",
    "/payment",
    "/offer",
  ],
  anonymousPaths: [],
  navHrefs: ["/dashboard/identify"],
  // Токенов в Checker нет — монетизация только подпиской (/payment).
  showTokens: false,
  manifestPath: "/manifest-checker.webmanifest",
  faviconPath: "/icons/checker-192.png",
  logoPath: "/icons/checker-512.png",
  nativeAppId: "ai.skyforest.mushroomchecker",
  themeColor: "#f3f7f1",
  statusBarStyle: "default",
  internalSegment: "/ck",
  internalRewrites: {
    "/": "/ck/landing",
    "/login": "/ck/login",
    "/register": "/ck/register",
    "/forgot-password": "/ck/forgot-password",
    "/reset-password": "/ck/reset-password",
    "/verify-mfa": "/ck/verify-mfa",
    "/dashboard/identify": "/ck/identify",
    "/account": "/ck/account",
    "/payment": "/ck/payment",
  },
};
