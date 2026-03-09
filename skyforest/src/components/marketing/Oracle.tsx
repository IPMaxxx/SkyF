import { AlertTriangle } from "lucide-react";

export function Oracle() {
  return (
    <section className="relative py-16 sm:py-20">
      <div className="absolute inset-0 bg-primary/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20" />
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mb-6 inline-flex items-center justify-center rounded-full bg-primary/20 p-3">
          <AlertTriangle className="h-6 w-6 text-primary-light" />
        </div>
        <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">
          SkyForest AI 2.0 — не оракул
        </h2>
        <p className="text-lg leading-relaxed text-white/70">
          Это инструмент на основе данных и науки. Мы не гарантируем, что грибы
          будут в определённом месте — мы показываем, когда погодные условия
          максимально похожи на те, при которых{" "}
          <span className="text-white font-medium">
            вы уже успешно собирали грибы.
          </span>
        </p>
      </div>
    </section>
  );
}
