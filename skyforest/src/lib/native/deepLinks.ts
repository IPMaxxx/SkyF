/**
 * Открытие приложения по ссылке (universal links на iOS, app links на Android).
 *
 * Оболочка грузит живой сайт по `server.url`, поэтому ссылка с нашего домена —
 * это обычный путь внутри того же webview. Достаточно перейти по нему.
 *
 * Единственная тонкость — `/auth/*`. Это серверные обработчики: подтверждение
 * почты и обмен OAuth-кода ставят cookie сессии ответом сервера. Клиентский
 * роутер Next такой маршрут не откроет (там нет страницы), да и cookie в
 * webview от RSC-запроса не появится, — нужна полная навигация. После неё
 * сервер сам уводит на домашний экран приложения (`resolveAuthNext`).
 */

/** Путь внутри сайта из абсолютного адреса ссылки. */
function pathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return path && path !== "/" ? path : null;
  } catch {
    return null;
  }
}

/** Серверный обработчик авторизации — только полной перезагрузкой. */
function isServerAuthPath(path: string): boolean {
  return path.startsWith("/auth/");
}

/**
 * Перейти по ссылке, которой открыли приложение.
 *
 * `push` — клиентская навигация (роутер next-intl). Для `/auth/*` не
 * используется: там нужен ответ сервера с cookie.
 */
export function navigateToDeepLink(url: string, push: (path: string) => void) {
  const path = pathFromUrl(url);
  if (!path) return;
  if (isServerAuthPath(path)) {
    window.location.assign(path);
    return;
  }
  push(path);
}

/**
 * Ссылка, которой запустили приложение с нуля.
 *
 * При холодном старте событие `appUrlOpen` успевает пройти до того, как
 * webview выполнит наш JS, и слушатель его не увидит: письмо открыло бы
 * приложение на домашнем экране, а подтверждение так и осталось бы
 * неиспользованным. `getLaunchUrl()` отдаёт этот адрес позже, но он живёт всю
 * сессию приложения — обработав ссылку один раз, помечаем её в
 * `sessionStorage`, иначе полная навигация на `/auth/confirm` возвращалась бы
 * сюда же по кругу.
 */
const HANDLED_LAUNCH_URL = "sf.deeplink.launchUrl";

export function takeLaunchUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    if (window.sessionStorage.getItem(HANDLED_LAUNCH_URL) === url) return null;
    window.sessionStorage.setItem(HANDLED_LAUNCH_URL, url);
  } catch {
    // Приватный режим без sessionStorage: лучше обработать ссылку, чем
    // потерять её, — защита от повтора здесь не критичнее самой ссылки.
  }
  return url;
}
