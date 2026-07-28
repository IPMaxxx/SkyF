"use client";

/**
 * Офлайн-карта WayBack — отдельный экран (в дизайне это не блок на главной).
 *
 * Логика скачивания та же, что в OfflineMapManager: два слоя (тропы +
 * спутник), честная оценка объёма до старта и возможность отмены. Оценку
 * и отмену убирать нельзя — люди качают карты в роуминге и на мобильном
 * трафике, и это единственное место, где видно реальную цену загрузки.
 *
 * Входов в загрузку два: привычный «радиус × детализация» здесь и выбор области
 * прямо на карте (WayBackAreaPicker) — он открывается поверх этого экрана.
 */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { getCurrentPosition } from "@/lib/native/geolocation";
import {
  OUTDOOR_SOURCE,
  SATELLITE_SOURCE,
  bboxAround,
  countTilesForBbox,
  deleteRegion,
  downloadRegion,
  listRegions,
  type DownloadProgress,
  type DownloadedRegion,
} from "@/lib/offline/tileStore";
import {
  AVG_OUTDOOR_TILE_BYTES,
  AVG_SATELLITE_TILE_BYTES,
  formatBytes,
} from "@/lib/wayback/offlineArea";
import type { Coords } from "@/lib/native/geolocation";
import {
  WbLabel,
  WbPrimaryButton,
  WbRowTile,
  WbSegmented,
  WbTile,
  WbTopBar,
} from "@/components/wayback/primitives";

const DOWNLOAD_MIN_ZOOM = 9;

const RADIUS_OPTIONS = [10, 25, 50] as const;

const QUALITY_OPTIONS = [
  { id: "base", maxZoom: 13, labelKey: "detailBasic", hintKey: "detailBasicHint" },
  { id: "medium", maxZoom: 15, labelKey: "detailMedium", hintKey: "detailMediumHint" },
  { id: "max", maxZoom: 16, labelKey: "detailMax", hintKey: "detailMaxHint" },
] as const;

type QualityId = (typeof QUALITY_OPTIONS)[number]["id"];

const RegionPreview = dynamic(
  () => import("@/components/app/RegionPreview").then((m) => m.RegionPreview),
  { ssr: false },
);

/** Выбор области на карте — тяжёлая карта, поэтому только по требованию. */
const WayBackAreaPicker = dynamic(
  () =>
    import("@/components/wayback/WayBackAreaPicker").then(
      (m) => m.WayBackAreaPicker,
    ),
  { ssr: false },
);

