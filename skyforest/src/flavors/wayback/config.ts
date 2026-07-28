import { defaultLocale } from "../../i18n/brand-locale";
import { COMMON_ALLOWED_PATHS, type FlavorConfig } from "../types";

/**
 * WayBack — только возврат к точке входа
 * (wayback.skyforest.ai + нативная оболочка ai.skyforest.wayback).
 *
 * Все экраны живут в src/app/[locale]/wb и попадают туда через
 * `internalRewrites`: публичные URL при этом не меняются.
 */
export const waybackFlavor: FlavorConfig = {
  id: "wayback",
  name: "WayBack",
  defaultLocale,
  homePath: "/dashboard/track",
  // /payment и /offer нужны для пейволла подписки (требует логин).
  allowedPaths: [
    ...COMMON_ALLOWED_PATHS,
    "/dashboard/track",
    "/payment",
    "/offer",
  ],
  anonymousPaths: ["/dashboard/track"],
  navHrefs: ["/dashboard/track"],
  showTokens: false,
  manifestPath: "/manifest-wayback.webmanifest",
  faviconPath: "/icons/wayback-192.png",
  logoPath: "/icons/wayback-512.png",
  nativeAppId: "ai.skyforest.wayback",
  themeColor: "#eef0ec",
  statusBarStyle: "default",
  internalSegment: "/wb",
  internalRewrites: {
    "/": "/wb/landing",
    "/login": "/wb/login",
    "/register": "/wb/register",
    "/forgot-password": "/wb/forgot-password",
    "/reset-password": "/wb/reset-password",
    "/verify-mfa": "/wb/verify-mfa",
    "/dashboard/track": "/wb/track",
    "/account": "/wb/account",
    "/payment": "/wb/payment",
  },
};
