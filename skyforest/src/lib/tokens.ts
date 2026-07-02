import { isSamplify } from "./brand";

export const TOKEN_COSTS = {
  weather_check: 4,
  best_day_create: 2,
  best_day_reload: 2,
  compare: 6,
  /** Rolling 14d pattern vs эталон: 6 якорей (сегодня … +5 дн.), один запрос погоды */
  compare_forecast: 12,
  rain_map_per_batch: 10, // per 50 points
  forest_search: 2, // base; actual cost = 2 * ceil(radius_km / 2)
  marketplace_buy: 0, // dynamic — equals listing price; 0 is placeholder
  marketplace_list: 10,
  tour_bid: 1, // one token per bid action in a mushroom-tour auction
  mushroom_identify: 1, // one token per photo identification (Kindwise)
} as const;

const TOKEN_PACKAGES_BY = [
  { id: "pack_10", tokens: 10, price: 5, label: "10 tokens", popular: false },
  { id: "pack_30", tokens: 30, price: 12, label: "30 tokens", popular: true },
  { id: "pack_100", tokens: 100, price: 35, label: "100 tokens", popular: false },
  { id: "pack_300", tokens: 300, price: 90, label: "300 tokens", popular: false },
] as const;

const TOKEN_PACKAGES_USD = [
  { id: "pack_10", tokens: 10, price: 2, label: "10 tokens", popular: false },
  { id: "pack_30", tokens: 30, price: 5, label: "30 tokens", popular: true },
  { id: "pack_100", tokens: 100, price: 12, label: "100 tokens", popular: false },
  { id: "pack_300", tokens: 300, price: 30, label: "300 tokens", popular: false },
] as const;

export const TOKEN_PACKAGES = isSamplify ? TOKEN_PACKAGES_USD : TOKEN_PACKAGES_BY;

/**
 * Цена одного токена в долларах для показа сумм в приложении (native).
 *
 * Берём популярный USD-пакет — тот, что подсвечен по умолчанию на странице
 * оплаты skyforest.ai (см. `TOKEN_PACKAGES_USD`): $5 за 30 токенов ≈ $0.167 за
 * токен. Так суммы в нативных попапах совпадают с тарифами боевого сайта, а не
 * с отдельным придуманным курсом.
 */
const USD_POPULAR_PACK =
  TOKEN_PACKAGES_USD.find((p) => p.popular) ?? TOKEN_PACKAGES_USD[0];
export const TOKEN_USD_RATE = USD_POPULAR_PACK.price / USD_POPULAR_PACK.tokens;

/** Форматирует стоимость действия (в токенах) как сумму в долларах: «≈ $0.67». */
export function formatTokenUsd(tokens: number): string {
  return `≈ $${(tokens * TOKEN_USD_RATE).toFixed(2)}`;
}

/** Per-token rate for custom purchases (301+ tokens) */
export const BULK_RATE = isSamplify ? 0.1 : 0.3;

/** Fiat value of one token when withdrawing to bank/card */
export const TOKEN_WITHDRAW_RATE = BULK_RATE;

export function getTokenCostLabel(action: keyof typeof TOKEN_COSTS): string {
  switch (action) {
    case "weather_check": return "Проверка погоды (14 дней)";
    case "best_day_create": return "Запись грибного дня";
    case "best_day_reload": return "Обновление погоды грибного дня";
    case "compare": return "Сравнение погодных условий";
    case "compare_forecast": return "Прогноз совпадения паттерна (6 дней)";
    case "rain_map_per_batch": return "Карта осадков (за 50 точек)";
    case "forest_search": return "Поиск леса (≈ радиус в км)";
    case "marketplace_buy": return "Покупка грибного дня на маркетплейсе";
    case "marketplace_list": return "Размещение на маркетплейсе";
    case "tour_bid": return "Ставка на грибном аукционе";
    case "mushroom_identify": return "Определение гриба по фото";
  }
}
