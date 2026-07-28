import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Mushroom Checker — флейвор SkyForest: только распознавание грибов.
 * WebView загружает checker.skyforest.ai (тот же Next-инстанс, что и
 * skyforest.ai, — middleware по хосту оставляет только identify/auth/payment).
 */
const serverUrl = process.env.CAP_SERVER_URL || "https://checker.skyforest.ai";

/**
 * Холст тёмной темы — она основная (светлую пользователь включает сам).
 * Значение должно совпадать с холстом сайта, иначе при запуске и при
 * прокрутке за край мелькает полоса чужого фона. У тех, кто выбрал светлую
 * тему, полоса за краем остаётся тёмной: цвет вшит в бинарник и выбор
 * пользователя ему недоступен.
 */
const CANVAS = "#0b120d";

const config: CapacitorConfig = {
  appId: "ai.skyforest.mushroomchecker",
  appName: "Mushroom Checker",
  webDir: "www",
  backgroundColor: CANVAS,
  server: {
    url: serverUrl,
    cleartext: false,
    errorPath: "index.html",
    allowNavigation: [
      "checker.skyforest.ai",
      "skyforest.ai",
      "*.supabase.co",
    ],
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: CANVAS,
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashImmersive: true,
    },
  },
};

export default config;
