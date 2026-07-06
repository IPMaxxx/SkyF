"use client";

import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { LocationDifficulty } from "@/lib/supabase/types";

const DIFFICULTY_STYLE: {
  value: LocationDifficulty;
  color: string;
  activeColor: string;
}[] = [
  {
    value: "easy",
    color: "text-emerald-400",
    activeColor: "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40",
  },
  {
    value: "medium",
    color: "text-amber-400",
    activeColor: "bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/40",
  },
  {
    value: "hard",
    color: "text-red-400",
    activeColor: "bg-red-500/20 text-red-400 ring-2 ring-red-500/40",
  },
];

interface Props {
  value: LocationDifficulty | null;
  onChange: (value: LocationDifficulty | null) => void;
  readonly?: boolean;
}

export function DifficultySelect({ value, onChange, readonly }: Props) {
  const t = useTranslations("dashboard.difficulty");
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);

  const DIFFICULTY_OPTIONS = DIFFICULTY_STYLE.map((opt) => ({
    ...opt,
    label: t(opt.value),
    tooltip: t(`${opt.value}Desc`),
  }));

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <label className="block text-sm font-medium">{t("label")}</label>
        <div className="group relative">
          <HelpCircle className="h-3.5 w-3.5 cursor-help text-muted-foreground/60" />
          <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-xl border border-white/10 bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-300 opacity-0 shadow-xl transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <p key={opt.value} className="mb-1.5 last:mb-0">
                <span className={`font-semibold ${opt.color}`}>{opt.label}:</span>{" "}
                {opt.tooltip}
              </p>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {DIFFICULTY_OPTIONS.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={readonly}
              onClick={() => onChange(isActive ? null : opt.value)}
              onMouseEnter={() => setHoveredTooltip(opt.value)}
              onMouseLeave={() => setHoveredTooltip(null)}
              className={`relative flex-1 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                isActive
                  ? opt.activeColor
                  : "glass text-muted-foreground hover:text-foreground hover:bg-white/10"
              } ${readonly ? "pointer-events-none opacity-70" : ""}`}
            >
              {opt.label}
              {hoveredTooltip === opt.value && !readonly && (
                <div className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-[11px] leading-relaxed text-zinc-300 shadow-xl sm:hidden">
                  {opt.tooltip}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const DIFFICULTY_COLORS: Record<LocationDifficulty, string> = {
  easy: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  hard: "bg-red-500/15 text-red-400 border-red-500/20",
};
