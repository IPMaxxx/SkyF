"use client";

/**
 * «Вернуться к точке входа» — максимально простой трекер для леса.
 *
 * Якорь ставится одной геолокацией по кнопке «Я вошёл в лес». Пока страница
 * открыта, раз в ~1,5 минуты дописывается грубая точка пути (обычный
 * getCurrentPosition, без watchPosition и фоновых плагинов). Стрелка возврата
 * работает по компасу устройства, а без него — текстом со стороной света
 * и пунктиром на карте. Все данные живут в localStorage до кнопки «Я вышел».
 */

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Compass, Footprints, Loader2, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { getCurrentPosition, type Coords } from "@/lib/native/geolocation";
import { isNativeApp } from "@/lib/native/capacitor";
import {
  loadTrack,
  startTrack,
  appendPoint,
  clearTrack,
  haversineM,
  bearingDeg,
  compassDir,
  type ActiveTrack,
} from "@/lib/trackState";

/** Интервал грубой записи точек пути, пока страница открыта. */
const CAPTURE_INTERVAL_MS = 90_000;

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

  const [mounted, setMounted] = useState(false);
  const [track, setTrack] = useState<ActiveTrack | null>(null);
  const [current, setCurrent] = useState<Coords | null>(null);
  const [starting, setStarting] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);
  const [compassState, setCompassState] = useState<CompassState>("idle");
  const [, setTick] = useState(0);

  const capturing = useRef(false);
  const orientationHandler = useRef<((e: Event) => void) | null>(null);

  useEffect(() => {
    setTrack(loadTrack());
    setMounted(true);
  }, []);

  /** Одна грубая точка: обновляет «я здесь» и дописывает трек при сдвиге >30 м. */
  const capture = useCallback(async () => {
    if (capturing.current) return;
    capturing.current = true;
    try {
      const pos = await getCurrentPosition();
      setCurrent(pos);
      setTrack((prev) => (prev ? appendPoint(prev, pos) : prev));
    } catch {
      /* нет GPS в этот момент — просто пропускаем тик */
    } finally {
      capturing.current = false;
    }
  }, []);

  /** Пока поход активен: точка сразу, затем по таймеру + при возврате в приложение. */
  useEffect(() => {
    if (!track) return;

    void capture();
    const interval = setInterval(() => void capture(), CAPTURE_INTERVAL_MS);

    let removeListener: (() => void) | undefined;
    if (isNativeApp()) {
      void import("@capacitor/app").then(({ App }) =>
        App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) void capture();
        }).then((sub) => {
          removeListener = () => void sub.remove();
        }),
      );
    }

    return () => {
      clearInterval(interval);
      removeListener?.();
    };
    // Перезапускаем только при старте/завершении похода, не на каждую точку.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track === null, capture]);

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
      setTrack(startTrack(pos));
      setCurrent(pos);
    } catch {
      toast.error(t("geoError"));
    } finally {
      setStarting(false);
    }
  };

  const handleFinish = () => {
    clearTrack();
    setTrack(null);
    setCurrent(null);
    setConfirmFinish(false);
  };

  const formatDistance = (m: number) =>
    m < 1000 ? t("distM", { value: Math.round(m) }) : t("distKm", { value: (m / 1000).toFixed(1) });

  const distanceM = track && current ? haversineM(current, track.anchor) : null;
  const bearing = track && current ? bearingDeg(current, track.anchor) : null;
  const dirLabel = bearing != null ? t(`dir.${compassDir(bearing)}`) : null;
  const arrowDeg = bearing != null && heading != null ? bearing - heading : null;

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
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm sm:text-base text-muted-foreground">{t("subtitle")}</p>
      </div>

      {!track ? (
        /* ---------- Похода нет: старт ---------- */
        <div className="space-y-6">
          <button
            type="button"
            onClick={handleStart}
            disabled={starting}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-6 py-5 text-base sm:text-lg font-semibold text-white shadow-lg shadow-emerald-500/25 transition-colors hover:bg-emerald-600 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
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
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Compass className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              {t("howTitle")}
            </h2>
            <ol className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <li>1. {t("how1")}</li>
              <li>2. {t("how2")}</li>
              <li>3. {t("how3")}</li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground/80">{t("offlineHint")}</p>
          </div>
        </div>
      ) : (
        /* ---------- Активный поход ---------- */
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-2xl p-4">
              <p className="text-xs text-muted-foreground">{t("distanceLabel")}</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">
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
                <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-2 border-emerald-500/30 bg-emerald-500/5">
                  <div
                    className="transition-transform duration-300 ease-out"
                    style={{ transform: `rotate(${arrowDeg}deg)` }}
                    aria-hidden="true"
                  >
                    <Navigation className="h-16 w-16 fill-emerald-400 text-emerald-400" />
                  </div>
                </div>
                <p className="text-sm font-medium">
                  {distanceM != null && dirLabel
                    ? t("directionText", { dir: dirLabel, dist: formatDistance(distanceM) })
                    : "—"}
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

          <TrackMap anchor={track.anchor} points={track.points} current={current} />

          {/* Завершение похода */}
          {confirmFinish ? (
            <div className="glass rounded-2xl p-4">
              <p className="text-sm font-semibold">{t("finishConfirmTitle")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("finishConfirmBody")}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="flex-1 rounded-xl bg-red-500/85 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                >
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
