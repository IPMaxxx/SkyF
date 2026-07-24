"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
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
 *  - на Android обрабатываем аппаратную кнопку «Назад»;
 *  - лениво инициализируем IAP-store, чтобы прерванные покупки допроводились.
 */
export function NativeAppProvider() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("payment");
  const tRef = useRef(t);
  tRef.current = t;

  // Стартовый маршрут native: при холодном запуске с корня «/».
  //  - есть сессия → сразу в кабинет /dashboard;
  //  - нет сессии → на экран входа /login (в native стартуем не с лендинга).
  // `pathname` из i18n-навигации не содержит префикс локали, поэтому «/»
  // покрывает и ru, и en. Deep links задают непустой путь и сюда не попадают,
  // web не затрагивается.
  useEffect(() => {
    if (!isNativeApp()) return;
    if (pathname !== "/") return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        router.replace(session ? "/dashboard" : "/login");
      } catch {
        // ошибка получения сессии — считаем, что не авторизован
        if (!cancelled) router.replace("/login");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isNativeApp()) return;
    let disposed = false;
    const cleanups: Array<() => void> = [];

    (async () => {
      const platform = getPlatform();

      // Нативный splash прячет NativeSplash (после отрисовки своего брендового
      // экрана) — здесь этого не делаем, иначе между ними мелькнёт пустой WebView.

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

      // --- In-App Purchases: инициализация store (лениво, не блокируя старт).
      // Допроводит прерванные покупки: approved-транзакции без активного
      // вызова purchasePack верифицируются сервером, начисляются и
      // показывают пользователю toast об успешном начислении. ---
      import("@/lib/native/iap")
        .then(({ initIap }) =>
          initIap({
            onBackgroundCredit: (tokens) => {
              if (!disposed) toast.success(tRef.current("iapCredited", { tokens }));
            },
          }),
        )
        .catch(() => {
          /* плагин недоступен — игнорируем */
        });

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
