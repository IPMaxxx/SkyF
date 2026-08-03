"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { isNativeApp } from "./capacitor";
import { appPlugin } from "./plugins";
import { navigateToDeepLink, takeLaunchUrl } from "./deepLinks";

/**
 * Слушатель открытия приложения по ссылке — для оболочек без
 * `NativeAppProvider` (WayBack: его дерево `wb/*` лежит вне группы `(app)`,
 * и провайдеры кабинета SkyForest туда не попадают).
 *
 * Нужен плагин `@capacitor/app` в `package.json` оболочки: JS приезжает с
 * сайта, а нативная часть — из бинарника. В WayBack плагин есть.
 *
 * В браузере компонент ничего не делает.
 */
export function DeepLinkListener() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;
    let disposed = false;
    let remove: (() => void) | undefined;

    (async () => {
      try {
        const { App } = await appPlugin();

        const sub = await App.addListener("appUrlOpen", ({ url }) => {
          if (disposed) return;
          navigateToDeepLink(url, (path) => router.push(path));
        });
        remove = () => void sub.remove();

        // Холодный старт: событие прошло до нашего JS, адрес доступен только так.
        const launch = takeLaunchUrl((await App.getLaunchUrl())?.url);
        if (launch && !disposed) {
          navigateToDeepLink(launch, (path) => router.push(path));
        }
      } catch {
        /* плагин недоступен — ссылка просто откроет приложение как обычно */
      }
    })();

    return () => {
      disposed = true;
      remove?.();
    };
  }, [router]);

  return null;
}
