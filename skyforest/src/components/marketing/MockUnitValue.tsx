"use client";

import { useUnits } from "@/lib/units";

/**
 * Значение погоды в мокапах лендинга (метрика в пропсах),
 * отображается в выбранной пользователем системе единиц.
 */
export function MockUnitValue({
  kind,
  value,
}: {
  kind: "temp" | "rain" | "wind";
  value: number;
}) {
  const units = useUnits();
  if (kind === "temp") {
    const sign = !units.isImperial && value > 0 ? "+" : "";
    return <>{`${sign}${units.fmtTemp(value, 0)}${units.tempUnit}`}</>;
  }
  if (kind === "rain") {
    return <>{`${units.fmtPrecip(value, 0)} ${units.precipUnit}`}</>;
  }
  return <>{`${units.fmtWind(value, 0)} ${units.windUnit}`}</>;
}
