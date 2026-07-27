"use client";

/**
 * Логика экрана похода, общая для тёмного экрана SkyForest и светлого
 * редизайна WayBack.
 *
 * Здесь живёт всё, что нельзя дублировать между вёрстками: активный поход,
 * приоритет источников направления (курс GPS → магнитометр → текст),
 * подписка на глобальный TrackRecorder и завершение похода. Вёрстки
 * различаются полностью, поведение — нет.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { getCurrentPosition, type Coords } from "@/lib/native/geolocation";
import {
  captureTrackPoint,
  TRACK_CAPTURE_EVENT,
  type TrackCaptureDetail,
} from "@/lib/trackRecorder";
import {
  loadTrack,
  startTrack,
  clearTrack,
  hydrateTrackFromNative,
  haversineM,
  bearingDeg,
  compassDir,
  courseOverGround,
  smoothAngle,
  MAX_COURSE_AGE_MS,
  type ActiveTrack,
} from "@/lib/trackState";
import { saveFinishedTrack } from "@/lib/trackHistory";

/** Курс движения считаем «протухшим», если давно не было пригодного замера. */
const COURSE_STALE_MS = 20_000;

export type CompassState = "idle" | "pending" | "on" | "unavailable";

/** iOS 13+: запрос доступа к датчикам ориентации только из жеста пользователя. */
type OrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

type OrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

export interface TrackController {
  mounted: boolean;
  track: ActiveTrack | null;
  current: (Coords & { t: number }) | null;
  starting: boolean;
  picking: boolean;
  setPicking: (v: boolean) => void;
  finishing: boolean;
  confirmFinish: boolean;
  setConfirmFinish: (v: boolean) => void;
  compassState: CompassState;
  enableCompass: () => Promise<void>;
  course: number | null;
  /** true — стрелка считается от курса GPS, false — от магнитометра. */
  usingCourse: boolean;
  /** Метры до якоря; null — позиции ещё нет. */
  distanceM: number | null;
  /** Локализованная сторона света до якоря. */
  dirLabel: string | null;
  /** Поворот стрелки в градусах; null — направление не определено. */
  arrowDeg: number | null;
  /** «1:24» — время в лесу. */
  durationLabel: string | null;
  handleStart: () => Promise<void>;
  handleStartFromPicked: (pos: Coords) => void;
  handleFinish: () => Promise<void>;
}

