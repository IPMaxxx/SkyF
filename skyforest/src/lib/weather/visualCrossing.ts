import type { WeatherDay } from "@/lib/supabase/types";

interface VCDay {
  datetime: string;
  temp?: number | null;
  tempmin?: number | null;
  tempmax?: number | null;
  precip?: number | null;
  humidity?: number | null;
  windspeed?: number | null;
}

/**
 * Дневной ряд погоды от Visual Crossing (Timeline API). Один запрос отдаёт и
 * историю, и прогноз. unitGroup=metric → °C, мм, км/ч, %.
 *
 * Бесплатный тариф: 1000 «записей»/сутки (1 запись = 1 день/локация). Поэтому
 * источник предназначен для карточки одной локации, а не для сетки карты осадков.
 */
export async function fetchVisualCrossingDaily(
  lat: number,
  lng: number,
  startStr: string,
  endStr: string
): Promise<WeatherDay[]> {
  const key = process.env.VISUAL_CROSSING_API_KEY;
  if (!key) {
    throw new Error("VISUAL_CROSSING_API_KEY is not set");
  }

  const loc = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const base =
    "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline";
  const elements = "datetime,temp,tempmin,tempmax,precip,humidity,windspeed";
  const url =
    `${base}/${encodeURIComponent(loc)}/${startStr}/${endStr}` +
    `?unitGroup=metric&include=days&elements=${elements}` +
    `&key=${encodeURIComponent(key)}&contentType=json`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`visual-crossing ${res.status}: ${text.slice(0, 120)}`);
  }

  const raw = (await res.json()) as { days?: VCDay[] };
  const days = Array.isArray(raw.days) ? raw.days : [];

  return days.map((d) => {
    // VC отдаёт суммарные осадки (дождь + ливни + вода из снега) — это полнее
    // open-meteo rain_sum и не занижает грозовые ливни. Маппим в оба поля,
    // т.к. движок сравнения взвешивает rain_sum.
    const precip = d.precip ?? 0;
    return {
      date: d.datetime,
      temperature_mean: d.temp ?? null,
      temperature_min: d.tempmin ?? null,
      temperature_max: d.tempmax ?? null,
      precipitation_sum: precip,
      rain_sum: precip,
      relative_humidity_mean: d.humidity ?? null,
      wind_speed_max: d.windspeed ?? null,
    };
  }) as WeatherDay[];
}
