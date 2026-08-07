import { defineRouting } from "next-intl/routing";
import { defaultLocale } from "./brand-locale";
import { ALL_LOCALES } from "./locales";

/**
 * Маршрутизация next-intl знает все языки сборки. Это не значит, что каждое
 * приложение показывает их все: свой набор у каждого в `FlavorConfig.locales`,
 * и middleware уводит с чужого языка. Подробности — в src/i18n/locales.ts.
 */
export const routing = defineRouting({
  locales: ALL_LOCALES,
  defaultLocale,
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
