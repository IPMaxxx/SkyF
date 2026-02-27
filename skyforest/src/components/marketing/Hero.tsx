"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, X, CloudSun, Database, MapPin } from "lucide-react";

const FEATURES = [
  {
    icon: CloudSun,
    title: "Анализ погодных паттернов",
    desc: "Температура, осадки, влажность и ветер — отслеживаем все параметры для роста грибов",
  },
  {
    icon: Database,
    title: "Запись грибных данных",
    desc: "Сохраняйте даты удачного сбора — мы зафиксируем погодный паттерн как эталон",
  },
  {
    icon: MapPin,
    title: "Точная настройка локаций",
    desc: "Добавьте свои грибные места и получайте персональный анализ по каждому",
  },
];

export function Hero() {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <>
      <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-20 text-center text-white">
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />

        <div className="relative z-10 mx-auto max-w-5xl">
          <Image
            src="/images/logo.png"
            alt="SkyForest"
            width={200}
            height={120}
            className="mx-auto mb-8 h-24 w-auto sm:h-32"
            priority
          />

          <h1 className="mb-6 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Умный способ отследить
            <br />
            <span className="text-primary-light">идеальные условия для грибов</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
            Представьте, что вы точно знаете, когда и где лес создаёт идеальные
            условия для грибов —{" "}
            <span className="text-white font-medium">
              не по наитию, а на основе данных.
            </span>
          </p>

          <div className="mb-16 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="rounded-xl bg-primary px-10 py-4 text-base font-semibold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary-dark hover:shadow-xl hover:shadow-primary/40"
            >
              Попробовать бесплатно
            </Link>

            <button
              type="button"
              onClick={() => setVideoOpen(true)}
              className="glass flex items-center gap-2 rounded-xl px-8 py-4 text-base font-medium text-white transition-all hover:bg-white/15"
            >
              <Play className="h-5 w-5" />
              Смотреть видео
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="glass rounded-2xl p-6 text-left transition-all hover:bg-white/10"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                  <f.icon className="h-6 w-6 text-primary-light" />
                </div>
                <p className="mb-2 text-sm font-semibold text-white">
                  {f.title}
                </p>
                <p className="text-xs leading-relaxed text-white/60">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {videoOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setVideoOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setVideoOpen(false)}
              className="absolute -top-12 right-0 text-white transition-colors hover:text-white/70"
              aria-label="Закрыть видео"
            >
              <X className="h-8 w-8" />
            </button>
            <div className="relative overflow-hidden rounded-2xl pt-[56.25%]">
              <iframe
                className="absolute inset-0 h-full w-full"
                src="https://www.youtube.com/embed/53tUadA5u0s?autoplay=1"
                title="SkyForest — демо"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
