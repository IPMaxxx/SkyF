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
  // Фон самого WebView: пока страница не отрисована (или грузится медленно),
  // виден тёмный брендовый цвет, а не белая вспышка.
  backgroundColor: "#0e1710",
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
      // Не прячем автоматически: нативный splash висит, пока веб-приложение не
      // отрисует свой брендовый splash (NativeSplash) с тем же логотипом —
      // тогда переход бесшовный, без «белой» вспышки пустого WebView. Прячется
      // из веба (NativeSplash) и с офлайн-страниц (offline-track/index).
      launchAutoHide: false,
      backgroundColor: "#0e1710",
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
