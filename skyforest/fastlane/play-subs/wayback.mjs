/**
 * Что должно быть у WayBack в Google Play.
 *
 * Только данные: пакет, товары, базовые планы, офферы. Механика — общая
 * (`engine.mjs`), запуск — `fastlane/wayback-play-subs.mjs`. Имя пакета здесь
 * одно, поэтому прогон ради WayBack не дотянется до соседних приложений.
 *
 * Цены читаются из `src/flavors/wayback/config.ts` — того же конфига, по
 * которому пейволл рисует «$1.99 в неделю».
 *
 * Триал. У обоих тарифов фаза P3D, область действия оффера —
 * `thisSubscription`, как у Checker. Это отличается от App Store, где вводное
 * предложение считается по ГРУППЕ и достаётся человеку один раз на всё
 * приложение: в Play, взяв три дня на неделе, можно взять ещё три на годе.
 * Оставлено сознательно — одинаковое правило на всех офферах аккаунта дороже,
 * чем закрытая лазейка в шесть бесплатных дней; переключается сменой scope на
 * `anySubscriptionInApp` у обоих офферов сразу.
 */
import { flavorPlan } from "./repo-prices.mjs";

const PLAN = flavorPlan("wayback");

const BENEFITS = {
  "en-US": [
    "Way back to your forest entry point",
    "Works with no signal, fully offline",
    "Offline maps: trails and satellite",
    "History of every walk, synced",
  ],
  "ru-RU": [
    "Дорога назад к точке входа в лес",
    "Работает без сети и без сигнала",
    "Офлайн-карты: тропы и спутник",
    "История прогулок с синхронизацией",
  ],
};

const DESCRIPTION = {
  "en-US": "Offline areas, satellite imagery and sync across devices. 3-day free trial.",
  "ru-RU": "Офлайн-области, спутниковые снимки и синхронизация. 3 дня бесплатно.",
};

const listings = (titleEn, titleRu) => [
  {
    languageCode: "en-US",
    title: titleEn,
    description: DESCRIPTION["en-US"],
    benefits: BENEFITS["en-US"],
  },
  {
    languageCode: "ru-RU",
    title: titleRu,
    description: DESCRIPTION["ru-RU"],
    benefits: BENEFITS["ru-RU"],
  },
];

export const WAYBACK_PLAY = {
  pkg: "ai.skyforest.wayback",

  products: [
    {
      productId: "ai.skyforest.wayback.sub.weekly",
      basePlanId: "weekly",
      billingPeriod: "P1W",
      // Льготный период Google ограничивает длиной расчётного: недельному
      // тарифу P30D не положен, максимум — неделя.
      gracePeriod: "P7D",
      usd: PLAN.priceWeeklyUsd,
      offers: [{ offerId: "free-trial-3d", duration: `P${PLAN.trialDays}D`, free: true, state: "ACTIVE" }],
      listings: listings("Premium Weekly", "Премиум (неделя)"),
    },
    {
      productId: "ai.skyforest.wayback.sub.yearly",
      basePlanId: "yearly",
      billingPeriod: "P1Y",
      gracePeriod: "P30D",
      usd: PLAN.priceYearlyUsd,
      // Имя оффера осталось с «7d» с тех пор, когда триал был недельным: Play
      // не умеет переименовывать офферы, а второй оффер рядом с активным — это
      // два предложения на одном базовом плане и лотерея, какое достанется
      // покупателю. Человеку идентификатор не виден, длительность фазы — P3D.
      offers: [{ offerId: "free-trial-7d", duration: `P${PLAN.trialDays}D`, free: true, state: "ACTIVE" }],
      listings: listings("Premium Yearly", "Премиум (год)"),
    },
  ],

  /**
   * Снятое с продажи: месячный тариф закрыт для новых покупок ещё в июле
   * (`fastlane/wayback-subs-retire-monthly.mjs`). Движок его не касается,
   * проверка следит, чтобы он так и лежал выключенным.
   */
  retired: [
    {
      productId: "ai.skyforest.wayback.sub.monthly",
      basePlanId: "monthly",
      note: "выбор сведён к неделе и году; по месячному остались действующие подписчики",
    },
  ],
};
