import { COMMON_ALLOWED_PATHS, type FlavorConfig } from "../types";

/**
 * Mushroom Checker — только распознавание грибов
 * (checker.skyforest.ai + нативная оболочка ai.skyforest.mushroomchecker).
 *
 * Все экраны живут в src/app/[locale]/ck и попадают туда через
 * `internalRewrites`: публичные URL при этом не меняются.
 */
export const checkerFlavor: FlavorConfig = {
  id: "checker",
  name: "Mushroom Checker",
  // Приложение международное: основной язык английский, русский — по выбору.
  defaultLocale: "en",
  homePath: "/dashboard/identify",
  allowedPaths: [
    ...COMMON_ALLOWED_PATHS,
    "/dashboard/identify",
    "/dashboard/history",
    "/dashboard/quests",
    "/payment",
    "/offer",
    // Публичная карточка «поделиться»: /s/<токен>. Открыта без авторизации —
    // это ссылка для посторонних (src/app/[locale]/ck/s/[token]).
    "/s",
  ],
  anonymousPaths: [],
  navHrefs: ["/dashboard/identify", "/dashboard/history", "/dashboard/quests"],
  // Токенов в Checker нет — монетизация только подпиской (/payment).
  showTokens: false,
  manifestPath: "/manifest-checker.webmanifest",
  faviconPath: "/icons/checker-192.png",
  logoPath: "/icons/checker-512.png",
  nativeAppId: "ai.skyforest.mushroomchecker",
  // Тема по умолчанию — тёмная, общая с SkyForest и WayBack (холст #0b120d).
  // «default» в статус-баре iOS означает тёмный текст, на тёмном холсте его
  // не видно, поэтому здесь «black-translucent».
  themeColor: "#0b120d",
  statusBarStyle: "black-translucent",
  /**
   * Светлую схему пользователь включает в панели «Ещё» (CheckerMoreSheet).
   * Цвета интерфейса — в src/styles/flavors/checker.css, здесь только чром
   * вокруг страницы. Значения совпадают с холстами обеих схем: если они
   * разойдутся, при запуске и при прокрутке за край мелькнёт чужой фон.
   */
  themeSwitch: {
    cookie: "ck-theme",
    defaultTheme: "dark",
    themes: {
      dark: { themeColor: "#0b120d", statusBarStyle: "black-translucent" },
      light: { themeColor: "#f3f7f1", statusBarStyle: "default" },
    },
  },
  internalSegment: "/ck",
  internalRewrites: {
    "/": "/ck/landing",
    "/login": "/ck/login",
    "/register": "/ck/register",
    "/forgot-password": "/ck/forgot-password",
    "/reset-password": "/ck/reset-password",
    "/verify-mfa": "/ck/verify-mfa",
    "/dashboard/identify": "/ck/identify",
    "/dashboard/history": "/ck/history",
    "/dashboard/quests": "/ck/quests",
    "/account": "/ck/account",
    "/payment": "/ck/payment",
    /**
     * Карточка «поделиться». Единственный путь с продолжением: адрес выглядит
     * как `/s/<токен>` и должен переписываться в `/ck/s/<токен>` целиком.
     *
     * ВНИМАНИЕ: `internalRewrite()` в src/lib/appFlavor.ts ищет ключ точным
     * совпадением, поэтому сейчас сюда попадает только голый `/s`, а ссылка с
     * токеном отдаёт 404. Нужна поддержка префикса — правка одного общего
     * файла, см. отчёт.
     */
    "/s": "/ck/s",
  },
  /**
   * Модель монетизации: пробный период на 3 дня с ограниченным числом
   * распознаваний, затем подписка без лимита за $5/неделю или $39.99/год.
   * Числа отсюда идут и в квоту на сервере, и в тексты пейволла —
   * менять их нужно только тут (и синхронно в App Store Connect / Play).
   *
   * Месячного тарифа нет: короткий период теперь недельный, товар
   * `...sub.monthly` снимается с продажи (см. src/lib/checker/subscriptionProducts.ts).
   */
  subscriptionPlan: {
    trialDays: 3,
    trialIdentifyLimit: 10,
    identifyLimit: null,
    priceWeeklyUsd: 5,
    priceYearlyUsd: 39.99,
  },
};
