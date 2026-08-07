"use client";

/**
 * Журнал записи пути — то, что человек присылает нам, когда запись ведёт себя
 * не так.
 *
 * Спрятан за строкой версий внизу меню «Ещё»: обычному человеку он не нужен и
 * на глаза не попадается, а объяснить путь словами можно за одну фразу.
 * Содержимое намеренно не переведено — это техническая выписка, и читаем её мы,
 * а не человек; переведены только подписи вокруг.
 */

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { formatNativeBuild, nativeBuild } from "@/lib/native/appBuild";
import { backgroundWatchState } from "@/lib/track/backgroundWatch";
import { clearTrackLog, formatTrackLog, readTrackLog } from "@/lib/track/trackLog";
import { trackWatchStatus } from "@/lib/trackRecorder";

export function WayBackDiagnostics({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Панель — отдельный компонент, живущий только пока открыта: так выписка
  // собирается заново на каждое открытие, а её первое состояние берётся прямо
  // при отрисовке, без ожиданий.
  return open ? <DiagnosticsSheet onClose={onClose} /> : null;
}

function DiagnosticsSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations("wayback.diagnostics");
  // Сразу то, что уже лежит в хранилище. Панель однажды показала «записей пока
  // нет» при полном журнале: текст собирался после двух нативных запросов, один
  // из них не ответил, и человек увидел пустоту вместо тех самых строк, ради
  // которых журнал и заводился. Ответ на «что случилось» не имеет права
  // зависеть от того, отвечает ли мост.
  const [text, setText] = useState(() => formatTrackLog(header(null, null, false), readTrackLog()));

  useEffect(() => {
    let alive = true;
    // Дальше — то, что можно узнать только у оболочки: версия сборки и
    // состояние службы прямо сейчас, включая точность выданной геолокации.
    // Дополняют выписку, но не задерживают её.
    void Promise.allSettled([nativeBuild(), backgroundWatchState()]).then(([build, state]) => {
      if (!alive) return;
      const info = build.status === "fulfilled" ? build.value : null;
      const native = state.status === "fulfilled" ? state.value : null;
      setText(formatTrackLog(header(formatNativeBuild(info), native, true), readTrackLog()));
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-[1290] bg-black/45" onClick={onClose} aria-hidden="true" />
      {/* Выше нижнего меню (z-1250), иначе оно перекрывает кнопки: на скриншоте
          от человека «Скопировать» пряталась за вкладками, виден был только
          верхний край. Панель модальная, вкладки под ней и не нужны. */}
      <div className="fixed inset-x-0 bottom-0 z-[1291] flex max-h-[85vh] flex-col gap-3 rounded-t-[26px] bg-wb-surface px-5 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-5">
        <div className="flex items-center justify-between">
          <span className="text-[17px] font-extrabold text-wb-ink">{t("title")}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-wb-surface-2 text-wb-muted-2"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <p className="text-[13.5px] leading-[1.5] text-wb-body">{t("hint")}</p>
        <pre className="wb-mono min-h-[120px] flex-1 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-wb-surface-2 p-3 text-[11px] leading-[1.45] text-wb-muted-2">
          {text || t("empty")}
        </pre>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void copy(text, t("copied"))}
            className="flex-1 rounded-2xl bg-wb-primary py-[15px] text-[15px] font-extrabold text-wb-on-primary"
          >
            {t("copy")}
          </button>
          <button
            type="button"
            onClick={() => {
              clearTrackLog();
              setText(formatTrackLog(header(null, null, false), []));
            }}
            className="rounded-2xl bg-wb-surface-2 px-5 py-[15px] text-[15px] font-extrabold text-wb-muted-2"
          >
            {t("clear")}
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * Шапка выписки: без неё строчки журнала не с чем соотнести.
 *
 * `asked` отличает «спросили оболочку, и там ничего нет» от «ещё не спросили».
 * Разница не косметическая: первая же выписка, которую прислал человек,
 * говорила «нативной части нет» просто потому, что ответы ещё не приехали, —
 * и увела разбор в сторону на добрых полчаса.
 */
function header(
  shell: string | null,
  native: { running: boolean; location: boolean; precise: boolean; notifications: boolean } | null,
  asked: boolean,
): string[] {
  const status = trackWatchStatus();
  return [
    `web ${process.env.NEXT_PUBLIC_APP_VERSION} · app ${shell ?? (asked ? "browser" : "asking…")}`,
    `now ${new Date().toISOString()}`,
    `track=${status.hasTrack} recording=${status.recording} plain=${status.plain} background=${status.background}`,
    `starting=${status.backgroundStarting} issue=${status.backgroundIssue ?? "-"} detail=${status.backgroundDetail ?? "-"}`,
    native
      ? `service running=${native.running} location=${native.location} precise=${native.precise} notifications=${native.notifications}`
      : asked
        ? "service absent (no native part in this build)"
        : "service — asking the shell…",
    `ua ${typeof navigator === "undefined" ? "-" : navigator.userAgent}`,
  ];
}

async function copy(text: string, done: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done, { id: "wb-diagnostics" });
  } catch {
    /* буфер обмена недоступен — текст видно и можно выделить руками */
  }
}
