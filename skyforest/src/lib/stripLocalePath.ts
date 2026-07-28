import { routing } from "../i18n/routing";

/**
 * Убрать префикс локали. Без префикса идёт `routing.defaultLocale`, а он
 * зависит от сборки (`NEXT_PUBLIC_BRAND`): на skyforest.by без префикса
 * русский, на skyforest.ai — английский. Поэтому проверяем все локали, иначе
 * на одной из сборок префиксованные пути выглядели бы чужими маршрутами.
 */
export function stripLocalePrefix(pathname: string): string {
  for (const locale of routing.locales) {
    const prefix = `/${locale}`;
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const rest = pathname.slice(prefix.length);
      return rest === "" ? "/" : rest;
    }
  }
  return pathname;
}
