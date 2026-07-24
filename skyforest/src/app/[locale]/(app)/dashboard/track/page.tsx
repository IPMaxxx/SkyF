"use client";

/**
 * «Вернуться к точке входа» — максимально простой трекер для леса.
 *
 * Якорь ставится одной геолокацией по кнопке «Я вошёл в лес». Точки пути
 * пишет глобальный TrackRecorder в (app)-layout: непрерывный watchPosition,
 * пока приложение активно, + мгновенный замер при возврате из фона;
 * страница лишь подписана на его события. Стрелка возврата работает по
 * компасу устройства, а без него — текстом со стороной света и пунктиром
 * на карте. Активный поход живёт в localStorage; по кнопке «Я вышел»
 * сохраняется в историю (Supabase, fallback — localStorage).
 */

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Compass, Footprints, Loader2, MapPin } from "lucide-react";
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
import { useUnits } from "@/lib/units";
import { TrackHistory } from "@/components/app/TrackHistory";
import { OfflineMapManager } from "@/components/app/OfflineMapManager";

const TrackMap = dynamic(
  () => import("@/components/app/TrackMap").then((m) => m.TrackMap),
  { ssr: false, loading: () => <MapFallback /> },
);

function MapFallback() {
  const tc = useTranslations("common");
  return (
    <div className="flex h-[320px] sm:h-[400px] items-center justify-center rounded-xl bg-muted">
      <p className="text-sm text-muted-foreground">{tc("loadingMap")}</p>
    </div>
  );
}

/**
 * Стрелка возврата: наконечник строго вверх (0° = север/«прямо»), в отличие
 * от иконки Navigation у Lucide, которая смотрит в верхний правый угол и даёт
 * визуальный сдвиг. Крутится через CSS-rotate родителя.
 */
