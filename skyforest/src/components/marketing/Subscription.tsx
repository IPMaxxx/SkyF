import { Check } from "lucide-react";
import Link from "next/link";

const FEATURES = [
  "Неограниченная проверка погоды по всем локациям",
  "Сохранение лучших дней и погодных паттернов",
  "Сравнение текущей погоды с эталонами",
  "Карта осадков без ограничений",
  "Техническая поддержка",
];

export function Subscription() {
  return (
    <section id="subscription" className="relative py-20 sm:py-28">
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Годовая подписка
          </h2>
          <p className="mx-auto max-w-2xl text-white/60">
            Полный доступ ко всем инструментам Skyforest
          </p>
        </div>

        <div className="mx-auto max-w-md">
          <div className="glass overflow-hidden rounded-3xl">
            <div className="bg-gradient-to-br from-primary to-primary-dark p-8 text-center text-white">
              <p className="mb-1 text-sm font-medium uppercase tracking-wider opacity-80">
                Годовая подписка
              </p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold">100</span>
                <span className="text-xl">BYN</span>
              </div>
              <p className="mt-1 text-sm opacity-80">в год</p>
            </div>

            <div className="p-8">
              <ul className="mb-8 space-y-4">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
                      <Check className="h-3 w-3 text-primary-light" />
                    </div>
                    <span className="text-sm text-white/80">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/payment"
                className="block w-full rounded-xl bg-primary py-3.5 text-center text-base font-medium text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-dark hover:shadow-xl"
              >
                Оформить подписку
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
