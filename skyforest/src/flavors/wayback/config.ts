import { COMMON_ALLOWED_PATHS, type FlavorConfig } from "../types";

/**
 * WayBack — только возврат к точке входа
 * (wayback.skyforest.ai + нативная оболочка ai.skyforest.wayback).
 *
 * Все экраны живут в src/app/[locale]/wb и попадают туда через
 * `internalRewrites`: публичные URL при этом не меняются.
 */
export const waybackFlavor: FlavorConfig = {
  id: "wayback",
  name: "WayBack",
  // Приложение международное: основной язык английский, русский — по выбору.
  // Язык сайта (brand-locale) здесь не годится — деплой общий с skyforest.by,
  // и WayBack на нём отдавал бы русский всем.
  defaultLocale: "en",
  homePath: "/dashboard/track",
  // /payment и /offer нужны для пейволла подписки (требует логин).
  allowedPaths: [
    ...COMMON_ALLOWED_PATHS,
    "/dashboard/track",
    "/payment",
    "/offer",
  ],
  anonymousPaths: ["/dashboard/track"],
  navHrefs: ["/dashboard/track"],
  showTokens: false,
  manifestPath: "/manifest-wayback.webmanifest",
  faviconPath: "/icons/wayback-192.png",
  logoPath: "/icons/wayback-512.png",
  nativeAppId: "ai.skyforest.wayback",
  // Тёмная схема, общая с SkyForest: холст #0b120d. При «default» iOS рисует
  // в статус-баре чёрный текст — на тёмном холсте его не видно.
  themeColor: "#0b120d",
  statusBarStyle: "black-translucent",
  internalSegment: "/wb",
  internalRewrites: {
    "/": "/wb/landing",
    "/login": "/wb/login",
    "/register": "/wb/register",
    "/forgot-password": "/wb/forgot-password",
    "/reset-password": "/wb/reset-password",
    "/verify-mfa": "/wb/verify-mfa",
    "/dashboard/track": "/wb/track",
    "/account": "/wb/account",
    "/payment": "/wb/payment",
  },
  /**
   * Монетизация: одна подписка — годовая за $3.99, с бесплатным пробным
   * периодом на 7 дней. Месячного товара нет: базовая функция (стрелка к
   * точке входа) бесплатна навсегда, а сезонный характер продукта делает
   * год единственным осмысленным периодом.
   *
   * Распознавания грибов в WayBack нет вовсе — отсюда нули в лимитах:
   * это не «лимит исчерпан», а «функции в приложении не существует».
   * Числа должны совпадать с App Store Connect и Google Play.
   */
  subscriptionPlan: {
    trialDays: 7,
    trialIdentifyLimit: 0,
    identifyLimit: 0,
    priceYearlyUsd: 3.99,
  },
};
