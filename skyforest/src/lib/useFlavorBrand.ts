"use client";

/**
 * Брендинг текущего флейвора на клиенте: имя, логотип и тексты про задачу
 * приложения (тег-лайн сплэша, подзаголовки экранов входа и аккаунта).
 *
 * Тексты флейворов лежат в словаре `flavor.<id>` (см. src/i18n/messages/*),
 * поэтому `text()` можно вызывать только когда `isFlavored === true` — в
 * SkyForest используются прежние ключи (`common.splashTagline`,
 * `auth.nativeSlogan`, `account.subtitle`), чтобы не менять основной продукт.
 */

import { useTranslations } from "next-intl";
import { FLAVORS, type AppFlavor } from "@/lib/appFlavor";
import { useAppFlavor } from "@/lib/useAppFlavor";

export type FlavorTextKey =
  | "tagline"
  | "authSubtitle"
  | "accountSubtitle"
  | "accountDeleteHint"
  | "lockBody";

export interface FlavorBrand {
  flavor: AppFlavor;
  isFlavored: boolean;
  /** Публичное имя приложения (Mushroom Checker / WayBack / SkyForest). */
  name: string;
  /** Квадратный логотип для сплэша и экранов входа. */
  logoPath: string;
  /** Текст флейвора; вызывать только при isFlavored. */
  text: (key: FlavorTextKey) => string;
}

export function useFlavorBrand(): FlavorBrand {
  const flavor = useAppFlavor();
  const cfg = FLAVORS[flavor];
  const t = useTranslations("flavor");

  return {
    flavor,
    isFlavored: flavor !== "skyforest",
    name: cfg.name,
    logoPath: cfg.logoPath,
    text: (key) => t(`${flavor}.${key}`),
  };
}
