import { defaultLocale } from "../../i18n/brand-locale";
import type { FlavorConfig } from "../types";

/** SkyForest — полный продукт (skyforest.ai / skyforest.by), тёмная тема. */
export const skyforestFlavor: FlavorConfig = {
  id: "skyforest",
  name: "SkyForest",
  // Язык сайта задаётся сборкой (.by — русский, .ai — английский).
  defaultLocale,
  homePath: "/dashboard",
  allowedPaths: null,
  anonymousPaths: [],
  navHrefs: null,
  showTokens: true,
  manifestPath: "/manifest.webmanifest",
  faviconPath: "/favicon.png",
  logoPath: "/images/logo-square.png",
  nativeAppId: "ai.skyforest.app",
  themeColor: "#0b120d",
  statusBarStyle: "black-translucent",
  internalSegment: null,
  internalRewrites: {},
};
