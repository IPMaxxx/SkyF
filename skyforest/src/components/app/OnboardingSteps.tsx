"use client";

import Link from "next/link";
import { MapPin, Star, GitCompareArrows, ChevronRight } from "lucide-react";

interface OnboardingStepsProps {
  hasLocations: boolean;
  hasBestDays: boolean;
}

const steps = [
  {
    num: 1,
    title: "Добавьте локацию",
    desc: "Укажите на карте место, где вы обычно ходите за грибами.",
    icon: MapPin,
    href: "/dashboard/locations/new",
    color: "from-emerald-500 to-green-600",
    free: true,
  },
  {
    num: 2,
    title: "Добавьте грибной день",
    desc: "Вспомните дату удачного сбора. Мы загрузим погоду за тот период (2 токена). Сохранение бесплатно.",
    icon: Star,
    href: "/dashboard/best-day/new",
    color: "from-amber-500 to-orange-600",
    cost: "2 токена",
  },
  {
    num: 3,
    title: "Включите мониторинг",
    desc: "Система будет следить за погодой и оповестит, когда условия повторятся.",
    icon: GitCompareArrows,
    href: "/dashboard/compare",
    color: "from-violet-500 to-purple-600",
    cost: "6 токенов",
  },
];

export function OnboardingSteps({ hasLocations, hasBestDays }: OnboardingStepsProps) {
  const currentStep = !hasLocations ? 0 : !hasBestDays ? 1 : 2;

  return (
    <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-6">
      <h2 className="mb-1 text-lg font-bold">С чего начать?</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Три простых шага, чтобы SkyForest начал работать на вас
      </p>

      <div className="space-y-3">
        {steps.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;

          return (
            <div key={step.num} className={`relative flex items-center gap-4 rounded-xl p-4 transition-all ${
              active ? "glass border border-primary/30 shadow-md shadow-primary/10" : done ? "opacity-60" : "opacity-40"
            }`}>
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white ${
                done ? "bg-emerald-600" : `bg-gradient-to-br ${step.color}`
              }`}>
                {done ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold ${done ? "line-through" : ""}`}>
                    Шаг {step.num}: {step.title}
                  </p>
                  {step.free && (
                    <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                      Бесплатно
                    </span>
                  )}
                  {step.cost && (
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
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-dark"
                >
                  Начать
                  <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
