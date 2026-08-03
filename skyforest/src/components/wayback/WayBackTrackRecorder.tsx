"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { TrackRecorder } from "@/components/app/TrackRecorder";
import {
  BACKGROUND_NOTICE_BLOCKED_EVENT,
  openAppSettings,
} from "@/lib/track/backgroundWatch";
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

  const told = useRef(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const judge = () => {
      // Судим по итоговому состоянию, а не по снимку из события: источники
      // поднимаются асинхронно, и промежуточное «ещё ничего не работает» —
      // не новость.
      if (!loadTrack() || told.current) return;
      const status = trackWatchStatus();
      if (!status.recording) {
        told.current = true;
        toast.error(t("recordingIssue.offTitle"), {
          id: "wb-recording-off",
          description: t("recordingIssue.offBody"),
          duration: 12_000,
        });
        return;
      }
      if (status.background || status.backgroundIssue == null) return;
      // Про запрет уведомлений уже сказано отдельным тостом со ссылкой в
      // настройки — второй раз о том же не говорим.
      if (status.backgroundIssue === "notificationsBlocked") return;
      told.current = true;
      toast.warning(t("recordingIssue.foregroundOnlyTitle"), {
        id: "wb-recording-foreground",
        description:
          status.backgroundIssue === "unsupported"
            ? t("recordingIssue.updateBody")
            : t("recordingIssue.foregroundOnlyBody"),
        duration: 10_000,
      });
    };

    const recheck = () => {
      // Новый поход — новый разговор: сказанное про прошлый не в счёт.
      if (!loadTrack()) told.current = false;
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