export function WayBackOfflineScreen({
  center,
  areaView,
  onBack,
  onRegionsChange,
}: {
  center?: { lat: number; lng: number } | null;
  /** Экран открыт кнопкой на карте главной — сразу показываем выбор области. */
  areaView?: { center: Coords; zoom: number } | null;
  onBack: () => void;
  onRegionsChange?: (count: number) => void;
}) {
  const t = useTranslations("wayback.offline");

  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(
    center ?? null,
  );
  const [locating, setLocating] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [quality, setQuality] = useState<QualityId>("base");
  const [regions, setRegions] = useState<DownloadedRegion[]>([]);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<DownloadedRegion | null>(null);
  const [areaOpen, setAreaOpen] = useState(Boolean(areaView));
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (center) setOrigin(center);
  }, [center]);

  /**
   * Экран открыт сразу с выбором области (кнопка на карте главной) — своей
   * записи в истории он не занимает: «назад» в этом случае должен возвращать
   * на главную, откуда человек и пришёл.
   */
  const autoOpened = useRef(Boolean(areaView));

  // Своя запись в истории: системная кнопка «назад» закрывает выбор области,
  // а не весь экран офлайн-карты.
  useEffect(() => {
    if (!areaOpen) return;
    if (autoOpened.current) {
      autoOpened.current = false;
      return;
    }
    window.history.pushState({ wbArea: true }, "");
    const onPop = () => setAreaOpen(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [areaOpen]);

  const closeArea = () => {
    if (window.history.state?.wbArea) window.history.back();
    else setAreaOpen(false);
  };

  const refreshRegions = useCallback(() => {
    void listRegions().then((list) => {
      setRegions(list);
      onRegionsChange?.(list.length);
    });
  }, [onRegionsChange]);

  useEffect(() => {
    refreshRegions();
  }, [refreshRegions]);

  const qualityOption =
    QUALITY_OPTIONS.find((q) => q.id === quality) ?? QUALITY_OPTIONS[0];
  // Регион качается в двух слоях (тропы + спутник) — тайлов вдвое больше.
  const tilesPerLayer = origin
    ? countTilesForBbox(
        bboxAround(origin.lat, origin.lng, radiusKm),
        DOWNLOAD_MIN_ZOOM,
        qualityOption.maxZoom,
      )
    : 0;
  const estimateTiles = tilesPerLayer * 2;
  const estimateBytes =
    tilesPerLayer * (AVG_OUTDOOR_TILE_BYTES + AVG_SATELLITE_TILE_BYTES);
  const estimateSize = formatBytes(estimateBytes);

  const useMyLocation = async () => {
    setLocating(true);
    try {
      setOrigin(await getCurrentPosition());
    } catch {
      toast.error(t("errorToast"));
    } finally {
      setLocating(false);
    }
  };

  const handleDownload = async () => {
    if (!origin || progress) return;
    const controller = new AbortController();
    abortRef.current = controller;
    let failed = 0;
    setProgress({ done: 0, total: estimateTiles, failed: 0, bytes: 0 });
    try {
      await downloadRegion(
        {
          name: t("regionMeta", {
            radius: radiusKm,
            quality: t(qualityOption.labelKey).toLowerCase(),
            date: new Date().toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
            }),
          }),
          sources: [OUTDOOR_SOURCE, SATELLITE_SOURCE],
          bbox: bboxAround(origin.lat, origin.lng, radiusKm),
          minZoom: DOWNLOAD_MIN_ZOOM,
          maxZoom: qualityOption.maxZoom,
          center: origin,
          radiusKm,
        },
        (p) => {
          failed = p.failed;
          setProgress(p);
        },
        controller.signal,
      );
      toast.success(
        failed > 0 ? t("partialToast", { failed }) : t("savedToast"),
      );
      refreshRegions();
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        toast.error(t("errorToast"));
      }
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteRegion(id);
      toast.success(t("deleted"));
      refreshRegions();
    } finally {
      setDeletingId(null);
    }
  };

  const pct = progress?.total
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

  // Выбор области — полноэкранная карта поверх экрана: список скачанного и
  // настройки радиуса остаются в состоянии и вернутся при закрытии.
  if (areaOpen) {
    return (
      <WayBackAreaPicker
        center={areaView?.center ?? origin ?? null}
        zoom={areaView?.zoom}
        onClose={closeArea}
        onSaved={refreshRegions}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[520px] px-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
      <WbTopBar title={t("title")} onBack={onBack} />

      <div className="flex flex-col gap-2.5">
        {/* Пояснение и центр загрузки */}
        <WbTile className="flex flex-col gap-2 px-5 py-[18px]">
          <p className="text-[14.5px] font-medium leading-[1.5] text-wb-body">
            {t("intro")}
          </p>
          {origin ? (
            <span className="wb-mono text-[12.5px] text-wb-muted-2">
              {t("centre", {
                coords: `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`,
              })}
            </span>
          ) : (
            <span className="wb-mono text-[12.5px] text-wb-muted-2">
              {t("noCentre")}
            </span>
          )}
        </WbTile>

        {/* Второй вход: область выбирают прямо на карте касанием и зумом. */}
        {!progress && (
          <WbRowTile
            label={t("pickOnMap")}
            sublabel={t("pickOnMapHint")}
            onClick={() => setAreaOpen(true)}
          />
        )}

        {/* Загрузка идёт: прогресс вместо кнопки, переключатели заблокированы */}
        {progress && (
          <div className="rounded-[26px] bg-wb-primary px-5 py-[18px] text-wb-on-primary">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[19px] font-extrabold">
                {t("downloading")}
              </span>
              <span className="wb-mono text-[14px] font-semibold">
                {t("progress", {
                  done: progress.done,
                  total: progress.total,
                })}
              </span>
            </div>
            <div
              className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.25)]"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-wb-on-primary transition-[width] duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="wb-mono text-[12px] opacity-85">
                {t("progressSize", {
                  done: formatBytes(progress.bytes),
                  total: estimateSize,
                })}
              </span>
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="h-9 flex-none rounded-full bg-[rgba(255,255,255,0.22)] px-4 text-[13px] font-bold text-wb-on-primary"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        )}

        {/* Центр не определён — сначала геолокация */}
        {!origin ? (
          <WbTile className="flex flex-col gap-3 px-5 py-[18px]">
            <WbPrimaryButton onClick={useMyLocation} disabled={locating}>
              {locating && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {locating ? t("gettingLocation") : t("useLocation")}
            </WbPrimaryButton>
          </WbTile>
        ) : (
          <>
            <WbTile
              className={progress ? "px-5 py-[18px] opacity-45" : "px-5 py-[18px]"}
            >
              <WbLabel>{progress ? t("radiusLocked") : t("radius")}</WbLabel>
              <WbSegmented
                className="mt-2"
                label={t("radius")}
                disabled={Boolean(progress)}
                value={radiusKm}
                onChange={setRadiusKm}
                options={RADIUS_OPTIONS.map((r) => ({
                  value: r as number,
                  label: `${r} km`,
                }))}
              />

              {!progress && (
                <>
                  <div className="mt-4">
                    <WbLabel>{t("detail")}</WbLabel>
                  </div>
                  <WbSegmented
                    className="mt-2"
                    label={t("detail")}
                    value={quality}
                    onChange={setQuality}
                    options={QUALITY_OPTIONS.map((q) => ({
                      value: q.id,
                      label: t(q.labelKey),
                    }))}
                  />
                  <p className="mt-3 text-[13px] font-medium leading-[1.5] text-wb-muted">
                    {t(qualityOption.hintKey)}
                  </p>
                </>
              )}
            </WbTile>

            {/* Честная оценка объёма до старта загрузки */}
            {!progress && (
              <WbTile tone="tint" className="flex flex-col gap-3 px-5 py-[18px]">
                <span className="wb-mono flex flex-col gap-0.5 text-[13px] leading-[1.5] text-wb-ink-2">
                  <span>{t("estimate", { tiles: estimateTiles, size: estimateSize })}</span>
                  <span className="text-wb-muted">{t("layers")}</span>
                </span>
                <WbPrimaryButton onClick={() => void handleDownload()}>
                  {t("download")}
                </WbPrimaryButton>
              </WbTile>
            )}
          </>
        )}

        {/* Скачанные участки */}
        <WbTile className="flex flex-col gap-3 px-5 py-[18px]">
          <h2 className="text-[17px] font-extrabold text-wb-ink">
            {t("stored")}
          </h2>
          {regions.length === 0 ? (
            <div className="rounded-[18px] bg-wb-surface-2 px-4 py-7 text-center">
              <p className="text-[14px] font-semibold text-wb-muted">
                {t("storedEmpty")}
              </p>
              <p className="mt-1 text-[13.5px] font-medium text-wb-muted-2">
                {t("storedEmptyHint")}
              </p>
            </div>
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {regions.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 rounded-[18px] bg-wb-surface-2 px-3.5 py-3"
                  >
                    <button
                      type="button"
                      onClick={() => setPreview(r)}
                      className="min-w-0 flex-1 rounded-[12px] text-left"
                    >
                      <p className="truncate text-[14.5px] font-bold text-wb-ink">
                        {r.name}
                      </p>
                      <p className="wb-mono mt-0.5 text-[11.5px] text-wb-muted-2">
                        {t("regionSize", {
                          tiles: r.tileCount,
                          size: formatBytes(r.sizeBytes),
                          minZoom: r.minZoom,
                          maxZoom: r.maxZoom,
                        })}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      aria-label={t("delete")}
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-wb-danger disabled:opacity-60"
                    >
                      {deletingId === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-[13px] font-medium text-wb-muted-2">
                {t("storedHint")}
              </p>
            </>
          )}
        </WbTile>
      </div>

      {preview && (
        <RegionPreview
          region={preview}
          onClose={() => setPreview(null)}
          closeLabel={t("closePreview")}
        />
      )}
    </div>
  );
}
