import { checkerFlavor } from "./checker/config";
import { skyforestFlavor } from "./skyforest/config";
import { waybackFlavor } from "./wayback/config";
import type { AppFlavor, FlavorConfig } from "./types";

/**
 * Реестр приложений. Только данные — файл импортируется из Edge-middleware,
 * поэтому React-компоненты сюда тянуть нельзя.
 */
export const FLAVORS: Record<AppFlavor, FlavorConfig> = {
  skyforest: skyforestFlavor,
  checker: checkerFlavor,
  wayback: waybackFlavor,
};
