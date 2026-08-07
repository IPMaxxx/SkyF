/**
 * Что должно быть у основного SkyForest в Google Play.
 *
 * У этого приложения нет и не заводится скрипта записи: тиры Forager и Pro
 * стоят в консоли с весны, менять их некому и незачем. Файл нужен затем, чтобы
 * проверка `fastlane/.play-subs-check.mjs` держала под присмотром все три
 * приложения, а не два: цена, тихо уехавшая у SkyForest, стоила бы столько же,
 * сколько уехавшая у соседей.
 *
 * Цены читаются из `fallbackPrice` каталога `src/lib/native/iapProducts.ts` —
 * это единственное место, где репозиторий помнит цены SkyForest.
 */
import { catalogFallbackPrices, catalogPrice } from "./repo-prices.mjs";

const CATALOG = catalogFallbackPrices();
const usd = (productId) => catalogPrice(CATALOG, productId);

/**
 * Годовые тарифы продаются с бесплатной неделей, месячные — со скидкой на
 * первый месяц. Триал у SkyForest недельный (у Checker и WayBack — три дня):
 * там подписка обязательна с первого запуска, а здесь она надстройка над
 * бесплатным приложением, и знакомиться с ней дольше.
 */
export const SKYFOREST_PLAY = {
  pkg: "ai.skyforest.app",
  /** Писать в это приложение нечем: точки входа у него нет. */
  readOnly: true,

  products: [
    {
      productId: "ai.skyforest.sub.forager.monthly",
      basePlanId: "monthly",
      billingPeriod: "P1M",
      gracePeriod: "P30D",
      usd: usd("ai.skyforest.sub.forager.monthly"),
      offers: [
        { offerId: "intro-first-month", duration: "P1M", usd: 3.99, state: "ACTIVE" },
      ],
    },
    {
      productId: "ai.skyforest.sub.forager.yearly",
      basePlanId: "yearly",
      billingPeriod: "P1Y",
      gracePeriod: "P30D",
      usd: usd("ai.skyforest.sub.forager.yearly"),
      offers: [{ offerId: "free-trial-7d", duration: "P7D", free: true, state: "ACTIVE" }],
    },
    {
      productId: "ai.skyforest.sub.pro.monthly",
      basePlanId: "monthly",
      billingPeriod: "P1M",
      gracePeriod: "P30D",
      usd: usd("ai.skyforest.sub.pro.monthly"),
      offers: [
        { offerId: "intro-first-month", duration: "P1M", usd: 6.99, state: "ACTIVE" },
      ],
    },
    {
      productId: "ai.skyforest.sub.pro.yearly",
      basePlanId: "yearly",
      billingPeriod: "P1Y",
      gracePeriod: "P30D",
      usd: usd("ai.skyforest.sub.pro.yearly"),
      offers: [{ offerId: "free-trial-7d", duration: "P7D", free: true, state: "ACTIVE" }],
    },
  ],

  retired: [],
};
