import { CheckerHistoryTracker } from "@/components/checker/CheckerHistoryTracker";
import { CheckerSplash } from "@/flavors/checker/CheckerSplash";

/**
 * Оболочка всех экранов Mushroom Checker.
 *
 * Сегмент `ck/*` — внутренний: middleware переписывает сюда публичные пути
 * с хоста checker.* (`/login` → `/ck/login` и т.д.), поэтому URL в браузере
 * не меняется, а разметка Checker живёт отдельно от экранов SkyForest и
 * WayBack. Провайдеры токенов, записи трека и маркетинговый футер здесь не
 * подключены — в этом приложении их нет.
 */
export default function CheckerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-ck-canvas">
      {/* Прячет нативный splash Capacitor — обязателен на всех экранах. */}
      <CheckerSplash />
      {/* Считает переходы, чтобы кнопки «назад» знали, есть ли куда вернуться. */}
      <CheckerHistoryTracker />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
