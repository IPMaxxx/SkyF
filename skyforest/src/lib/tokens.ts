export const TOKEN_COSTS = {
  weather_check: 4,
  best_day_create: 2,
  best_day_reload: 2,
  compare: 6,
  rain_map_per_batch: 10, // per 50 points
  forest_search: 2, // base; actual cost = 2 * ceil(radius_km / 2)
  marketplace_buy: 0, // dynamic — equals listing price; 0 is placeholder
  marketplace_list: 10,
} as const;

export const TOKEN_PACKAGES = [
  { id: "pack_10", tokens: 10, price: 5, label: "10 токенов", popular: false },
  { id: "pack_30", tokens: 30, price: 12, label: "30 токенов", popular: true },
  { id: "pack_100", tokens: 100, price: 35, label: "100 токенов", popular: false },
  { id: "pack_300", tokens: 300, price: 90, label: "300 токенов", popular: false },
] as const;

export const BULK_RATE = 0.3; // BYN per token for 300+ tokens (same as pack_300)

export function getTokenCostLabel(action: keyof typeof TOKEN_COSTS): string {
  switch (action) {
    case "weather_check": return "Проверка погоды (14 дней)";
    case "best_day_create": return "Запись грибного дня";
    case "best_day_reload": return "Обновление погоды грибного дня";
    case "compare": return "Сравнение погодных условий";
    case "rain_map_per_batch": return "Карта осадков (за 50 точек)";
    case "forest_search": return "Поиск леса (≈ радиус в км)";
    case "marketplace_buy": return "Покупка грибного дня на маркетплейсе";
    case "marketplace_list": return "Размещение на маркетплейсе";
  }
}
