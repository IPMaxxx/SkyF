export const TOKEN_COSTS = {
  weather_check: 1,
  best_day_create: 1,
  best_day_reload: 1,
  compare: 2,
  rain_map_per_batch: 5, // per 50 points
  forest_search: 1, // base; actual cost = ceil(radius_km / 2)
  marketplace_buy: 0, // dynamic — equals listing price; 0 is placeholder
} as const;

export const TOKEN_PACKAGES = [
  { id: "pack_10", tokens: 10, price: 5, label: "10 токенов", popular: false },
  { id: "pack_30", tokens: 30, price: 12, label: "30 токенов", popular: true },
  { id: "pack_100", tokens: 100, price: 35, label: "100 токенов", popular: false },
  { id: "pack_300", tokens: 300, price: 90, label: "300 токенов", popular: false },
] as const;

export function getTokenCostLabel(action: keyof typeof TOKEN_COSTS): string {
  switch (action) {
    case "weather_check": return "Проверка погоды";
    case "best_day_create": return "Создание / обновление Best Day";
    case "best_day_reload": return "Перезагрузка погоды Best Day";
    case "compare": return "Сравнение паттернов";
    case "rain_map_per_batch": return "Карта осадков (за 50 точек)";
    case "forest_search": return "Поиск леса (½ радиуса в км)";
    case "marketplace_buy": return "Покупка Best Day на маркетплейсе";
  }
}
