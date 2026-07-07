/**
 * Соответствие пакетов токенов / подписок и товаров In-App Purchase.
 *
 * Пакеты токенов — **consumable** товары в App Store Connect и Google Play
 * Console с теми же ценами, что и веб-пакеты (TOKEN_PACKAGES_USD).
 * packId совпадает с id из src/lib/tokens.ts.
 *
 * Подписки — **auto-renewable** товары (группа «SkyForest Premium»).
 */
export interface IapProduct {
  /** ID товара в App Store Connect / Google Play */
  productId: string;
  /** id пакета из TOKEN_PACKAGES */
  packId: string;
  tokens: number;
}

export const IAP_PRODUCTS: IapProduct[] = [
  { productId: "ai.skyforest.tokens.30", packId: "pack_30", tokens: 30 },
  { productId: "ai.skyforest.tokens.100", packId: "pack_100", tokens: 100 },
  { productId: "ai.skyforest.tokens.300", packId: "pack_300", tokens: 300 },
];

export function productForPack(packId: string): IapProduct | undefined {
  return IAP_PRODUCTS.find((p) => p.packId === packId);
}

export function tokensForProduct(productId: string): number | null {
  return IAP_PRODUCTS.find((p) => p.productId === productId)?.tokens ?? null;
}

// ---------------- Подписки ----------------

export type SubscriptionTier = "forager" | "pro";
export type SubscriptionPeriod = "monthly" | "yearly";

export interface SubscriptionProduct {
  productId: string;
  tier: SubscriptionTier;
  period: SubscriptionPeriod;
  /** Fallback-цена до загрузки реальной цены из стора */
  fallbackPrice: string;
}

export const SUBSCRIPTION_PRODUCTS: SubscriptionProduct[] = [
  {
    productId: "ai.skyforest.sub.forager.monthly",
    tier: "forager",
    period: "monthly",
    fallbackPrice: "$5.99",
  },
  {
    productId: "ai.skyforest.sub.forager.yearly",
    tier: "forager",
    period: "yearly",
    fallbackPrice: "$35.99",
  },
  {
    productId: "ai.skyforest.sub.pro.monthly",
    tier: "pro",
    period: "monthly",
    fallbackPrice: "$11.99",
  },
  {
    productId: "ai.skyforest.sub.pro.yearly",
    tier: "pro",
    period: "yearly",
    fallbackPrice: "$71.99",
  },
];

export function subscriptionProductFor(
  productId: string,
): SubscriptionProduct | undefined {
  return SUBSCRIPTION_PRODUCTS.find((p) => p.productId === productId);
}

export function isSubscriptionProduct(productId: string): boolean {
  return SUBSCRIPTION_PRODUCTS.some((p) => p.productId === productId);
}
