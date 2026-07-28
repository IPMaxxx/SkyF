import { Toaster } from "sonner";
import { TrackRecorder } from "@/components/app/TrackRecorder";
import { WayBackSplash } from "@/flavors/wayback/WayBackSplash";

/**
 * Оболочка всех экранов WayBack.
 *
 * Сегмент `wb/*` — внутренний: middleware переписывает сюда публичные пути
 * с хоста wayback.* (`/login` → `/wb/login`, `/dashboard/track` → `/wb/track`
 * и т.д.), поэтому URL в браузере не меняется, а разметка WayBack живёт
 * отдельно от экранов SkyForest и Checker.
 *
 * Шапки и футера здесь нет намеренно: каждый экран «Widget Board» рисует свою
 * верхнюю панель (WbTopBar) — со стрелкой назад или кнопкой меню.
 *
 * Провайдеры токенов и данных кабинета SkyForest не подключены: в WayBack нет
 * ни токенов, ни маркетплейса. А вот TrackRecorder обязателен — он пишет точки
 * пути, пока приложение в фоне, и без него стрелка домой перестанет обновляться
 * (раньше он приходил из layout группы `(app)`).
 */
export default function WayBackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-wb-canvas">
      {/* Прячет нативный splash Capacitor — обязателен на всех экранах. */}
      <WayBackSplash />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <TrackRecorder />
      {/* Светлые тосты: тёмные из кабинета SkyForest на холсте #eef0ec слепые. */}
      <Toaster
        position="top-center"
        theme="light"
        richColors
        toastOptions={{
          style: {
            background: "#ffffff",
            border: "1px solid #dcdfd8",
            color: "#141a15",
            borderRadius: "18px",
          },
        }}
      />
    </div>
  );
}
