import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor конфиг для нативных приложений SkyForest (.ai / SAMPLIFY FZCO).
 *
 * Стратегия: WebView загружает боевой сайт skyforest.ai (SSR + API + middleware
 * работают как есть), а нативные возможности (push, гео, камера, биометрия, IAP)
 * подключаются через плагины Capacitor и активируются только внутри нативной
 * оболочки (см. src/lib/native/*).
 *
 * server.url можно переопределить через CAP_SERVER_URL для локальной отладки
 * (например http://192.168.x.x:3000). webDir используется только как fallback,
 * если удалённый сервер недоступен на старте.
 */
const serverUrl = process.env.CAP_SERVER_URL || "https://skyforest.ai";

const config: CapacitorConfig = {
  appId: "ai.skyforest.app",
  appName: "SkyForest",
  webDir: "mobile/shell",
  server: {
    url: serverUrl,
    cleartext: false,
    // Если боевой сайт недоступен (нет сети на холодном старте), Android
    // открывает автономный офлайн-экран Track вместо системной ошибки.
    // На iOS/общий случай fallback — mobile/shell/index.html, который сам
    // ведёт на этот же экран (см. кнопки в index.html).
    errorPath: "offline-track.html",
    // Домены, навигация на которые остаётся внутри WebView.
    // Stripe/OAuth-редиректы Supabase должны попадать сюда либо
    // открываться через @capacitor/browser (см. native bridge).
    allowNavigation: [
      "skyforest.ai",
      "www.skyforest.ai",
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
      launchShowDuration: 1200,
      backgroundColor: "#0f1a12",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
