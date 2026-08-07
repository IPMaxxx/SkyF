import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import en from "./messages/en";
import ru from "./messages/ru";
import waybackEs, {
  waybackBrand as waybackBrandEs,
  waybackShared as waybackSharedEs,
} from "./messages/wayback.es";
import waybackPl, {
  waybackBrand as waybackBrandPl,
  waybackShared as waybackSharedPl,
} from "./messages/wayback.pl";
import waybackFr, {
  waybackBrand as waybackBrandFr,
  waybackShared as waybackSharedFr,
} from "./messages/wayback.fr";
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

/**
 * Языки, на которые переведён только WayBack.
 *
 * Полного словаря сайта на них нет и не будет: испанец видит их только внутри
 * WayBack, а туда не приходят ни блог, ни кабинет SkyForest, ни распознавание
 * грибов. Переводить ради этого весь `en.ts` — работа, которую никто не
 * прочитает, и которая устареет на первой же правке текстов SkyForest.
 *
 * Поэтому словарь такого языка — накладка поверх английского: свои у него
 * экраны WayBack (`wayback`), карточка приложения (`flavor.wayback`) и те
 * общие области, которые WayBack действительно показывает — вход, пароль и
 * двухфакторка, экран блокировки, подсказка обновления, ссылки на документы,
 * 404. Всё остальное берётся из английского и на экран WayBack не попадает.
 *
 * Что именно «действительно показывает» — не на глаз: набор общих ключей
 * стережёт `fastlane/.wayback-locales-check.mjs`, он же ловит расхождение
 * ключей между языками.
 */
const waybackOverlays = {
  es: { wayback: waybackEs, brand: waybackBrandEs, shared: waybackSharedEs },
  pl: { wayback: waybackPl, brand: waybackBrandPl, shared: waybackSharedPl },
  fr: { wayback: waybackFr, brand: waybackBrandFr, shared: waybackSharedFr },
} as const;

type Messages = Record<string, unknown>;

/**
 * Накладка поверх английского: словарь языка выигрывает ключ за ключом.
 *
 * Слияние именно рекурсивное. Плоское затёрло бы `account` целиком, вместе с
 * теми его ветками, которых в накладке нет, — и `account.profileName` пропал
 * бы даже там, где английский вариант вполне уместен. Массивы (`deletedItems`)
 * заменяются целиком: это список, а не набор ключей, и смешивать его по
 * индексу нельзя.
 */
function overlay(base: Messages, patch: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const current = out[key];
    out[key] =
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      current !== null &&
      typeof current === "object" &&
      !Array.isArray(current)
        ? overlay(current as Messages, value as Messages)
        : value;
  }
  return out;
}

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

function messagesFor(locale: string) {
  const patch = waybackOverlays[locale as keyof typeof waybackOverlays];
  if (!patch) return mergeBrandMessages(locale as "ru" | "en");

  return overlay(mergeBrandMessages("en") as Messages, {
    ...patch.shared,
    flavor: { wayback: patch.brand },
    wayback: patch.wayback,
  });
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: messagesFor(locale),
  };
});
