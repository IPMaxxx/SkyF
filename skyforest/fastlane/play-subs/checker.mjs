/**
 * Что должно быть у Mushroom Checker в Google Play.
 *
 * Только данные: пакет, товары, базовые планы, офферы. Механика — общая
 * (`engine.mjs`), запуск — `fastlane/checker-play-subs.mjs`. Товары соседних
 * приложений в этот файл не попадают и попасть не могут: имя пакета здесь одно.
 *
 * Цены не записаны — они читаются из `src/flavors/checker/config.ts`, того
 * самого конфига, по которому пейволл рисует «$5 в неделю». Разойтись с
 * приложением они больше не могут; разойтись с консолью — увидит
 * `fastlane/.play-subs-check.mjs`.
 */
import { catalogFallbackPrices, catalogPrice, flavorPlan } from "./repo-prices.mjs";

const PLAN = flavorPlan("checker");
const CATALOG = catalogFallbackPrices();

/** Одна и та же выгода в обеих витринах — Play показывает её списком. */
const BENEFITS = {
  "en-US": [
    "Unlimited photo identifications",
    "Dangerous lookalikes and toxicity",
    "Full taxonomy and habitat data",
    "History of every check, synced",
  ],
  "ru-RU": [
    "Определения по фото без лимита",
    "Опасные двойники и токсичность",
    "Полные данные о видах и среде",
    "История проверок с синхронизацией",
  ],
};

const DESCRIPTION = {
  "en-US": "Unlimited AI mushroom identifications. 3-day free trial.",
  "ru-RU": "Неограниченные ИИ-определения грибов. 3 дня бесплатно.",
};

export const CHECKER_PLAY = {
  pkg: "ai.skyforest.mushroomchecker",

  products: [
    {
      productId: "ai.skyforest.mushroomchecker.sub.weekly",
      basePlanId: "weekly",
      billingPeriod: "P1W",
      // Льготный период Google ограничивает длиной расчётного: недельному
      // тарифу P30D не положен, максимум — неделя.
      gracePeriod: "P7D",
      usd: PLAN.priceWeeklyUsd,
      offers: [{ offerId: "free-trial-3d", duration: `P${PLAN.trialDays}D`, free: true, state: "ACTIVE" }],
      listings: [
        {
          languageCode: "en-US",
          title: "Premium Weekly",
          description: DESCRIPTION["en-US"],
          benefits: BENEFITS["en-US"],
        },
        {
          languageCode: "ru-RU",
          title: "Премиум (неделя)",
          description: DESCRIPTION["ru-RU"],
          benefits: BENEFITS["ru-RU"],
        },
      ],
    },
    {
      productId: "ai.skyforest.mushroomchecker.sub.yearly",
      basePlanId: "yearly",
      billingPeriod: "P1Y",
      gracePeriod: "P30D",
      usd: PLAN.priceYearlyUsd,
      offers: [
        { offerId: "free-trial-3d", duration: `P${PLAN.trialDays}D`, free: true, state: "ACTIVE" },
        // Оффер прежней модели подписки. Второй активный оффер на одном
        // плане — лотерея, какой достанется покупателю, поэтому он обязан
        // оставаться выключенным; удалить его Play не даёт.
        { offerId: "free-trial-7d", duration: "P7D", free: true, state: "INACTIVE" },
      ],
      // Витрины годового заведены без списка выгод — так они и стоят в
      // консоли с самого начала. Здесь записано то, что там есть: скрипт
      // обязан быть пустым прогоном на неизменившемся приложении, а не
      // переписывать витрину при каждом запуске.
      listings: [
        {
          languageCode: "en-US",
          title: "Premium Yearly",
          description: DESCRIPTION["en-US"],
        },
        {
          languageCode: "ru-RU",
          title: "Премиум (год)",
          description: DESCRIPTION["ru-RU"],
        },
      ],
    },
  ],

  /**
   * Снятое с продажи. Движок этих товаров не касается вовсе — ни цены, ни
   * активации: месячный тариф закрыт для новых покупок, и «идемпотентный»
   * прогон, который его воскресит, — это тот же откат, только в состояниях.
   * Проверка следит, чтобы он так и лежал выключенным.
   */
  retired: [
    {
      productId: "ai.skyforest.mushroomchecker.sub.monthly",
      basePlanId: "monthly",
      usd: catalogPrice(CATALOG, "ai.skyforest.mushroomchecker.sub.monthly"),
      note: "короткий период стал недельным; по месячному остались действующие подписчики",
    },
  ],
};
