import { headers } from "next/headers";
import { flavorConfig, flavorFromHost, type AppFlavor, type FlavorConfig } from "@/lib/appFlavor";
import { BRAND } from "@/lib/brand";

/**
 * Флейвор запроса в серверных компонентах (по заголовку Host) — тот же
 * источник истины, что у middleware и layout.
 */
export async function getServerFlavor(): Promise<AppFlavor> {
  return flavorFromHost((await headers()).get("host"));
}

export async function getServerFlavorConfig(): Promise<FlavorConfig> {
  return flavorConfig(await getServerFlavor());
}

/**
 * Домены флейворов существуют только на .ai; у SkyForest адрес зависит от
 * бренда сборки (.by / .ai), поэтому он берётся из BRAND.
 */
const FLAVOR_URL: Record<AppFlavor, string | null> = {
  skyforest: null,
  checker: "https://checker.skyforest.ai",
  wayback: "https://wayback.skyforest.ai",
};

export interface LegalProduct {
  flavor: AppFlavor;
  /** Название продукта для юридических текстов юрлица. */
  appName: string;
  /** Адрес, по которому продукт доступен. */
  appUrl: string;
}

/** Название и адрес продукта для общих юридических документов оператора. */
export async function getLegalProduct(): Promise<LegalProduct> {
  const cfg = await getServerFlavorConfig();
  return {
    flavor: cfg.id,
    appName: cfg.id === "skyforest" ? BRAND.name : cfg.name,
    appUrl: FLAVOR_URL[cfg.id] ?? BRAND.url,
  };
}
