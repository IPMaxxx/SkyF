import { COMMON_ALLOWED_PATHS, type FlavorConfig } from "../types";

/**
 * WayBack — только возврат к точке входа
 * (wayback.skyforest.ai + нативная оболочка ai.skyforest.wayback).
 */
export const waybackFlavor: FlavorConfig = {
  id: "wayback",
  name: "WayBack",
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
  internalSegment: null,
  internalRewrites: {},
};
