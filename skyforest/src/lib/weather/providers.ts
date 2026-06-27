import type { WeatherDay } from "@/lib/supabase/types";

/**
 * Источники погодных данных. Контракт у всех одинаковый — массив WeatherDay,
 * поэтому источник можно менять прозрачно для остального кода.
 *   - open-meteo      — бесплатный, история + прогноз (по умолчанию).
 *   - visual-crossing — альтернатива с историей (нужен VISUAL_CROSSING_API_KEY).
 */
export const WEATHER_SOURCES = ["open-meteo", "visual-crossing"] as const;
export type WeatherSource = (typeof WEATHER_SOURCES)[number];

export function isWeatherSource(value: unknown): value is WeatherSource {
  return (
    typeof value === "string" &&
    (WEATHER_SOURCES as readonly string[]).includes(value)
  );
}

/** Visual Crossing требует ключ; без него источник недоступен. */
export function visualCrossingAvailable(): boolean {
  return Boolean(process.env.VISUAL_CROSSING_API_KEY);
}

/**
 * Эффективный источник: запрошенный → дефолт из env (WEATHER_PROVIDER) →
 * open-meteo. Если запрошен visual-crossing, но ключ не настроен — мягкий
 * откат на open-meteo, чтобы запрос не падал.
 */
export function resolveWeatherSource(requested?: string | null): WeatherSource {
  const envDefault = isWeatherSource(process.env.WEATHER_PROVIDER)
    ? (process.env.WEATHER_PROVIDER as WeatherSource)
    : "open-meteo";

  let source: WeatherSource = isWeatherSource(requested) ? requested : envDefault;

  if (source === "visual-crossing" && !visualCrossingAvailable()) {
    source = "open-meteo";
  }
  return source;
}

/** Получить дневной ряд погоды от выбранного источника. */
export async function fetchDailyWeather(
  source: WeatherSource,
  lat: number,
  lng: number,
  startStr: string,
  endStr: string
): Promise<WeatherDay[]> {
  if (source === "visual-crossing") {
    const { fetchVisualCrossingDaily } = await import("./visualCrossing");
    return fetchVisualCrossingDaily(lat, lng, startStr, endStr);
  }
  const { fetchOpenMeteoDaily } = await import("./openMeteo");
  return fetchOpenMeteoDaily(lat, lng, startStr, endStr);
}
