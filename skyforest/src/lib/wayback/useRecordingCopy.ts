"use client";

/**
 * Ключи текстов о записи пути для текущей сборки.
 *
 * Спрашивает у оболочки, есть ли своя служба переднего плана, ровно тем же
 * способом, которым это выясняет сама запись (`foregroundService`): там же
 * лежит и кеш находки, поэтому повторного разговора с мостом не будет.
 *
 * Первый ответ — нейтральные ключи: пока мост молчит, обещать запись с
 * погашенным экраном нельзя. Почему это важно — в lib/wayback/recordingCopy.
 */

import { useEffect, useState } from "react";
import { foregroundService } from "@/lib/track/foregroundService";
import {
  backgroundSupportFrom,
  recordingCopy,
  type BackgroundSupport,
  type RecordingCopyKeys,
} from "@/lib/wayback/recordingCopy";

export function useRecordingCopy(): RecordingCopyKeys {
  const [support, setSupport] = useState<BackgroundSupport>("unknown");

  useEffect(() => {
    let alive = true;
    void foregroundService().then((service) => {
      if (alive) setSupport(backgroundSupportFrom(service));
    });
    return () => {
      alive = false;
    };
  }, []);

  return recordingCopy(support);
}
