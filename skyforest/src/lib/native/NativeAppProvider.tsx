"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { isNativeApp, getPlatform } from "./capacitor";

/**
 * Инициализация нативных возможностей при запуске внутри оболочки Capacitor.
 * В обычном браузере/PWA компонент ничего не делает (ранний return).
 *
 * Здесь:
 *  - скрываем splash-screen после загрузки;
 *  - настраиваем статусбар под тёмную тему бренда;
 *  - регистрируем push-уведомления и отправляем токен на бэкенд;
 *  - обрабатываем deep links (OAuth-редиректы Supabase, реферальные ссылки);
 *  - на Android обрабатываем аппаратную кнопку «Назад».
 */
export function NativeAppProvider() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;
    let disposed = false;
    const cleanups: Array<() => void> = [];

    (async () => {
      const platform = getPlatform();

      // --- Splash screen ---
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch {
        /* плагин недоступен — игнорируем */
      }

      // --- Status bar (тёмный фон бренда, светлые иконки) ---
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Dark });
        if (platform === "android") {
          await StatusBar.setBackgroundColor({ color: "#0f1a12" });
        }
      } catch {
        /* игнорируем */
      }

      // --- Deep links (OAuth callback, рефералы) ---
      try {
        const { App } = await import("@capacitor/app");
        const sub = await App.addListener("appUrlOpen", ({ url }) => {
          if (disposed) return;
          try {
            const parsed = new URL(url);
            // Приводим внешний deep link к внутреннему пути приложения.
            const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
            if (path && path !== "/") router.push(path);
          } catch {
            /* некорректный url — игнорируем */
          }
        });
        cleanups.push(() => void sub.remove());

        // Android hardware back
        const back = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) window.history.back();
          else void App.exitApp();
        });
        cleanups.push(() => void back.remove());
      } catch {
        /* игнорируем */
      }

      // --- Push notifications ---
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const perm = await PushNotifications.checkPermissions();
        let receive = perm.receive;
        if (receive === "prompt" || receive === "prompt-with-rationale") {
          receive = (await PushNotifications.requestPermissions()).receive;
        }
        if (receive === "granted") {
          const reg = await PushNotifications.addListener("registration", (token) => {
            void fetch("/api/native/push-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: token.value, platform }),
            }).catch(() => {});
          });
          cleanups.push(() => void reg.remove());

          const tap = await PushNotifications.addListener(
            "pushNotificationActionPerformed",
            (action) => {
              const link = action.notification.data?.link as string | undefined;
              if (link) router.push(link);
            },
          );
          cleanups.push(() => void tap.remove());

          await PushNotifications.register();
        }
      } catch {
        /* игнорируем */
      }
    })();

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  }, [router]);

  return null;
}
