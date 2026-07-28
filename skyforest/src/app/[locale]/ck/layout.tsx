import { cookies } from "next/headers";
import { CheckerHistoryTracker } from "@/components/checker/CheckerHistoryTracker";
import { CheckerThemeProvider } from "@/components/checker/CheckerThemeProvider";
import { CheckerSplash } from "@/flavors/checker/CheckerSplash";
import { CHECKER_THEME_COOKIE, parseCheckerTheme } from "@/lib/checker/theme";

/**
 * Оболочка всех экранов Mushroom Checker.
 *
 * Сегмент `ck/*` — внутренний: middleware переписывает сюда публичные пути
 * с хоста checker.* (`/login` → `/ck/login` и т.д.), поэтому URL в браузере
 * не меняется, а разметка Checker живёт отдельно от экранов SkyForest и
 * WayBack. Провайдеры токенов, записи трека и маркетинговый футер здесь не
 * подключены — в этом приложении их нет.
 *
 * Тему читаем из куки здесь же: цвета применяет CSS по атрибуту на <html>
 * (его ставит src/app/layout.tsx), а провайдеру начальное значение нужно,
 * чтобы переключатель в панели «Ещё» сразу показывал выбранный вариант.
 */
export default async function CheckerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = parseCheckerTheme(
    (await cookies()).get(CHECKER_THEME_COOKIE)?.value,
  );

  return (
    <CheckerThemeProvider initialTheme={theme}>
      <div className="flex min-h-screen flex-col bg-ck-canvas">
        {/* Прячет нативный splash Capacitor — обязателен на всех экранах. */}
        <CheckerSplash />
        {/* Считает переходы, чтобы кнопки «назад» знали, есть ли куда вернуться. */}
        <CheckerHistoryTracker />
        <main id="main-content" className="flex-1" tabIndex={-1}>
          {children}
        </main>
      </div>
    </CheckerThemeProvider>
  );
}
