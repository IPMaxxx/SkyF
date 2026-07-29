"use client";

/**
 * Медаль уровня: кольцо прогресса, внутри номер уровня, а у закрытого —
 * медаль. Один и тот же значок стоит и в главах квестов, и в блоке достижений
 * на аккаунте, поэтому живёт отдельным компонентом.
 *
 * Кольцо считается от найденных видов уровня: значок сам по себе показывает,
 * сколько осталось, и рядом не нужна ещё одна полоска.
 */

import { Medal } from "lucide-react";
import { cn } from "@/lib/utils";

const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CheckerMedal({
  level,
  found,
  total,
  size = 38,
  className,
}: {
  level: number;
  found: number;
  total: number;
  size?: number;
  className?: string;
}) {
  const complete = found >= total && total > 0;
  const filled = total > 0 ? Math.min(found / total, 1) : 0;

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cn("relative inline-flex flex-none items-center justify-center", className)}
    >
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
        <circle
          cx="18"
          cy="18"
          r={RADIUS}
          fill="none"
          strokeWidth="3"
          className="stroke-ck-border-3"
        />
        {filled > 0 && (
          <circle
            cx="18"
            cy="18"
            r={RADIUS}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - filled)}
            className={cn(
              "transition-[stroke-dashoffset] duration-700",
              complete ? "stroke-ck-primary" : "stroke-ck-primary-light",
            )}
          />
        )}
      </svg>
      {complete ? (
        <Medal
          style={{ width: size * 0.45, height: size * 0.45 }}
          strokeWidth={2.2}
          className="text-ck-primary-text"
        />
      ) : (
        <span
          style={{ fontSize: size * 0.37 }}
          className="font-extrabold leading-none text-ck-body-soft"
        >
          {level}
        </span>
      )}
    </span>
  );
}
