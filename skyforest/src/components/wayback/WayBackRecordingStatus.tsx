"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { openAppSettings } from "@/lib/track/backgroundWatch";
import {
  TRACK_WATCH_STATUS_EVENT,
  trackWatchStatus,
  type TrackWatchStatus,
} from "@/lib/trackRecorder";

/**
 * Строка состояния фоновой записи на экране похода.
 *
 * Тост человек пролистывает и забывает, а нам потом нечего спросить: телефон
 * с проблемой у него, а не у нас. Поэтому состояние видно в любой момент
 * похода, и код отказа службы можно скопировать и переслать — именно его
 * отсутствие дважды превращало разбор поломки в гадание.
 *
 * Формулировки продуктовые: человек читает «путь пишется и с погашенным
 * экраном» либо «пишется, пока приложение открыто», а код прячется в мелкую
 * строку под ними.
 */
export function WayBackRecordingStatus() {
  const t = useTranslations("wayback.active.recordingStatus");
  const [status, setStatus] = useState<TrackWatchStatus | null>(null);

  useEffect(() => {
    const read = () => setStatus(trackWatchStatus());
    read();
    window.addEventListener(TRACK_WATCH_STATUS_EVENT, read);
    return () => window.removeEventListener(TRACK_WATCH_STATUS_EVENT, read);
  }, []);

  // До первого чтения (сервер и первый кадр) не рисуем ничего: мигание
  // «выключена → включена» на старте похода пугало бы зря.
  if (!status?.hasTrack) return null;

  const notificationHidden = status.backgroundIssue === "notificationsBlocked";
  const on = status.background;
  const reason = reasonKey(status);

  return (
    <div className={cn("wb-tile flex flex-col gap-1 px-5 py-4")}>
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className={cn(
            "h-2.5 w-2.5 flex-none rounded-full",
            on && !notificationHidden
              ? "bg-wb-primary"
              : on
                ? "bg-wb-muted-2"
                : "bg-wb-danger",
          )}
        />
        <span className="text-[15px] font-bold text-wb-ink">
          {on ? t("on") : status.recording ? t("foregroundOnly") : t("off")}
        </span>
      </div>
      <p className="pl-[21px] text-[13.5px] leading-[1.5] text-wb-body">
        {t(reason)}
      </p>
      {status.backgroundDetail && (
        <button
          type="button"
          onClick={() => void copyDetail(status.backgroundDetail!, t("copied"))}
          className="wb-mono pl-[21px] text-left text-[11.5px] leading-[1.5] text-wb-muted-2 underline decoration-dotted underline-offset-2"
        >
          {status.backgroundDetail} · {t("copy")}
        </button>
      )}
      {(status.backgroundIssue === "locationDenied" ||
        status.backgroundIssue === "preciseLocation" ||
        notificationHidden) && (
        <button
          type="button"
          onClick={() => void openAppSettings()}
          className="pl-[21px] text-left text-[13px] font-extrabold text-wb-primary"
        >
          {t("settings")} →
        </button>
      )}
    </div>
  );
}

/** Одна причина — один текст; «включается…» до первой попытки. */
function reasonKey(status: TrackWatchStatus): string {
  if (status.background) {
    return status.backgroundIssue === "notificationsBlocked" ? "bodyNoNotice" : "bodyOn";
  }
  switch (status.backgroundIssue) {
    case "unsupported":
      return "bodyUnsupported";
    case "locationDenied":
      return "bodyLocationDenied";
    case "preciseLocation":
      return "bodyPrecise";
    case "locationOff":
      return "bodyLocationOff";
    case "failed":
      return "bodyFailed";
    default:
      return status.recording ? "bodyStarting" : "bodyNothing";
  }
}

async function copyDetail(detail: string, done: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(detail);
    toast.success(done, { id: "wb-recording-detail" });
  } catch {
    /* буфер обмена недоступен — строку всё равно видно и можно выделить */
  }
}
