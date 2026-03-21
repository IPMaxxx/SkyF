import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import en from "./messages/en";
import ru from "./messages/ru";
import { routing } from "./routing";

const catalogs = { ru, en } as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: catalogs[locale as keyof typeof catalogs],
  };
});
