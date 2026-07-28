import type { CapacitorConfig } from "@capacitor/cli";

/**
 * WayBack — флейвор SkyForest: только возврат к точке входа (track).
 *
 * WebView загружает wayback.skyforest.ai (тот же Next-инстанс; middleware по
 * хосту оставляет track + auth, трек работает и анонимно). Без сети —
 * автономный офлайн-экран из своей оболочки shell/ (webDir www собирается
 * скриптом sync-shell.mjs).
 *
 * Цвета — тёмный холст (#0b120d), общий с SkyForest: и фон вебвью, и сплэш.
 * Значения должны совпадать с холстом сайта, иначе на запуске и при
 * прокрутке за край мелькает полоса чужого фона.
 */
const serverUrl = process.env.CAP_SERVER_URL || "https://wayback.skyforest.ai";

const config: CapacitorConfig = {
  appId: "ai.skyforest.wayback",
  appName: "WayBack",
  webDir: "www",
  backgroundColor: "#0b120d",
  server: {
    url: serverUrl,
    cleartext: false,
    errorPath: "offline-track.html",
    allowNavigation: [
      "wayback.skyforest.ai",
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
      backgroundColor: "#0b120d",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashImmersive: true,
    },
  },
};

export default config;
