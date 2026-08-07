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
  // Порядок — порядок кнопок в переключателе меню.
  locales: ["en", "ru"],
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
   * Монетизация: два тарифа на выбор — неделя за $1.99 и год за $19.99, у
   * обоих бесплатный пробный период на 3 дня. Месячного товара нет: он не
   * добавляет выбора между «попробовать сезон» и «взять на год».
   *
   * До августа 2026 тариф был один (год за $3.99). Недельный заведён рядом,
   * прежний идентификатор годового сохранён: смена цены существующего товара
   * не требует ревью, а новый товар уехал бы только со следующей подачей.
   *
   * В нативной оболочке подписка обязательна с первого запуска — гейт
   * (WayBackStartGate) не пускает в приложение без активного права. На вебе
   * покупки стора невозможны, поэтому там трек остаётся открытым, и
   * `/dashboard/track` по-прежнему в `anonymousPaths`.
   *
   * Цены здесь — только заглушка до ответа стора: на экране всегда стоит
   * отформатированная цена App Store / Google Play, вместе с их валютой.
   * `trialDays` — единственный источник числа для копии: и пейволл, и гейт
   * подставляют его в тексты, чтобы «3 дня» нельзя было разойтись со сторами.
   * Значение обязано совпадать с App Store Connect (FREE_TRIAL THREE_DAYS) и
   * Google Play (фаза P3D офферов, см. fastlane/wayback-subs-weekly.mjs).
   *
   * Распознавания грибов в WayBack нет вовсе — отсюда нули в лимитах:
   * это не «лимит исчерпан», а «функции в приложении не существует».
   */
  subscriptionPlan: {
    trialDays: 3,
    trialIdentifyLimit: 0,
    identifyLimit: 0,
    priceWeeklyUsd: 1.99,
    priceYearlyUsd: 19.99,
  },
};
