"use client";

/**
 * Тёмный экран похода SkyForest — вёрстка без изменений с момента, когда
 * трек был частью основного кабинета. Логика вынесена в useTrackController
 * и общая со светлым редизайном WayBack.
 */

import dynamic from "next/dynamic";
import { Compass, Footprints, Loader2, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useUnits } from "@/lib/units";
import type { TrackController } from "@/lib/track/useTrackController";
import { TrackHistory } from "@/components/app/TrackHistory";
import { OfflineMapManager } from "@/components/app/OfflineMapManager";

const TrackMap = dynamic(
  () => import("@/components/app/TrackMap").then((m) => m.TrackMap),
  { ssr: false, loading: () => <MapFallback /> },
);

const StartPointPicker = dynamic(
  () =>
    import("@/components/app/StartPointPicker").then((m) => m.StartPointPicker),
  { ssr: false, loading: () => <MapFallback /> },
);

function MapFallback() {
  const tc = useTranslations("common");
  return (
    <div className="flex h-[320px] items-center justify-center rounded-xl bg-muted sm:h-[400px]">
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
    <svg
      viewBox="0 0 24 24"
      className="h-16 w-16 text-primary-light"
      aria-hidden="true"
    >
      <path
        d="M12 2 L20 20 L12 15.5 L4 20 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClassicTrackScreen({ c }: { c: TrackController }) {
  const t = useTranslations("track");
  const locale = useLocale();
  const units = useUnits();
  const formatDistance = units.fmtDistanceM;

  if (!c.mounted) {
    return (
      <div className="mx-auto flex max-w-4xl justify-center px-4 py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="font-heading text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          {t("subtitle")}
        </p>
      </div>

      {!c.track ? (
        /* ---------- Похода нет: старт ---------- */
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => void c.handleStart()}
            disabled={c.starting}
            className="btn-primary flex w-full items-center justify-center gap-3 rounded-[16px] px-6 py-5 text-base disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light sm:text-lg"
          >
            {c.starting ? (
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

          {/* Ручная точка входа: фолбэк для случаев без GPS-фикса */}
          {c.picking ? (
            <StartPointPicker
              center={c.current}
              onConfirm={c.handleStartFromPicked}
              onCancel={() => c.setPicking(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => c.setPicking(true)}
              className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-border bg-transparent px-6 py-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {t("pickOnMap")}
            </button>
          )}

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
            <p className="mt-3 text-xs text-muted-foreground/80">
              {t("offlineHint")}
            </p>
          </div>

          <OfflineMapManager center={c.current} />

          <TrackHistory />
        </div>
      ) : (
        /* ---------- Активный поход ---------- */
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-2xl p-4">
              <p className="text-xs text-muted-foreground">
                {t("distanceLabel")}
              </p>
              <p className="mt-1 font-heading text-2xl font-extrabold text-primary-light">
                {c.distanceM != null ? formatDistance(c.distanceM) : "—"}
              </p>
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="text-xs text-muted-foreground">
                {t("durationLabel")}
              </p>
              <p className="mt-1 text-2xl font-bold">{c.durationLabel}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                {t("activeSince", {
                  time: new Date(c.track.startedAt).toLocaleTimeString(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })}
              </p>
            </div>
          </div>

          {/* Компас возврата */}
          <div className="glass flex flex-col items-center gap-3 rounded-2xl p-5">
            {c.arrowDeg != null ? (
              <>
                <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5">
                  <div
                    className="transition-transform duration-300 ease-out"
                    style={{ transform: `rotate(${c.arrowDeg}deg)` }}
                  >
                    <ReturnArrow />
                  </div>
                </div>
                <p className="text-sm font-medium">
                  {c.distanceM != null && c.dirLabel
                    ? t("directionText", {
                        dir: c.dirLabel,
                        dist: formatDistance(c.distanceM),
                      })
                    : "—"}
                </p>
                <p className="text-center text-xs text-muted-foreground">
                  {c.usingCourse ? t("courseHint") : t("compassHint")}
                </p>
              </>
            ) : (
              <>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  {c.distanceM != null && c.dirLabel
                    ? t("directionText", {
                        dir: c.dirLabel,
                        dist: formatDistance(c.distanceM),
                      })
                    : t("waitingGps")}
                </p>
                {c.distanceM != null && (
                  <p className="text-center text-xs text-muted-foreground">
                    {t("moveToDetect")}
                  </p>
                )}
                {c.compassState === "unavailable" ? (
                  <p className="text-center text-xs text-muted-foreground">
                    {t("compassUnavailable")}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => void c.enableCompass()}
                    disabled={c.compassState === "pending"}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    {c.compassState === "pending" ? (
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
            <TrackMap
              anchor={c.track.anchor}
              points={c.track.points}
              current={c.current}
              course={c.course}
            />
            {c.usingCourse && (
              <p className="mt-2 text-[11px] text-muted-foreground/70">
                {t("movementLegend")}
              </p>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              {t("gapHint")}
            </p>
          </div>

          <OfflineMapManager center={c.track.anchor} />

          {/* Завершение похода */}
          {c.confirmFinish ? (
            <div className="glass rounded-2xl p-4">
              <p className="text-sm font-semibold">{t("finishConfirmTitle")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("finishConfirmBody")}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void c.handleFinish()}
                  disabled={c.finishing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500/85 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                >
                  {c.finishing && (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  {t("finishConfirmYes")}
                </button>
                <button
                  type="button"
                  onClick={() => c.setConfirmFinish(false)}
                  className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
                >
                  {t("finishCancel")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => c.setConfirmFinish(true)}
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
