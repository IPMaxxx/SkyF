import { Check, Sparkles } from "lucide-react";
import Link from "next/link";

const PLANS = [
  {
    name: "Старт",
    desc: "Знакомство с сервисом",
    price: "Бесплатно",
    priceNote: "при регистрации",
    highlight: false,
    features: [
      "Бесплатные токены на старте",
      "Добавление грибных локаций",
      "Проверка погоды по локации",
      "Сохранение лучшего дня",
      "Доступ к дашборду",
    ],
    cta: "Начать бесплатно",
    href: "/register",
  },
  {
    name: "Стандарт",
    desc: "Для регулярных походов",
    price: "12 BYN",
    priceNote: "30 токенов",
    highlight: true,
    features: [
      "Всё из тарифа «Старт»",
      "Сравнение погодных паттернов",
      "Карта осадков",
      "Поиск лесных массивов",
      "Хватает на ~15 проверок",
    ],
    cta: "Выбрать",
    href: "/payment",
  },
  {
    name: "Грибник Про",
    desc: "Максимум возможностей",
    price: "90 BYN",
    priceNote: "300 токенов",
    highlight: false,
    features: [
      "Всё из тарифа «Стандарт»",
      "Лучшая цена за токен",
      "Хватает на весь сезон",
      "Неограниченные локации",
      "Приоритетная поддержка",
    ],
    cta: "Выбрать",
    href: "/payment",
  },
];

export function Tariffs() {
  return (
    <section id="tariffs" className="relative py-20 sm:py-28">
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Тарифы
          </h2>
          <p className="mx-auto max-w-2xl text-white/60">
            Оплата за токены — тратите только на те функции, которые используете.
            Без абонентской платы и скрытых списаний.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col overflow-hidden rounded-2xl transition-all ${
                plan.highlight
                  ? "glass-strong ring-1 ring-primary/40 scale-[1.02]"
                  : "glass"
              }`}
            >
              {plan.highlight && (
                <div className="flex items-center justify-center gap-1.5 bg-primary py-1.5 text-xs font-semibold text-white">
                  <Sparkles className="h-3 w-3" />
                  Популярный выбор
                </div>
              )}

              <div className="flex flex-1 flex-col p-6">
                <h3 className="mb-1 text-lg font-bold text-white">
                  {plan.name}
                </h3>
                <p className="mb-4 text-sm text-white/50">{plan.desc}</p>

                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">
                    {plan.price}
                  </span>
                  <p className="mt-1 text-xs text-white/40">{plan.priceNote}</p>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
                        <Check className="h-3 w-3 text-primary-light" />
                      </div>
                      <span className="text-sm text-white/70">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                    plan.highlight
                      ? "bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-dark hover:shadow-xl"
                      : "bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-white/40">
          Все функции работают в браузере — скачивать ничего не нужно. Оплата
          через bePaid (Visa, MasterCard, Белкарт).
        </p>
      </div>
    </section>
  );
}
