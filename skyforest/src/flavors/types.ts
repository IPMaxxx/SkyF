/**
 * Описание одного приложения («флейвора»), собираемого из общей кодовой базы.
 *
 * Конкретные значения лежат рядом, каждое в своём каталоге:
 * src/flavors/{skyforest,checker,wayback}/config.ts. Так настройки приложения
 * правятся у себя и не задевают остальные продукты; собирает их
 * src/flavors/registry.ts.
 */

import type { AppLocale } from "../i18n/locales";

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
   * Цены подписки в USD — одинаковые в сторах и на сайте. Короткий период
   * необязателен и у каждого приложения свой: WayBack продаёт только годовую
   * подписку, Mushroom Checker — недельную и годовую, и лишнего товара в
   * сторах при этом нет.
   */
  priceWeeklyUsd?: number;
  priceMonthlyUsd?: number;
  priceYearlyUsd: number;
}

/**
 * Ссылки на контент приложения, которые уходят в `<head>`: RSS-фид блога,
 * карточка для ИИ-ассистентов (llms.txt) и объявление о ней. Есть только у
 * продуктов, у которых этот контент действительно есть.
 */
export interface FlavorContentFeed {
  /** Абсолютный URL RSS-фида. */
  feedUrl: string;
  /** Заголовок фида на языке фида — его показывают читалки. */
  feedTitle: string;
  /** Абсолютный URL карточки автора (llms.txt). */
  authorUrl: string;
  /** Текст меты ai-content-declaration. */
  aiDeclaration: string;
}

/**
 * Приложение, в котором тему выбирает пользователь (Mushroom Checker: тёмная
 * по умолчанию, светлая по желанию). Выбор лежит в куке, потому что схему
 * нужно знать ещё на сервере: атрибут `data-scheme` уезжает на <html> вместе
 * с разметкой, и первая отрисовка идёт сразу в нужных цветах.
 *
 * `themes` описывает только чром вокруг страницы — его нельзя получить из CSS:
 * `theme-color` уходит в <meta>, стиль статус-бара iOS — в свой <meta> и в
 * @capacitor/status-bar. Сами цвета интерфейса живут в CSS приложения.
 */
export interface FlavorThemeSwitch<Theme extends string = string> {
  /** Кука с выбором пользователя. */
  cookie: string;
  /** Тема, которую показываем, пока выбора нет. */
  defaultTheme: Theme;
  themes: Record<
    Theme,
    { themeColor: string; statusBarStyle: "default" | "black-translucent" }
  >;
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
  defaultLocale: AppLocale;
  /**
   * Языки, которые приложение показывает, в порядке переключателя. Первым
   * идёт `defaultLocale`.
   *
   * Список языков — свойство приложения, а не сборки: словари переведены под
   * конкретный продукт, и WayBack умеет пять языков, а SkyForest и Mushroom
   * Checker — два. Кто читает: middleware (уводит с чужого языка и выбирает
   * язык по куке), переключатели языка через `useFlavorLocales()`. Объединение
   * всех наборов знает только next-intl — см. src/i18n/locales.ts.
   *
   * Добавлять сюда язык можно, только когда переведена вся копия приложения:
   * непереведённые общие ключи откатываются на английский, но незнакомый язык
   * в переключателе — обещание, которого продукт не выполняет.
   */
  locales: readonly AppLocale[];
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
  /** Цвет `theme-color`: фон холста приложения (тема по умолчанию). */
  themeColor: string;
  /** Стиль статус-бара iOS: светлым схемам нужен тёмный текст. */
  statusBarStyle: "default" | "black-translucent";
  /**
   * Задано, если тему выбирает пользователь. Приложение само следит за
   * статус-баром (общий NativeAppProvider в такие флейворы не лезет).
   */
  themeSwitch?: FlavorThemeSwitch;
  /**
   * Контентный фид приложения: RSS блога, карточка автора для читалок и
   * ботов. Поле необязательное, и это главное в нём: у приложений без блога
   * (Checker, WayBack) фида нет, и в `<head>` не должно быть чужого — раньше
   * туда всем подряд уходил русский фид skyforest.by.
   */
  contentFeed?: FlavorContentFeed;
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
