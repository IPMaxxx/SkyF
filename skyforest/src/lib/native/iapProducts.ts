/**
 * Соответствие пакетов токенов и товаров In-App Purchase.
 *
 * Эти productId нужно создать как **consumable** товары в App Store Connect
 * и Google Play Console с теми же ценами, что и веб-пакеты (TOKEN_PACKAGES_USD).
 * packId совпадает с id из src/lib/tokens.ts.
 */
export interface IapProduct {
  /** ID товара в App Store Connect / Google Play */
  productId: string;
  /** id пакета из TOKEN_PACKAGES */
  packId: string;
  tokens: number;
}

export const IAP_PRODUCTS: IapProduct[] = [
  { productId: "ai.skyforest.tokens.10", packId: "pack_10", tokens: 10 },
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
