/**
 * Выбор языка в Mushroom Checker.
 *
 * Приложение международное: основной язык английский, русский — по выбору
 * (FLAVORS.checker.defaultLocale). У языка по умолчанию нет префикса в URL,
 * поэтому «выбрал английский» и «язык не выбирал» по одному адресу неотличимы,
 * и выбор приходится запоминать в куке `NEXT_LOCALE` руками — иначе middleware
 * снова показал бы основной язык. Переключателей в приложении два (шапка
 * главного экрана и панель «Ещё»), и оба обязаны писать куку одинаково,
 * поэтому запись живёт здесь.
 */

/** Год: язык — долгоживущая настройка, как и тема. */
const COOKIE_MAX_AGE = 31536000;

/** Подписи переключателя: коды локалей в интерфейсе не показываем. */
export const CHECKER_LOCALE_LABELS: Record<string, string> = {
  en: "EN",
  ru: "RU",
};

export function rememberCheckerLocale(locale: string): void {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}
