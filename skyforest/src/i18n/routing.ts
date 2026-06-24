import { defineRouting } from "next-intl/routing";
import { defaultLocale } from "./brand-locale";

export const routing = defineRouting({
  locales: ["ru", "en"],
  defaultLocale,
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
