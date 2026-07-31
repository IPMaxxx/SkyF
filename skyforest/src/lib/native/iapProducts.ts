/**
 * Соответствие пакетов токенов / подписок и товаров In-App Purchase.
 *
 * Пакеты токенов — **consumable** товары в App Store Connect и Google Play
 * Console с теми же ценами, что и веб-пакеты (TOKEN_PACKAGES_USD).
 * packId совпадает с id из src/lib/tokens.ts.
 *
 * Подписки — **auto-renewable** товары (группа «SkyForest Premium»).
 */
import { FLAVORS } from "@/flavors/registry";

export interface IapProduct {
  /** ID товара в App Store Connect / Google Play */
  productId: string;
  /** id пакета из TOKEN_PACKAGES */
  packId: string;
  tokens: number;
  /** Базовая цена товара в сторах (USD) — для записи суммы платежа в БД. */
  priceUsd: number;
  /** Bundle id / package name приложения, которому принадлежит товар. */
  bundleId: string;
}

/** Package name основного приложения и флейворов. */
export const MAIN_BUNDLE_ID = "ai.skyforest.app";
export const CHECKER_BUNDLE_ID = "ai.skyforest.mushroomchecker";
export const WAYBACK_BUNDLE_ID = "ai.skyforest.wayback";

// Токен-пакеты продаются ТОЛЬКО в основном SkyForest. Во флейворах
// (Mushroom Checker / WayBack) монетизация — подписка (см. ниже).
export const IAP_PRODUCTS: IapProduct[] = [
  { productId: "ai.skyforest.tokens.30", packId: "pack_30", tokens: 30, priceUsd: 5.99, bundleId: MAIN_BUNDLE_ID },
  { productId: "ai.skyforest.tokens.100", packId: "pack_100", tokens: 100, priceUsd: 14.99, bundleId: MAIN_BUNDLE_ID },
  { productId: "ai.skyforest.tokens.300", packId: "pack_300", tokens: 300, priceUsd: 35.99, bundleId: MAIN_BUNDLE_ID },
];

/** Товары одного приложения (для register()/цен в конкретной оболочке). */
export function iapProductsForBundle(bundleId: string): IapProduct[] {
  return IAP_PRODUCTS.filter((p) => p.bundleId === bundleId);
}

export function productForPack(packId: string, bundleId: string = MAIN_BUNDLE_ID): IapProduct | undefined {
  return IAP_PRODUCTS.find((p) => p.packId === packId && p.bundleId === bundleId);
}

export function iapProductFor(productId: string): IapProduct | undefined {
  return IAP_PRODUCTS.find((p) => p.productId === productId);
}

export function tokensForProduct(productId: string): number | null {
  return iapProductFor(productId)?.tokens ?? null;
}

// ---------------- Подписки ----------------

// forager/pro — тиры основного SkyForest; checker/wayback — единственные
// подписки одноимённых флейвор-приложений (без бонус-токенов).
export type SubscriptionTier = "forager" | "pro" | "checker" | "wayback";
/**
 * Длина оплаченного периода товара. По ней сервер восстанавливает начало
 * периода, когда стор не прислал его явно (/api/native/iap/verify-subscription),
 * поэтому каждый новый вариант обязан быть разобран во ВСЕХ расчётах дат.
 */
export type SubscriptionPeriod = "weekly" | "monthly" | "yearly";

/** Цены флейворов живут в конфигах приложений, а не строками здесь. */
const CHECKER_PLAN = FLAVORS.checker.subscriptionPlan;
const WAYBACK_PLAN = FLAVORS.wayback.subscriptionPlan;

function usd(amount: number | undefined): string {
  return amount == null ? "" : `$${amount.toFixed(2)}`;
}

export interface SubscriptionProduct {
  productId: string;
  tier: SubscriptionTier;
  period: SubscriptionPeriod;
  /** Fallback-цена до загрузки реальной цены из стора */
  fallbackPrice: string;
  /** Bundle id / package name приложения, которому принадлежит подписка. */
  bundleId: string;
}

