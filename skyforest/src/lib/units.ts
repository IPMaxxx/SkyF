"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

/**
 * Система единиц измерения. Все данные (API, БД, движок сравнения) всегда
 * хранятся в метрике (°C, мм, км/ч, км/м); конвертация — только при выводе.
 */
export type UnitSystem = "metric" | "imperial";

const STORAGE_KEY = "sf-units";
const EVENT = "sf-units-change";

export function getUnitSystem(): UnitSystem {
  if (typeof window === "undefined") return "metric";
  try {
    return localStorage.getItem(STORAGE_KEY) === "imperial"
      ? "imperial"
      : "metric";
  } catch {
    return "metric";
  }
}

export function setUnitSystem(system: UnitSystem) {
  try {
    localStorage.setItem(STORAGE_KEY, system);
  } catch {
    /* noop */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useUnitSystem(): UnitSystem {
  return useSyncExternalStore(subscribe, getUnitSystem, () => "metric");
}

// --- чистые конвертеры (из метрики) ---

export const cToF = (c: number) => (c * 9) / 5 + 32;
export const mmToIn = (mm: number) => mm / 25.4;
export const kmToMi = (km: number) => km * 0.621371;
export const miToKm = (mi: number) => mi / 0.621371;
export const mToFt = (m: number) => m * 3.28084;

export interface Units {
  system: UnitSystem;
  isImperial: boolean;
  /** °C → отображаемое значение */
  temp: (c: number) => number;
  /** мм → отображаемое значение */
  precip: (mm: number) => number;
  /** км/ч → отображаемое значение */
  wind: (kmh: number) => number;
  /** км → отображаемое значение */
  dist: (km: number) => number;
  /** "°C" | "°F" */
  tempUnit: string;
  /** "мм" | "in" */
  precipUnit: string;
  /** "км/ч" | "mph" */
  windUnit: string;
  /** "км" | "mi" */
  distUnit: string;
  fmtTemp: (c: number, digits?: number) => string;
  fmtPrecip: (mm: number, digits?: number) => string;
  fmtWind: (kmh: number, digits?: number) => string;
  fmtDist: (km: number, digits?: number) => string;
  /** метры → "850 м" / "1.2 км" / "930 ft" / "1.4 mi" */
  fmtDistanceM: (m: number) => string;
}

/**
 * Хук с конвертерами и локализованными подписями единиц.
 * Использует namespace "units" из i18n-сообщений.
 */
export function useUnits(): Units {
  const system = useUnitSystem();
  const t = useTranslations("units");

  return useMemo(() => {
    const imp = system === "imperial";
    const temp = (c: number) => (imp ? cToF(c) : c);
    const precip = (mm: number) => (imp ? mmToIn(mm) : mm);
    const wind = (kmh: number) => (imp ? kmToMi(kmh) : kmh);
    const dist = (km: number) => (imp ? kmToMi(km) : km);

    return {
      system,
      isImperial: imp,
      temp,
      precip,
      wind,
      dist,
      tempUnit: imp ? "°F" : "°C",
      precipUnit: t(imp ? "in" : "mm"),
      windUnit: t(imp ? "mph" : "kmh"),
      distUnit: t(imp ? "mi" : "km"),
      fmtTemp: (c, digits = 1) => temp(c).toFixed(digits),
      // дюймы осадков мелкие — всегда 2 знака
      fmtPrecip: (mm, digits = 1) => precip(mm).toFixed(imp ? 2 : digits),
      fmtWind: (kmh, digits = 1) => wind(kmh).toFixed(digits),
      fmtDist: (km, digits = 1) => dist(km).toFixed(digits),
      fmtDistanceM: (m: number) => {
        if (imp) {
          const ft = mToFt(m);
          return ft < 1000
            ? t("distFt", { value: Math.round(ft) })
            : t("distMi", { value: (kmToMi(m / 1000)).toFixed(2) });
        }
        return m < 1000
          ? t("distM", { value: Math.round(m) })
          : t("distKm", { value: (m / 1000).toFixed(2) });
      },
    };
  }, [system, t]);
}
