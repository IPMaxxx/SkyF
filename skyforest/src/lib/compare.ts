import type { WeatherDay } from "@/lib/supabase/types";

export interface WeightConfig {
  rain_sum: number;
  temperature_mean: number;
  temperature_min: number;
  temperature_max: number;
  wind_speed_max: number;
  relative_humidity_mean: number;
}

export const DEFAULT_WEIGHTS: WeightConfig = {
  rain_sum: 0.30,
  temperature_mean: 0.25,
  temperature_min: 0.10,
  temperature_max: 0.10,
  wind_speed_max: 0.10,
  relative_humidity_mean: 0.15,
};

export const WEIGHT_LABELS: Record<keyof WeightConfig, string> = {
  rain_sum: "Дождь (мм)",
  temperature_mean: "Температура средняя (°C)",
  temperature_min: "Температура мин (°C)",
  temperature_max: "Температура макс (°C)",
  wind_speed_max: "Ветер макс (км/ч)",
  relative_humidity_mean: "Влажность (%)",
};

// Biological viability score for mushroom growth (0 to 1).
// Maps a temperature to a "mushroom friendliness" score.
//   below -2°C  → 0   (frozen ground, snow, zero growth)
//   -2 to  3°C  → 0 to 0.05  (near-zero, frost damage)
//    3 to  8°C  → 0.05 to 0.4 (minimal, only cold-hardy species)
//    8 to 12°C  → 0.4 to 0.75 (moderate, some species fruit)
//   12 to 20°C  → 0.75 to 1.0 (optimal range)
//   20 to 28°C  → 1.0 to 0.5  (declining, too warm)
//   above 28°C  → 0.5 to 0.1  (poor, too hot and dry)
function mushroomViability(tempC: number): number {
  if (tempC <= -2) return 0;
  if (tempC <= 3) return lerp(tempC, -2, 3, 0, 0.05);
  if (tempC <= 8) return lerp(tempC, 3, 8, 0.05, 0.4);
  if (tempC <= 12) return lerp(tempC, 8, 12, 0.4, 0.75);
  if (tempC <= 20) return lerp(tempC, 12, 20, 0.75, 1.0);
  if (tempC <= 28) return lerp(tempC, 20, 28, 1.0, 0.5);
  return Math.max(0.1, lerp(tempC, 28, 38, 0.5, 0.1));
}

function lerp(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  const t = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)));
  return outMin + t * (outMax - outMin);
}

// Compare two temperature values using biological viability.
// Core rule: frost (below 0°C) = no mushroom growth = 0% match.
function compareTemperature(refTemp: number, curTemp: number): number {
  // Current temp below freezing → ground frozen, no growth possible
  if (curTemp < 0) {
    // Tiny credit only if reference was also freezing (both "bad" days)
    if (refTemp < 0) {
      return Math.max(0, 0.1 * (1 - Math.abs(refTemp - curTemp) / 20));
    }
    return 0;
  }

  // Current temp barely above zero (0–3°C) → nearly impossible conditions
  if (curTemp < 3 && refTemp > 8) {
    return 0.05 * (curTemp / 3);
  }

  // Both above freezing: compare viability scores + raw closeness
  const refV = mushroomViability(refTemp);
  const curV = mushroomViability(curTemp);
  const viabilitySimilarity = 1 - Math.abs(refV - curV);
  const rawSimilarity = Math.max(0, 1 - Math.abs(refTemp - curTemp) / 15);
  return viabilitySimilarity * 0.5 + rawSimilarity * 0.5;
}

// Compare precipitation: simple ratio-based comparison.
// If both are 0, perfect match. Otherwise, compare proportionally.
function comparePrecipitation(refVal: number, curVal: number): number {
  if (refVal === 0 && curVal === 0) return 1;
  const maxVal = Math.max(refVal, curVal, 0.1);
  const diff = Math.abs(refVal - curVal);
  return Math.max(0, 1 - diff / Math.max(maxVal, 10));
}