export const SUBSCRIPTION_PRODUCTS: SubscriptionProduct[] = [
  // ---- SkyForest (ai.skyforest.app): Forager / Pro ----
  {
    productId: "ai.skyforest.sub.forager.monthly",
    tier: "forager",
    period: "monthly",
    fallbackPrice: "$5.99",
    bundleId: MAIN_BUNDLE_ID,
  },
  {
    productId: "ai.skyforest.sub.forager.yearly",
    tier: "forager",
    period: "yearly",
    fallbackPrice: "$35.99",
    bundleId: MAIN_BUNDLE_ID,
  },
  {
    productId: "ai.skyforest.sub.pro.monthly",
    tier: "pro",
    period: "monthly",
    fallbackPrice: "$11.99",
    bundleId: MAIN_BUNDLE_ID,
  },
  {
    productId: "ai.skyforest.sub.pro.yearly",
    tier: "pro",
    period: "yearly",
    fallbackPrice: "$71.99",
    bundleId: MAIN_BUNDLE_ID,
  },
  // ---- Mushroom Checker: единственная подписка неделя/год с бесплатным
  // пробным периодом. Цены и длина триала описаны в одном месте —
  // FLAVORS.checker.subscriptionPlan; там же они должны совпадать с
  // App Store Connect и Google Play.
  {
    productId: "ai.skyforest.mushroomchecker.sub.weekly",
    tier: "checker",
    period: "weekly",
    fallbackPrice: usd(CHECKER_PLAN?.priceWeeklyUsd),
    bundleId: CHECKER_BUNDLE_ID,
  },
  // Месячный товар снят с продажи (короткий период теперь недельный), но
  // остаётся в каталоге ради действующих подписчиков: по нему приходят
  // продления, restorePurchases и перепроверки крона, а они находят товар
  // только здесь — без записи isSubscriptionProduct() отправил бы чек в
  // роут разовых покупок, а крон спросил бы Apple про чужой bundle.
  // Цена задана строкой, а не из FLAVORS.checker.subscriptionPlan: конфиг
  // приложения описывает действующие тарифы, и месячного среди них больше
  // нет. Это только заглушка на пейволле до цены стора, а месячного товара
  // на пейволле уже нет вовсе.
  {
    productId: "ai.skyforest.mushroomchecker.sub.monthly",
    tier: "checker",
    period: "monthly",
    fallbackPrice: "$2.00",
    bundleId: CHECKER_BUNDLE_ID,
  },
  {
    productId: "ai.skyforest.mushroomchecker.sub.yearly",
    tier: "checker",
    period: "yearly",
    fallbackPrice: usd(CHECKER_PLAN?.priceYearlyUsd),
    bundleId: CHECKER_BUNDLE_ID,
  },
  // ---- WayBack: ЕДИНСТВЕННЫЙ товар — годовая подписка с триалом 3 дня,
  // без токенов (подписка = полный доступ к приложению, тир "wayback").
  // Месячного товара нет намеренно: см. FLAVORS.wayback.subscriptionPlan.
  {
    productId: "ai.skyforest.wayback.sub.yearly",
    tier: "wayback",
    period: "yearly",
    fallbackPrice: usd(WAYBACK_PLAN?.priceYearlyUsd),
    bundleId: WAYBACK_BUNDLE_ID,
  },
];

/** Подписки одного приложения (для register()/пейволла конкретной оболочки). */
export function subscriptionProductsForBundle(
  bundleId: string,
): SubscriptionProduct[] {
  return SUBSCRIPTION_PRODUCTS.filter((p) => p.bundleId === bundleId);
}

export function subscriptionProductFor(
  productId: string,
): SubscriptionProduct | undefined {
  return SUBSCRIPTION_PRODUCTS.find((p) => p.productId === productId);
}

export function isSubscriptionProduct(productId: string): boolean {
  return SUBSCRIPTION_PRODUCTS.some((p) => p.productId === productId);
}