function ReturnArrow() {
  return (
    <svg viewBox="0 0 24 24" className="h-16 w-16 text-primary-light" aria-hidden="true">
      <path d="M12 2 L20 20 L12 15.5 L4 20 Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

/** Курс движения считаем «протухшим», если давно не было пригодного замера. */
const COURSE_STALE_MS = 20_000;

type CompassState = "idle" | "pending" | "on" | "unavailable";

/** iOS 13+: запрос доступа к датчикам ориентации только из жеста пользователя. */
type OrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

type OrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

export default function TrackPage() {
  const t = useTranslations("track");
  const locale = useLocale();
  const units = useUnits();

  const [mounted, setMounted] = useState(false);
  const [track, setTrack] = useState<ActiveTrack | null>(null);
  const [current, setCurrent] = useState<(Coords & { t: number }) | null>(null);
  const [starting, setStarting] = useState(false);
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
      const { track: next, position } = (e as CustomEvent<TrackCaptureDetail>).detail;
      const now = Date.now();
      setTrack(next);
      setCurrent({ ...position, t: now });

      // Курс движения по GPS: копим последние позиции и считаем азимут по
      // реальному смещению (см. courseOverGround). Это направление в той же
      // системе отсчёта, что и азимут на якорь, — надёжнее магнитометра.
      const buf = samplesRef.current;
      buf.push({ lat: position.lat, lng: position.lng, t: now });
      const cutoff = now - MAX_COURSE_AGE_MS;
      while (buf.length > 40 || (buf.length > 2 && buf[0].t < cutoff)) buf.shift();

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
        window.removeEventListener("deviceorientation", orientationHandler.current);
        window.removeEventListener("deviceorientationabsolute", orientationHandler.current);
      }
    };
  }, []);

  const enableCompass = async () => {
    if (compassState === "on" || compassState === "pending") return;
    setCompassState("pending");

    try {
      const requestPermission = (
        window.DeviceOrientationEvent as OrientationEventWithPermission | undefined
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
  };

  const handleStart = async () => {
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
      toast.error(t("geoError"));
    } finally {
      setStarting(false);
    }
  };

  const handleFinish = async () => {
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
  };

  const formatDistance = units.fmtDistanceM;

  const distanceM = track && current ? haversineM(current, track.anchor) : null;
  const bearing = track && current ? bearingDeg(current, track.anchor) : null;
  const dirLabel = bearing != null ? t(`dir.${compassDir(bearing)}`) : null;
  // Направление отсчёта стрелки: курс движения по GPS в приоритете (обе
  // величины в одной системе отсчёта), магнитометр — запасной для стоящего.
  const refHeading = course != null ? course : heading;
  const usingCourse = course != null;
  const arrowDeg = bearing != null && refHeading != null ? bearing - refHeading : null;

  const durationLabel = (() => {
    if (!track) return null;
    const totalMin = Math.max(0, Math.floor((Date.now() - track.startedAt) / 60_000));
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}:${String(m).padStart(2, "0")}`;
  })();

  if (!mounted) {
    return (
      <div className="mx-auto flex max-w-4xl justify-center px-4 py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="font-heading text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm sm:text-base text-muted-foreground">{t("subtitle")}</p>
      </div>

      {!track ? (
        /* ---------- Похода нет: старт ---------- */
        <div className="space-y-6">
          <button
            type="button"
            onClick={handleStart}
            disabled={starting}
            className="btn-primary flex w-full items-center justify-center gap-3 rounded-[16px] px-6 py-5 text-base sm:text-lg disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
          >
            {starting ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                {t("starting")}
              </>
            ) : (
              <>
                <Footprints className="h-6 w-6" aria-hidden="true" />
                {t("startButton")}
              </>
            )}
          </button>

          <div className="glass rounded-2xl p-5">
            <h2 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold">
              <Compass className="h-4 w-4 text-primary-light" aria-hidden="true" />
              {t("howTitle")}
            </h2>
            <ol className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <li>1. {t("how1")}</li>
              <li>2. {t("how2")}</li>
              <li>3. {t("how3")}</li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground/80">{t("offlineHint")}</p>
          </div>

          <OfflineMapManager center={current} />

          <TrackHistory />
        </div>
      ) : (
        /* ---------- Активный поход ---------- */
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-2xl p-4">
              <p className="text-xs text-muted-foreground">{t("distanceLabel")}</p>
              <p className="mt-1 font-heading text-2xl font-extrabold text-primary-light">
                {distanceM != null ? formatDistance(distanceM) : "—"}
              </p>
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-xs text-muted-foreground">{t("durationLabel")}</p>
              <p className="mt-1 text-2xl font-bold">{durationLabel}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                {t("activeSince", {
                  time: new Date(track.startedAt).toLocaleTimeString(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })}
              </p>
            </div>
          </div>

          {/* Компас возврата */}
          <div className="glass flex flex-col items-center gap-3 rounded-2xl p-5">
            {arrowDeg != null ? (
              <>
                <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5">
                  <div
                    className="transition-transform duration-300 ease-out"
                    style={{ transform: `rotate(${arrowDeg}deg)` }}
                  >
                    <ReturnArrow />
                  </div>
                </div>
                <p className="text-sm font-medium">
                  {distanceM != null && dirLabel
                    ? t("directionText", { dir: dirLabel, dist: formatDistance(distanceM) })
                    : "—"}
                </p>
                <p className="text-center text-xs text-muted-foreground">
                  {usingCourse ? t("courseHint") : t("compassHint")}
                </p>
              </>
            ) : (
              <>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  {distanceM != null && dirLabel
                    ? t("directionText", { dir: dirLabel, dist: formatDistance(distanceM) })
                    : t("waitingGps")}
                </p>
                {distanceM != null && (
                  <p className="text-center text-xs text-muted-foreground">{t("moveToDetect")}</p>
                )}
                {compassState === "unavailable" ? (
                  <p className="text-center text-xs text-muted-foreground">
                    {t("compassUnavailable")}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={enableCompass}
                    disabled={compassState === "pending"}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    {compassState === "pending" ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Compass className="h-4 w-4" aria-hidden="true" />
                    )}
                    {t("compassEnable")}
                  </button>
                )}
              </>
            )}
          </div>

          <div>
            <TrackMap anchor={track.anchor} points={track.points} current={current} course={course} />
            {usingCourse && (
              <p className="mt-2 text-[11px] text-muted-foreground/70">{t("movementLegend")}</p>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground/70">{t("gapHint")}</p>
          </div>

          <OfflineMapManager center={track.anchor} />

          {/* Завершение похода */}
          {confirmFinish ? (
            <div className="glass rounded-2xl p-4">
              <p className="text-sm font-semibold">{t("finishConfirmTitle")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("finishConfirmBody")}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleFinish()}
                  disabled={finishing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500/85 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                >
                  {finishing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {t("finishConfirmYes")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmFinish(false)}
                  className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
                >
                  {t("finishCancel")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmFinish(true)}
              className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-3.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              {t("finishButton")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
