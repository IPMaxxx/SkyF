import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import en from "./messages/en";
import ru from "./messages/ru";
import { routing } from "./routing";
import { isSamplify } from "@/lib/brand";
import {
  samplifyFooterEn,
  samplifyFooterRu,
  samplifyMetadataEn,
  samplifyMetadataRu,
  samplifyTariffsEn,
  samplifyTariffsRu,
} from "./brand-metadata";

const catalogs = { ru, en } as const;

function mergeBrandMessages(locale: "ru" | "en") {
  const base = { ...catalogs[locale] };
  if (!isSamplify) return base;

  const metadata =
    locale === "en"
      ? { ...base.metadata, ...samplifyMetadataEn }
      : { ...base.metadata, ...samplifyMetadataRu };
  const footer =
    locale === "en"
      ? { ...base.footer, ...samplifyFooterEn }
      : { ...base.footer, ...samplifyFooterRu };
  const tariffs =
    locale === "en"
      ? { ...base.tariffs, ...samplifyTariffsEn }
      : { ...base.tariffs, ...samplifyTariffsRu };

  return { ...base, metadata, footer, tariffs };
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: mergeBrandMessages(locale as "ru" | "en"),
  };
});
