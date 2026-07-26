import type { CapacitorConfig } from "@capacitor/cli";

/**
 * WayBack — флейвор SkyForest: только возврат к точке входа (track).
 *
 * WebView загружает wayback.skyforest.ai (тот же Next-инстанс; middleware по
 * хосту оставляет track + auth, трек работает и анонимно). Без сети —
 * автономный офлайн-экран mobile/shell/offline-track.html (webDir www —
 * копия общего ядра, см. sync-shell.mjs), как в основном приложении.
 */
const serverUrl = process.env.CAP_SERVER_URL || "https://wayback.skyforest.ai";

const config: CapacitorConfig = {
  appId: "ai.skyforest.wayback",
  appName: "WayBack",
  webDir: "www",
  backgroundColor: "#0e1710",
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
      backgroundColor: "#0e1710",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashImmersive: true,
    },
  },
};

export default config;