function compareWind(refVal: number, curVal: number): number {
  const diff = Math.abs(refVal - curVal);
  return Math.max(0, 1 - diff / 40);
}

function compareHumidity(refVal: number, curVal: number): number {
  const diff = Math.abs(refVal - curVal);
  return Math.max(0, 1 - diff / 50);
}

function paramValue(day: WeatherDay, key: keyof WeightConfig): number | null {
  switch (key) {
    case "rain_sum": return day.rain_sum;
    case "temperature_mean": return day.temperature_mean;
    case "temperature_min": return day.temperature_min;
    case "temperature_max": return day.temperature_max;
    case "wind_speed_max": return day.wind_speed_max ?? null;
    case "relative_humidity_mean": return day.relative_humidity_mean ?? null;
  }
}

function compareParam(key: keyof WeightConfig, refVal: number, curVal: number): number {
  switch (key) {
    case "temperature_mean":
    case "temperature_min":
    case "temperature_max":
      return compareTemperature(refVal, curVal);
    case "rain_sum":
      return comparePrecipitation(refVal, curVal);
    case "wind_speed_max":
      return compareWind(refVal, curVal);
    case "relative_humidity_mean":
      return compareHumidity(refVal, curVal);
  }
}

export interface CompareResult {
  overall: number;
  byParameter: Record<keyof WeightConfig, number>;
  byDay: number[];
}

export function comparePatterns(
  reference: WeatherDay[],
  current: WeatherDay[],
  weights: WeightConfig
): CompareResult {
  const len = Math.min(reference.length, current.length);
  if (len === 0) return { overall: 0, byParameter: {} as Record<keyof WeightConfig, number>, byDay: [] };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const normalizedWeights: WeightConfig = { ...weights };
  if (totalWeight > 0) {
    for (const k of Object.keys(normalizedWeights) as (keyof WeightConfig)[]) {
      normalizedWeights[k] = normalizedWeights[k] / totalWeight;
    }
  }

  const paramKeys = Object.keys(weights) as (keyof WeightConfig)[];
  const paramScores: Record<string, number[]> = {};
  for (const k of paramKeys) paramScores[k] = [];

  const dayScores: number[] = [];

  for (let i = 0; i < len; i++) {
    let dayScore = 0;
    let dayWeightSum = 0;

    for (const key of paramKeys) {
      const refVal = paramValue(reference[i], key);
      const curVal = paramValue(current[i], key);

      if (refVal === null || curVal === null) continue;

      const similarity = compareParam(key, refVal, curVal);

      paramScores[key].push(similarity);
      dayScore += similarity * normalizedWeights[key];
      dayWeightSum += normalizedWeights[key];
    }

    if (dayWeightSum > 0) {
      dayScores.push(dayScore / dayWeightSum);
    }
  }

  const byParameter = {} as Record<keyof WeightConfig, number>;
  for (const key of paramKeys) {
    const scores = paramScores[key];
    byParameter[key] = scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length) * 100
      : 0;
  }

  const overall = dayScores.length > 0
    ? (dayScores.reduce((a, b) => a + b, 0) / dayScores.length) * 100
    : 0;

  return { overall, byParameter, byDay: dayScores.map((s) => s * 100) };
}

export function getMatchColor(percent: number): string {
  if (percent >= 80) return "text-green-600";
  if (percent >= 60) return "text-yellow-600";
  if (percent >= 40) return "text-orange-500";
  return "text-red-500";
}

export function getMatchBgGradient(percent: number): string {
  if (percent >= 80) return "from-green-500 to-emerald-600";
  if (percent >= 60) return "from-yellow-500 to-amber-600";
  if (percent >= 40) return "from-orange-500 to-red-500";
  return "from-red-500 to-red-700";
}

export function getMatchLabel(percent: number): string {
  if (percent >= 85) return "Отличное совпадение!";
  if (percent >= 70) return "Хорошее совпадение";
  if (percent >= 55) return "Умеренное совпадение";
  if (percent >= 40) return "Слабое совпадение";
  return "Низкое совпадение";
}
