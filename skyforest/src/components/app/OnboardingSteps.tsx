"use client";

import { Link } from "@/i18n/navigation";
import { MapPin, Star, GitCompareArrows, ChevronRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

interface OnboardingStepsProps {
  hasLocations: boolean;
  hasBestDays: boolean;
}

export function OnboardingSteps({ hasLocations, hasBestDays }: OnboardingStepsProps) {
  const t = useTranslations("dashboard.onboarding");
  const currentStep = !hasLocations ? 0 : !hasBestDays ? 1 : 2;
  const totalSteps = 3;
  const completedCount = currentStep;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  const steps = useMemo(
    () => [
      {
        num: 1,
        title: t("step1Title"),
        desc: t("step1Desc"),
        icon: MapPin,
        href: "/dashboard/locations/new",
        color: "from-emerald-500 to-green-600",
        free: true,
      },
      {
        num: 2,
        title: t("step2Title"),
        desc: t("step2Desc"),
        icon: Star,
        href: "/dashboard/best-day/new",
        color: "from-amber-500 to-orange-600",
        cost: t("step2Cost"),
      },
      {
        num: 3,
        title: t("step3Title"),
        desc: t("step3Desc"),
        icon: GitCompareArrows,
        href: "/dashboard/compare",
        color: "from-violet-500 to-purple-600",
        cost: t("step3Cost"),
      },
    ],
    [t]
  );

  return (
    <div
      className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-6"
      role="region"
      aria-label={t("title")}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">{t("title")}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <span
          className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary-light"
          aria-label={`${completedCount} / ${totalSteps}`}
        >
          {completedCount} / {totalSteps}
        </span>
      </div>

      <div
        className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/5"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-[width] duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <ol className="space-y-3">
        {steps.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;

          return (
            <li
              key={step.num}
              aria-current={active ? "step" : undefined}
              className={`relative flex items-center gap-4 rounded-xl p-4 transition-all ${
                active
                  ? "glass border border-primary/30 shadow-md shadow-primary/10"
                  : done
                    ? "opacity-70"
                    : "opacity-55"
              }`}
            >
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white ${
                  done ? "bg-emerald-600" : `bg-gradient-to-br ${step.color}`
                }`}
                aria-hidden="true"
              >
                {done ? (
                  <Check className="h-5 w-5" strokeWidth={2.5} />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-sm font-semibold ${done ? "line-through" : ""}`}>
                    {t("stepPrefix")} {step.num}: {step.title}
                  </p>
                  {"free" in step && step.free && (
                    <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                      {t("free")}
                    </span>
                  )}
                  {"cost" in step && step.cost && (
                    <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                      {step.cost}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.desc}</p>
              </div>

              {active && (
                <Link
                  href={step.href}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1a12]"
                >
                  {t("start")}
                  <ChevronRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
