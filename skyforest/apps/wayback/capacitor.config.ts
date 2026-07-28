import type { CapacitorConfig } from "@capacitor/cli";

/**
 * WayBack — флейвор SkyForest: только возврат к точке входа (track).
 *
 * WebView загружает wayback.skyforest.ai (тот же Next-инстанс; middleware по
 * хосту оставляет track + auth, трек работает и анонимно). Без сети —
 * автономный офлайн-экран из своей оболочки shell/ (webDir www собирается
 * скриптом sync-shell.mjs).
 *
 * Цвета — светлый холст схемы «Widget Board» (#eef0ec): и фон вебвью, и сплэш,
 * иначе на запуске мелькает тёмный экран прежнего оформления.
 */
const serverUrl = process.env.CAP_SERVER_URL || "https://wayback.skyforest.ai";

const config: CapacitorConfig = {
  appId: "ai.skyforest.wayback",
  appName: "WayBack",
  webDir: "www",
  backgroundColor: "#eef0ec",
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
      backgroundColor: "#eef0ec",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashImmersive: true,
    },
  },
};

export default config;
