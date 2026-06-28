"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HERO_TOOL_BY_ID, HERO_TOOL_ROWS } from "@/lib/heroTools";

const ROW_GRID_CLASS: Record<number, string> = {
  3: "grid-cols-1 sm:grid-cols-3",
  2: "grid-cols-1 sm:grid-cols-2",
};

export function HeroToolButtons() {
  const t = useTranslations("hero");

  return (
    <section
      aria-label={t("toolsSectionLabel")}
      className="relative px-4 pb-16 text-white sm:pb-20"
    >
      <div className="relative z-10 mx-auto max-w-5xl">
        <p className="mb-6 text-center text-sm font-medium uppercase tracking-[0.2em] text-white/50">
          {t("toolsEyebrow")}
        </p>

        <div className="flex flex-col gap-3 sm:gap-4">
          {HERO_TOOL_ROWS.map((row, rowIndex) => (
            <div
              key={row.join("-")}
              className={`grid gap-3 sm:gap-4 ${ROW_GRID_CLASS[row.length] ?? "grid-cols-1"}`}
            >
              {row.map((toolId) => {
                const tool = HERO_TOOL_BY_ID[toolId];
                if (!tool) return null;

                return (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    style={{ animationDelay: `${rowIndex * 80}ms` }}
                    className={`hero-tool-btn group relative flex min-h-[5.5rem] items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/10 hover:shadow-xl ${tool.glow} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light sm:min-h-[6rem] sm:p-5`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${tool.iconBg}`}
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 -translate-x-[120%] skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-[120%]"
                    />

                    <span
                      className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tool.iconBg} ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-110 group-hover:ring-white/20`}
                    >
                      <tool.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </span>

                    <span className="relative min-w-0 flex-1 text-left">
                      <span
                        className={`mb-0.5 block bg-gradient-to-r bg-clip-text text-sm font-semibold text-transparent sm:text-base ${tool.accent}`}
                      >
                        {t(tool.titleKey)}
                      </span>
                      <span className="line-clamp-2 text-xs leading-snug text-white/55 transition-colors group-hover:text-white/70">
                        {t(tool.descKey)}
                      </span>
                    </span>

                    <span
                      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition-all duration-300 group-hover:bg-white/10 group-hover:ring-white/25`}
                    >
                      <ArrowRight
                        className="h-4 w-4 text-white/70 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-white"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
