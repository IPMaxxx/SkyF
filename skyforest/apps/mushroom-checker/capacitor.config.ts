import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Mushroom Checker — флейвор SkyForest: только распознавание грибов.
 * WebView загружает checker.skyforest.ai (тот же Next-инстанс, что и
 * skyforest.ai, — middleware по хосту оставляет только identify/auth/payment).
 */
const serverUrl = process.env.CAP_SERVER_URL || "https://checker.skyforest.ai";

const config: CapacitorConfig = {
  appId: "ai.skyforest.mushroomchecker",
  appName: "Mushroom Checker",
  webDir: "www",
  // Светлая схема редизайна: WebView не должен мигать тёмным.
  backgroundColor: "#F3F7F1",
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
      backgroundColor: "#F3F7F1",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashImmersive: true,
    },
  },
};

export default config;
