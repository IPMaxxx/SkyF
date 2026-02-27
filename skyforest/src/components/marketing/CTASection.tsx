import Link from "next/link";
import {
  Smartphone,
  CloudSun,
  BarChart3,
  Map,
  ArrowRight,
} from "lucide-react";

export function CTASection() {
  return (
    <>
      {/* CTA with app preview */}
      <section className="relative py-20 sm:py-28">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Phone mockup */}
            <div className="relative mx-auto w-full max-w-xs lg:order-2">
              <div className="relative mx-auto w-64 overflow-hidden rounded-[2.5rem] border-4 border-white/10 bg-black/60 shadow-2xl shadow-primary/10">
                <div className="flex items-center justify-center bg-black/80 py-2">
                  <div className="h-5 w-20 rounded-full bg-black" />
                </div>
                <div className="space-y-3 p-4">
                  <div className="rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 p-3 text-center">
                    <p className="text-[10px] text-white/50">
                      Совпадение с эталоном
                    </p>
                    <p className="text-2xl font-bold text-primary-light">92%</p>
                    <p className="text-[10px] text-primary-light/70">
                      Отличное время для сбора
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: CloudSun, label: "Погода", value: "+17°C" },
                      { icon: BarChart3, label: "Влажность", value: "85%" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-lg bg-white/5 p-2.5 text-center"
                      >
                        <item.icon className="mx-auto mb-1 h-4 w-4 text-white/40" />
                        <p className="text-[10px] text-white/40">
                          {item.label}
                        </p>
                        <p className="text-xs font-semibold text-white">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg bg-white/5 p-2.5">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <Map className="h-3 w-3 text-primary-light" />
                      <span className="text-[10px] font-medium text-white/60">
                        Карта осадков
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {Array.from({ length: 15 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-3 rounded-sm"
                          style={{
                            backgroundColor: `rgba(98, 168, 99, ${
                              0.1 + Math.random() * 0.5
                            })`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="h-3 bg-black/80" />
              </div>
              <div className="absolute -bottom-6 -right-6 -z-10 h-full w-full rounded-[2.5rem] bg-primary/15 blur-2xl" />
            </div>

            {/* Text */}
            <div className="lg:order-1">
              <h2 className="mb-6 text-3xl font-bold text-white sm:text-4xl">
                Найдите идеальный момент, чтобы отправиться в лес
              </h2>
              <p className="mb-8 text-lg text-white/60 leading-relaxed">
                SkyForest AI анализирует погодные данные и подскажет, когда
                условия максимально совпадают с вашими лучшими грибными днями.
                Работает в любом браузере — установка не требуется.
              </p>
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-primary-light" />
                <span className="text-sm text-white/50">
                  Доступно на мобильных, планшетах и десктопе
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Green CTA banner */}
      <section className="relative">
        <div className="bg-gradient-to-r from-primary-dark via-primary to-primary-dark py-12 sm:py-16">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">
              Найдите идеальный момент, чтобы отправиться в лес с SkyForest AI
            </h2>
            <p className="mb-8 text-white/80">
              Регистрация бесплатна. Первые токены — в подарок.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-primary-dark shadow-lg transition-all hover:bg-white/90 hover:shadow-xl"
            >
              Попробовать бесплатно
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
