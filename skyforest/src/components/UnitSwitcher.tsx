"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  setUnitSystem,
  useUnitSystem,
  type UnitSystem,
} from "@/lib/units";

const SYSTEMS: UnitSystem[] = ["metric", "imperial"];

/**
 * Переключатель системы единиц (°C/мм/км ↔ °F/in/mi).
 * Визуально повторяет LocaleSwitcher и ставится рядом с ним.
 */
export function UnitSwitcher({
  className,
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  const system = useUnitSystem();
  const t = useTranslations("units");

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border p-0.5 text-xs font-medium",
        variant === "dark"
          ? "border-white/15 bg-white/5"
          : "border-black/10 bg-black/5",
        className
      )}
      role="group"
      aria-label={t("switcherLabel")}
    >
      {SYSTEMS.map((sys) => (
        <button
          key={sys}
          type="button"
          onClick={() => setUnitSystem(sys)}
          aria-pressed={sys === system}
          title={t(sys === "metric" ? "metricTitle" : "imperialTitle")}
          className={cn(
            "rounded-md px-2 py-1 transition-colors",
            sys === system
              ? variant === "dark"
                ? "bg-white/15 text-white"
                : "bg-white text-[#0d1a12]"
              : variant === "dark"
                ? "text-white/60 hover:text-white"
                : "text-black/50 hover:text-black"
          )}
        >
          {sys === "metric" ? "°C" : "°F"}
        </button>
      ))}
    </div>
  );
}
