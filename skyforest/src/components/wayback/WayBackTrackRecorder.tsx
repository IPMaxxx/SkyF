"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { TrackRecorder } from "@/components/app/TrackRecorder";

/**
 * Общий «магнитофон» похода с текстом постоянного уведомления из словаря
 * WayBack.
 *
 * Прослойка нужна из-за владения текстами: сам TrackRecorder общий для WayBack и
 * SkyForest и словарей приложений не знает, а фоновую запись без текста
 * уведомления включать нельзя — Android требует его для службы переднего плана.
 * Из фонового режима исходит только WayBack, поэтому строки живут в
 * wayback.{en,ru}.ts, а не в общих словарях.
 */
export function WayBackTrackRecorder() {
  const t = useTranslations("wayback.active.bgNotice");
  const notice = useMemo(
    () => ({ title: t("title"), message: t("message") }),
    [t],
  );
  return <TrackRecorder notice={notice} />;
}
