"use client";

/**
 * Прогресс квестов одной строкой: по сегменту на вид, сгруппированы по
 * уровням. Заменяет четыре полосы (общую и по одной на уровень) — из одной
 * строки видно и сколько всего собрано, и в каком уровне это собрано.
 */

import { cn } from "@/lib/utils";

export function CheckerProgressPips({
  levels,
  className,
}: {
  levels: readonly { id: number; found: number; total: number }[];
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("flex flex-1 items-center gap-2", className)}
    >
      {levels.map((level) => (
        <span key={level.id} className="flex flex-1 items-center gap-[3px]">
          {Array.from({ length: level.total }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-[6px] flex-1 rounded-full transition-colors duration-500",
                // Не `bg-ck-field`: в светлой схеме поле совпадает с
                // поверхностью карточки, и пустые сегменты исчезали.
                i < level.found ? "bg-ck-primary" : "bg-ck-border-3",
              )}
            />
          ))}
        </span>
      ))}
    </span>
  );
}
