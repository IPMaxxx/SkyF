/**
 * Тарифы подписки WayBack на экране оплаты: какие показать и как посчитать
 * выгоду годового.
 *
 * Список товаров сюда не переписан, а взят из общего каталога
 * (`src/lib/native/iapProducts.ts`): там же его читают плагин покупок и
 * серверная проверка чека, и второй список молча разошёлся бы с первым.
 * Здесь только то, чего каталог не знает: порядок тарифов на экране и
 * арифметика «сколько это выходит в неделю».
 */
import {
  subscriptionProductsForBundle,
  WAYBACK_BUNDLE_ID,
  type SubscriptionProduct,
} from "@/lib/native/iapProducts";

/** Порядок на экране: сначала короткий тариф, под ним выгодный. */
const ORDER = ["weekly", "yearly"] as const;

export type WaybackPeriod = (typeof ORDER)[number];

export interface WaybackPlan extends SubscriptionProduct {
  period: WaybackPeriod;
}

function isWaybackPeriod(period: string): period is WaybackPeriod {
  return (ORDER as readonly string[]).includes(period);
}

/** Все тарифы приложения, в порядке показа. */
export const WAYBACK_PLANS: WaybackPlan[] = subscriptionProductsForBundle(
  WAYBACK_BUNDLE_ID,
)
  .filter((p): p is WaybackPlan => isWaybackPeriod(p.period))
  .sort((a, b) => ORDER.indexOf(a.period) - ORDER.indexOf(b.period));

/**
 * Тариф, который продаётся в обоих сторах с первой версии приложения.
 *
 * Он нужен ровно на одно мгновение — пока стор не ответил, какие товары
 * готовы к заказу. Показать в этот момент оба тарифа нельзя: недельный
 * одобряют в App Store и в Google Play в разное время, и кнопка упёрлась бы
 * в «товар недоступен». Показать пустоту тоже нельзя — экран оплаты
 * обязателен, за ним начинается приложение. Поэтому до ответа стора на
 * экране ровно то, что было там всегда: годовой тариф без выбора.
 */
export const WAYBACK_BASE_PLAN: WaybackPlan = WAYBACK_PLANS.find(
  (p) => p.period === "yearly",
)!;

/** Сколько недель считаем в году, когда сравниваем тарифы. */
export const WEEKS_PER_YEAR = 52;

/**
 * Тарифы, которые показываем: пересечение каталога с тем, что стор реально
 * отдал готовым к заказу.
 *
 * Флага «включить недельный» нет намеренно. Товар появляется в сторе, когда
 * тот его одобрил, и ровно тогда же — на экране; ни выкладывать новую сборку,
 * ни переключать что-либо руками для этого не нужно. Обратное тоже верно:
 * снятый с продажи товар исчезает с экрана сам.
 */
export function waybackPlansFor(
  purchasable: readonly string[],
): WaybackPlan[] {
  const offered = WAYBACK_PLANS.filter((p) =>
    purchasable.includes(p.productId),
  );
  return offered.length > 0 ? offered : [WAYBACK_BASE_PLAN];
}

/** Число внутри отформатированной стором цены: «$19.99», «1 990,00 ₽». */
const PRICE_NUMBER = /\d[\d\s\u00a0.,]*\d|\d/;

/**
 * Цена числом из строки стора.
 *
 * Разбор свой, а не общий с Mushroom Checker: копия у флейворов дешевле, чем
 * общий модуль, который нельзя тронуть, не задев соседнее приложение.
 */
export function parseStorePrice(formatted: string): number | null {
  const raw = formatted.match(PRICE_NUMBER)?.[0];
  if (!raw) return null;
  // Разделитель дробной части — последний из «.» или «,», остальное группировка.
  const cleaned = raw.replace(/[\s\u00a0]/g, "");
  const sep = Math.max(cleaned.lastIndexOf("."), cleaned.lastIndexOf(","));
  const normalized =
    sep === -1
      ? cleaned.replace(/[.,]/g, "")
      : `${cleaned.slice(0, sep).replace(/[.,]/g, "")}.${cleaned.slice(sep + 1)}`;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Годовая цена в пересчёте на неделю: результат подставляется обратно в
 * строку стора, чтобы сохранить валюту и её место в записи. Цену, которую не
 * удалось разобрать, не показываем вовсе — выдумывать числа на экране
 * покупки нельзя.
 */
export function perWeekLabel(yearly: string, locale: string): string | null {
  const value = parseStorePrice(yearly);
  if (value === null) return null;
  const perWeek = (value / WEEKS_PER_YEAR).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return yearly.replace(PRICE_NUMBER, perWeek);
}

/**
 * Выгода годового тарифа против 52 недельных списаний, в процентах.
 *
 * Сравнение честное и полное: 19.99 против 1.99 × 52 = 103.48, то есть 81 %.
 * Меньше 5 % не показываем — такую «выгоду» правильнее не называть вовсе.
 */
export function yearlySavings(yearly: string, weekly: string): number | null {
  const y = parseStorePrice(yearly);
  const w = parseStorePrice(weekly);
  if (y === null || w === null) return null;
  const percent = Math.round((1 - y / (w * WEEKS_PER_YEAR)) * 100);
  return percent >= 5 ? percent : null;
}
