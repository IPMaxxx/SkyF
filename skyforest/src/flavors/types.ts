/**
 * Описание одного приложения («флейвора»), собираемого из общей кодовой базы.
 *
 * Конкретные значения лежат рядом, каждое в своём каталоге:
 * src/flavors/{skyforest,checker,wayback}/config.ts. Так настройки приложения
 * правятся у себя и не задевают остальные продукты; собирает их
 * src/flavors/registry.ts.
 */

export type AppFlavor = "skyforest" | "checker" | "wayback";

/**
 * Параметры подписки приложения — единственное место, где живут числа
 * триала, лимитов и цен. Их читают серверная квота (src/lib/subscription.ts),
 * каталог IAP (src/lib/native/iapProducts.ts) и экраны приложения, поэтому
 * менять модель монетизации нужно только здесь.
 */
export interface FlavorSubscriptionPlan {
  /** Длина бесплатного пробного периода: introductory offer в сторах. */
  trialDays: number;
  /** Распознаваний на весь триал целиком (не в день); null — без лимита. */
  trialIdentifyLimit: number | null;
  /** Распознаваний в месяц в оплаченной подписке; null — без лимита. */
  identifyLimit: number | null;
  /**
   * Цены подписки в USD — одинаковые в сторах и на сайте. Месячная цена
   * необязательна: приложение может продавать только годовую подписку
   * (WayBack), и тогда месячного товара в сторах просто нет.
   */
  priceMonthlyUsd?: number;
  priceYearlyUsd: number;
}

export interface FlavorConfig {
  id: AppFlavor;
  /** Публичное имя приложения (заголовки, манифест, header). */
  name: string;
  /**
   * Основной язык приложения: на нём middleware рендерит страницы без
   * префикса локали в URL, независимо от `routing.defaultLocale` сборки.
   * Выбор пользователя хранится в куке NEXT_LOCALE и приоритетнее.
   */
  defaultLocale: "ru" | "en";
  /** Домашняя страница кабинета — сюда уводим с чужих маршрутов. */
  homePath: string;
  /** Пути, разрешённые на поддомене (префиксы после отрезания локали). null = всё. */
  allowedPaths: string[] | null;
  /**
   * Защищённые пути, доступные БЕЗ логина в этом флейворе
   * (wayback: трек должен работать анонимно — история хранится в localStorage).
   */
  anonymousPaths: string[];
  /** Пункты навигации кабинета (href из AppHeader.NAV / NativeTabBar). null = все. */
  navHrefs: string[] | null;
  /** Показывать ли баланс токенов/оплату в шапке. */
  showTokens: boolean;
  /** PWA-манифест и favicon этого флейвора. */
  manifestPath: string;
  faviconPath: string;
  /** Логотип для splash и экранов входа (квадратный, ≥512px). */
  logoPath: string;
  /** id нативного приложения (Capacitor appId). */
  nativeAppId: string;
  /** Цвет `theme-color`: фон холста приложения. */
  themeColor: string;
  /** Стиль статус-бара iOS: светлым схемам нужен тёмный текст. */
  statusBarStyle: "default" | "black-translucent";
  /**
   * Внутренний префикс сегментов приложения в src/app (например "/ck").
   * Публично такие пути недоступны — middleware отдаёт их только через
   * rewrite, поэтому URL в браузере остаётся прежним.
   */
  internalSegment: string | null;
  /**
   * Публичный путь (без локали) → путь внутри src/app. Позволяет держать
   * разметку приложения в собственном дереве роутов, не пересекаясь с
   * экранами других флейворов.
   */
  internalRewrites: Record<string, string>;
  /** Модель подписки приложения (у SkyForest тиры описаны в TIER_BENEFITS). */
  subscriptionPlan?: FlavorSubscriptionPlan;
}

/** Пути, доступные во всех урезанных приложениях (вход, аккаунт, документы). */
export const COMMON_ALLOWED_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-mfa",
  "/account",
  "/privacy",
  "/delete-account",
  "/landing",
];
