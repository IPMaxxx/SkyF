import { defaultLocale } from "../../i18n/brand-locale";
import type { FlavorConfig } from "../types";

/** SkyForest — полный продукт (skyforest.ai / skyforest.by), тёмная тема. */
export const skyforestFlavor: FlavorConfig = {
  id: "skyforest",
  name: "SkyForest",
  // Язык сайта задаётся сборкой (.by — русский, .ai — английский).
  defaultLocale,
  // Два языка: весь контент сайта — блог, посадочные, юридические страницы —
  // написан только по-русски и по-английски. Языки WayBack сюда не приходят.
  locales: ["ru", "en"],
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
  /**
   * Блог и карточка для ИИ-ассистентов есть только у SkyForest. Адреса ведут
   * на skyforest.by и не зависят от бренда сборки: фид и llms.txt существуют
   * в одном экземпляре, на .ai их нет.
   */
  contentFeed: {
    feedUrl: "https://www.skyforest.by/feed.xml",
    feedTitle: "Skyforest.by — Блог для грибников",
    authorUrl: "https://www.skyforest.by/llms.txt",
    aiDeclaration:
      "This site provides structured information for AI assistants via /llms.txt and /llms-full.txt. RSS feed available at /feed.xml",
  },
  internalSegment: null,
  internalRewrites: {},
};
