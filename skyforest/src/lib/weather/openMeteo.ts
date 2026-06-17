import type { WeatherDay } from "@/lib/supabase/types";

/**
 * Дневной ряд погоды от Open-Meteo. Для дат строго в прошлом используется
 * архив (ERA5), иначе — forecast (включает недавнее прошлое и прогноз).
 */
export async function fetchOpenMeteoDaily(
  lat: number,
  lng: number,
  startStr: string,
  endStr: string
): Promise<WeatherDay[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isHistorical = new Date(endStr) < today;

  const baseUrl = isHistorical
    ? "https://archive-api.open-meteo.com/v1/archive"
    : "https://api.open-meteo.com/v1/forecast";

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    start_date: startStr,
    end_date: endStr,
    daily: [
      "temperature_2m_mean",
      "temperature_2m_min",
      "temperature_2m_max",
      "precipitation_sum",
      "rain_sum",
      "relative_humidity_2m_mean",
      "wind_speed_10m_max",
    ].join(","),
    timezone: "Europe/Minsk",
  });

  const res = await fetch(`${baseUrl}?${params}`, { next: { revalidate: 3600 } });
  const raw = await res.json();

  if (raw.error) {
    throw new Error(raw.reason || "open-meteo error");
  }

  const daily = raw.daily;
  if (!daily || !daily.time) {
    throw new Error("No data returned");
  }

  return daily.time.map((date: string, i: number) => ({
    date,
    temperature_mean: daily.temperature_2m_mean?.[i] ?? null,
    temperature_min: daily.temperature_2m_min?.[i] ?? null,
    temperature_max: daily.temperature_2m_max?.[i] ?? null,
    precipitation_sum: daily.precipitation_sum?.[i] ?? 0,
    rain_sum: daily.rain_sum?.[i] ?? 0,
    relative_humidity_mean: daily.relative_humidity_2m_mean?.[i] ?? null,
    wind_speed_max: daily.wind_speed_10m_max?.[i] ?? null,
  })) as WeatherDay[];
}
