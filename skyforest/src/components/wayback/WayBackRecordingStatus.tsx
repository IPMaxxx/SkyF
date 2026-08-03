"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { openAppSettings } from "@/lib/track/backgroundWatch";
import { recordingStatusView } from "@/lib/track/recordingStatusView";
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
 * Что именно показать, решает recordingStatusView: там же это и проверяется
 * без телефона, включая сборки, где нативной службы нет вовсе.
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

  const view = status ? recordingStatusView(status) : null;
  if (!status || !view) return null;

  const fixable =
    status.backgroundIssue === "locationDenied" ||
    status.backgroundIssue === "preciseLocation" ||
    status.backgroundIssue === "notificationsBlocked";

  return (
    <div className="wb-tile flex flex-col gap-1 px-5 py-4">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className={cn(
            "h-2.5 w-2.5 flex-none rounded-full",
            view.tone === "on"
              ? "bg-wb-primary"
              : view.tone === "calm"
                ? "bg-wb-muted-2"
                : "bg-wb-danger",
          )}
        />
        <span className="text-[15px] font-bold text-wb-ink">{t(view.title)}</span>
      </div>
      <p className="pl-[21px] text-[13.5px] leading-[1.5] text-wb-body">{t(view.body)}</p>
      {status.backgroundDetail && (
        <button
          type="button"
          onClick={() => void copyDetail(status.backgroundDetail!, t("copied"))}
          className="wb-mono pl-[21px] text-left text-[11.5px] leading-[1.5] text-wb-muted-2 underline decoration-dotted underline-offset-2"
        >
          {status.backgroundDetail} · {t("copy")}
        </button>
      )}
      {fixable && (
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

async function copyDetail(detail: string, done: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(detail);
    toast.success(done, { id: "wb-recording-detail" });
  } catch {
    /* буфер обмена недоступен — строку всё равно видно и можно выделить */
  }
}