export function useTrackController(): TrackController {
  const t = useTranslations("track");
  const locale = useLocale();

  const [mounted, setMounted] = useState(false);
  const [track, setTrack] = useState<ActiveTrack | null>(null);
  const [current, setCurrent] = useState<(Coords & { t: number }) | null>(null);
  const [starting, setStarting] = useState(false);
  /** Ручной выбор точки входа на карте (фолбэк, когда GPS недоступен). */
  const [picking, setPicking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);
  const [compassState, setCompassState] = useState<CompassState>("idle");
  /** Курс движения по GPS (course over ground). Основной источник направления. */
  const [course, setCourse] = useState<number | null>(null);
  const [, setTick] = useState(0);

  const orientationHandler = useRef<((e: Event) => void) | null>(null);
  /** Буфер последних позиций для расчёта курса движения. */
  const samplesRef = useRef<{ lat: number; lng: number; t: number }[]>([]);
  /** Время последнего пригодного курса — чтобы «протухший» сбросить в null. */
  const lastCourseAtRef = useRef(0);

  useEffect(() => {
    const local = loadTrack();
    setTrack(local);
    setMounted(true);
    // Похода нет локально, но он мог быть начат в офлайн-экране (Preferences) —
    // подхватываем, чтобы точка входа не потерялась при заходе в приложение.
    if (!local) {
      void hydrateTrackFromNative().then((restored) => {
        if (restored) setTrack(restored);
      });
    }
  }, []);

  /**
   * Живое состояние похода: каждый удачный замер глобального TrackRecorder
   * (тик таймера, возврат вкладки/приложения) приходит событием и сразу
   * обновляет «я здесь» и линию пути на карте.
   */
  useEffect(() => {
    const onCapture = (e: Event) => {
      const { track: next, position } = (e as CustomEvent<TrackCaptureDetail>)
        .detail;
      const now = Date.now();
      setTrack(next);
      setCurrent({ ...position, t: now });

      // Курс движения по GPS: копим последние позиции и считаем азимут по
      // реальному смещению (см. courseOverGround). Это направление в той же
      // системе отсчёта, что и азимут на якорь, — надёжнее магнитометра.
      const buf = samplesRef.current;
      buf.push({ lat: position.lat, lng: position.lng, t: now });
      const cutoff = now - MAX_COURSE_AGE_MS;
      while (buf.length > 40 || (buf.length > 2 && buf[0].t < cutoff)) {
        buf.shift();
      }

      const cog = courseOverGround(buf);
      if (cog != null) {
        lastCourseAtRef.current = now;
        setCourse((prev) => smoothAngle(prev, cog));
      } else if (now - lastCourseAtRef.current > COURSE_STALE_MS) {
        // Долго стоим на месте — курс не определён, уступаем компасу/тексту.
        setCourse(null);
      }
    };
    window.addEventListener(TRACK_CAPTURE_EVENT, onCapture);
    return () => window.removeEventListener(TRACK_CAPTURE_EVENT, onCapture);
  }, []);

  /**
   * Внеочередной замер при каждом открытии страницы трека (маунт при
   * клиентской навигации), чтобы позиция и карта обновились мгновенно,
   * не дожидаясь тика таймера. Гонок нет: guard capturing общий в recorder.
   */
  useEffect(() => {
    if (!track) return;
    void captureTrackPoint();
    // Только при старте/завершении похода, не на каждую точку.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track === null]);

  /** Тикер для строки «в пути HH:MM». */
  useEffect(() => {
    if (!track) return;
    const id = setInterval(() => setTick((v) => v + 1), 30_000);
    return () => clearInterval(id);
  }, [track]);

  useEffect(() => {
    return () => {
      if (orientationHandler.current) {
        window.removeEventListener(
          "deviceorientation",
          orientationHandler.current,
        );
        window.removeEventListener(
          "deviceorientationabsolute",
          orientationHandler.current,
        );
      }
    };
  }, []);

  const enableCompass = useCallback(async () => {
    if (compassState === "on" || compassState === "pending") return;
    setCompassState("pending");

    try {
      const requestPermission = (
        window.DeviceOrientationEvent as
          | OrientationEventWithPermission
          | undefined
      )?.requestPermission;
      if (typeof requestPermission === "function") {
        const result = await requestPermission();
        if (result !== "granted") {
          setCompassState("unavailable");
          return;
        }
      }
    } catch {
      setCompassState("unavailable");
      return;
    }

    const handler = (e: Event) => {
      const ev = e as OrientationEvent;
      // iOS отдаёт готовый компасный курс; Android — absolute alpha (0 = север,
      // против часовой), поэтому переводим в курс по часовой: 360 - alpha.
      const h =
        typeof ev.webkitCompassHeading === "number"
          ? ev.webkitCompassHeading
          : ev.absolute && ev.alpha != null
            ? (360 - ev.alpha) % 360
            : null;
      if (h != null && !Number.isNaN(h)) {
        setHeading(h);
        setCompassState("on");
      }
    };
    orientationHandler.current = handler;
    window.addEventListener("deviceorientationabsolute", handler);
    window.addEventListener("deviceorientation", handler);

    // Если за 5 секунд не пришло ни одного пригодного показания — датчика нет.
    setTimeout(() => {
      setCompassState((cur) => (cur === "pending" ? "unavailable" : cur));
    }, 5000);
  }, [compassState]);

  const handleStart = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    try {
      const pos = await getCurrentPosition();
      samplesRef.current = [];
      lastCourseAtRef.current = 0;
      setCourse(null);
      setTrack(startTrack(pos));
      setCurrent({ ...pos, t: Date.now() });
    } catch {
      // GPS не дался — предлагаем поставить точку входа вручную.
      toast.error(t("geoErrorPick"));
      setPicking(true);
    } finally {
      setStarting(false);
    }
  }, [starting, t]);

  /** Старт от точки, выбранной вручную. Текущую позицию не подменяем — её принесёт GPS. */
  const handleStartFromPicked = useCallback((pos: Coords) => {
    samplesRef.current = [];
    lastCourseAtRef.current = 0;
    setCourse(null);
    setTrack(startTrack(pos));
    setPicking(false);
  }, []);

  const handleFinish = useCallback(async () => {
    if (!track || finishing) return;
    setFinishing(true);
    try {
      const name = t("autoName", {
        date: new Date(track.startedAt).toLocaleString(locale, {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
      const saved = await saveFinishedTrack(track, name);
      toast.success(saved.local ? t("savedLocalToast") : t("savedToast"));
    } finally {
      clearTrack();
      setTrack(null);
      setCurrent(null);
      samplesRef.current = [];
      lastCourseAtRef.current = 0;
      setCourse(null);
      setConfirmFinish(false);
      setFinishing(false);
    }
  }, [track, finishing, t, locale]);

  const distanceM = track && current ? haversineM(current, track.anchor) : null;
  const bearing = track && current ? bearingDeg(current, track.anchor) : null;
  const dirLabel = bearing != null ? t(`dir.${compassDir(bearing)}`) : null;
  // Направление отсчёта стрелки: курс движения по GPS в приоритете (обе
  // величины в одной системе отсчёта), магнитометр — запасной для стоящего.
  const refHeading = course != null ? course : heading;
  const usingCourse = course != null;
  const arrowDeg =
    bearing != null && refHeading != null ? bearing - refHeading : null;

  const durationLabel = (() => {
    if (!track) return null;
    const totalMin = Math.max(
      0,
      Math.floor((Date.now() - track.startedAt) / 60_000),
    );
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}:${String(m).padStart(2, "0")}`;
  })();

  return {
    mounted,
    track,
    current,
    starting,
    picking,
    setPicking,
    finishing,
    confirmFinish,
    setConfirmFinish,
    compassState,
    enableCompass,
    course,
    usingCourse,
    distanceM,
    dirLabel,
    arrowDeg,
    durationLabel,
    handleStart,
    handleStartFromPicked,
    handleFinish,
  };
}
