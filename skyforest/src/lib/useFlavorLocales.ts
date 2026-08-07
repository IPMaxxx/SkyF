"use client";

/**
 * Языки текущего приложения для переключателя языка.
 *
 * Переключатели обязаны спрашивать именно приложение, а не `routing.locales`:
 * маршрутизация знает объединение языков всей сборки (src/i18n/locales.ts), и
 * список оттуда предложил бы человеку язык, на который его приложение не
 * переведено.
 */

import { FLAVORS } from "@/lib/appFlavor";
import { useAppFlavor } from "@/lib/useAppFlavor";
import type { AppLocale } from "@/i18n/locales";

export function useFlavorLocales(): readonly AppLocale[] {
  return FLAVORS[useAppFlavor()].locales;
}
