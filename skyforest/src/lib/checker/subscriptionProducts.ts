/**
 * Товары подписки Mushroom Checker: недельная и годовая.
 *
 * Цены приезжают из FLAVORS.checker.subscriptionPlan (src/flavors/checker/config.ts)
 * и служат только заглушкой до того, как стор отдаст свою отформатированную
 * цену: на пейволле всегда показывается цена стора, если она уже загружена.
 *
 * Здесь лежит только то, что нужно пейволлу приложения: какие тарифы
 * показывать и в каком порядке. Товары, которые регистрируются в плагине
 * покупок и проверяются на сервере, живут в общем каталоге
 * src/lib/native/iapProducts.ts — там недельный товар тоже есть, вместе со
 * снятым с продажи месячным (по нему остались действующие подписчики).
 * Веб-платежей у Checker нет вовсе (bePaid обслуживает только SkyForest),
 * поэтому смена модели их не касается.
 */
import { FLAVORS } from "@/lib/appFlavor";

const PLAN = FLAVORS.checker.subscriptionPlan!;

/** Периоды подписки Checker. Месячного тарифа больше нет. */
export type CheckerPeriod = "weekly" | "yearly";

export interface CheckerSubscriptionProduct {
  /** ID товара в App Store Connect / Google Play (bundle ai.skyforest.mushroomchecker). */
  productId: string;
  period: CheckerPeriod;
  /** Заглушка до загрузки цены из стора. */
  fallbackPrice: string;
}

function usd(amount: number | undefined): string {
  return amount == null ? "" : `$${amount.toFixed(2)}`;
}

export const CHECKER_SUBSCRIPTION_PRODUCTS: CheckerSubscriptionProduct[] = [
  {
    productId: "ai.skyforest.mushroomchecker.sub.weekly",
    period: "weekly",
    fallbackPrice: usd(PLAN.priceWeeklyUsd),
  },
  {
    productId: "ai.skyforest.mushroomchecker.sub.yearly",
    period: "yearly",
    fallbackPrice: usd(PLAN.priceYearlyUsd),
  },
];

export function checkerProduct(period: CheckerPeriod): CheckerSubscriptionProduct {
  return CHECKER_SUBSCRIPTION_PRODUCTS.find((p) => p.period === period)!;
}

/** Сколько коротких периодов в году — для расчёта выгоды годового тарифа. */
export const WEEKS_PER_YEAR = 52;
