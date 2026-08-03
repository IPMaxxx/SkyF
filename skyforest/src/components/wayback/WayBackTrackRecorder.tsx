"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { TrackRecorder } from "@/components/app/TrackRecorder";
import {
  BACKGROUND_NOTICE_BLOCKED_EVENT,
  openAppSettings,
} from "@/lib/track/backgroundWatch";
import { watchMessage, type WatchMessage } from "@/lib/track/watchMessage";
import { TRACK_WATCH_STATUS_EVENT, trackWatchStatus } from "@/lib/trackRecorder";
import { loadTrack, TRACK_STATE_EVENT } from "@/lib/trackState";

/** Сколько ждать после старта похода, прежде чем судить о состоянии записи. */
const SETTLE_MS = 4_000;

/**
 * Общий «магнитофон» похода с текстом постоянного уведомления из словаря
 * WayBack.
 *
 * Прослойка нужна из-за владения текстами: сам TrackRecorder общий для WayBack и
 * SkyForest и словарей приложений не знает, а фоновую запись без текста
 * уведомления включать нельзя — Android требует его для службы переднего плана.
 * Из фонового режима исходит только WayBack, поэтому строки живут в
 * wayback.{en,ru}.ts, а не в общих словарях.
 *
 * По той же причине здесь же живёт разговор о состоянии записи. Приложение
 * обязано сказать вслух, если путь не пишется или пишется только с открытым
 * экраном: иначе человек узнаёт об этом уже в лесу, когда путь понадобился.
 * Тосты показываются один раз за сеанс и только когда есть о чём сказать —
 * работающая запись молчит.
 */
export function WayBackTrackRecorder() {
  const t = useTranslations("wayback.active");
  const notice = useMemo(
    () => ({ title: t("bgNotice.title"), message: t("bgNotice.message") }),
    [t],
  );

  useEffect(() => {
    const onBlocked = () =>
      toast.warning(t("bgNotice.blockedTitle"), {
        // Постоянный id: служба поднимается заново после перезагрузки страницы
        // посреди похода, а второй такой же тост — уже придирка.
        id: "wb-bg-notice-blocked",
        description: t("bgNotice.blockedBody"),
        duration: 10_000,
        action: {
          label: t("bgNotice.blockedAction"),
          onClick: () => void openAppSettings(),
        },
      });
    window.addEventListener(BACKGROUND_NOTICE_BLOCKED_EVENT, onBlocked);
    return () => window.removeEventListener(BACKGROUND_NOTICE_BLOCKED_EVENT, onBlocked);
  }, [t]);

  const told = useRef<WatchMessage>("silent");
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const judge = () => {
      // Судим по итоговому состоянию, а не по снимку из события: источники
      // поднимаются асинхронно, и промежуточное «ещё ничего не работает» —
      // не новость.
      const status = trackWatchStatus();
      const message = watchMessage(status);
      if (message === "silent" || message === told.current) return;
      // Спокойное сообщение уже сказано, а стало хуже — сказать можно ещё раз.
      // Обратный переход молчит: человек и так знает, что фона нет.
      if (told.current === "notRecording") return;
      told.current = message;

      if (message === "notRecording") {
        toast.error(t("recordingIssue.offTitle"), {
          id: "wb-recording-off",
          description: t("recordingIssue.offBody"),
          duration: 12_000,
        });
        return;
      }

      const precise = status.backgroundIssue === "preciseLocation";
      const body =
        status.backgroundIssue === "unsupported"
          ? t("recordingIssue.updateBody")
          : precise
            ? t("recordingIssue.preciseBody")
            : t("recordingIssue.foregroundOnlyBody");
      toast.info(t("recordingIssue.foregroundOnlyTitle"), {
        id: "wb-recording-foreground",
        // Код отказа плагина дописываем как есть: без него причина остаётся
        // догадкой, а переслать строку человек может.
        description: status.backgroundDetail ? `${body} (${status.backgroundDetail})` : body,
        duration: 10_000,
        action: precise
          ? {
              label: t("recordingIssue.preciseAction"),
              onClick: () => void openAppSettings(),
            }
          : undefined,
      });
    };

    const recheck = () => {
      // Новый поход — новый разговор: сказанное про прошлый не в счёт.
      if (!loadTrack()) told.current = "silent";
      if (timer) clearTimeout(timer);
      timer = setTimeout(judge, SETTLE_MS);
    };
    window.addEventListener(TRACK_WATCH_STATUS_EVENT, recheck);
    window.addEventListener(TRACK_STATE_EVENT, recheck);
    recheck();
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(TRACK_WATCH_STATUS_EVENT, recheck);
      window.removeEventListener(TRACK_STATE_EVENT, recheck);
    };
  }, [t]);

  return <TrackRecorder notice={notice} />;
}
