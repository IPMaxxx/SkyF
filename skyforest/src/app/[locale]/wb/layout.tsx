import { Toaster } from "sonner";
import { TrackRecorder } from "@/components/app/TrackRecorder";
import { DeepLinkListener } from "@/lib/native/DeepLinkListener";
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
 * (раньше он приходил из layout группы `(app)`). По той же причине здесь стоит
 * DeepLinkListener: ссылку из письма (universal link на /auth/confirm) в
 * SkyForest ловит NativeAppProvider, которого в этом дереве нет.
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
      <DeepLinkListener />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <TrackRecorder />
      {/* Тосты в тёмной схеме WayBack: плитка #18241c с волосяной границей,
          как у остального контента. Светлые тосты на холсте #0b120d слепят. */}
      <Toaster
        position="top-center"
        theme="dark"
        richColors
        toastOptions={{
          style: {
            background: "#18241c",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#eaf2ea",
            borderRadius: "18px",
          },
        }}
      />
    </div>
  );
}
