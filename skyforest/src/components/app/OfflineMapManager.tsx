"use client";

/**
 * «Скачать регион для офлайна»: качает тайлы уличной карты (тропы) вокруг точки
 * и хранит их на устройстве, чтобы карта Track работала без интернета. Показывает
 * оценку размера, прогресс и список уже скачанных участков с удалением.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, MapPinned, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { getCurrentPosition } from "@/lib/native/geolocation";
import {
  OUTDOOR_SOURCE,
  bboxAround,
  countTilesForBbox,
  deleteRegion,
  downloadRegion,
  listRegions,
  type DownloadProgress,
  type DownloadedRegion,
} from "@/lib/offline/tileStore";

/** Нижний уровень зума в скачиваемом регионе — даёт обзорный контекст. */
const DOWNLOAD_MIN_ZOOM = 12;
/** Средний вес PNG-тайла (для оценки размера до загрузки). */
const AVG_TILE_BYTES = 18 * 1024;

const RADIUS_OPTIONS = [2, 5, 10] as const;
const DETAIL_OPTIONS = [
  { key: "low", maxZoom: 14 },
  { key: "medium", maxZoom: 15 },
  { key: "high", maxZoom: 16 },
] as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  /** Центр для скачивания (якорь похода или текущая позиция). */
  center?: { lat: number; lng: number } | null;
}

export function OfflineMapManager({ center }: Props) {
  const t = useTranslations("track");

  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(center ?? null);
  const [locating, setLocating] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [maxZoom, setMaxZoom] = useState<number>(15);
  const [regions, setRegions] = useState<DownloadedRegion[]>([]);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (center) setOrigin(center);
  }, [center]);

  const refreshRegions = useCallback(() => {
    void listRegions().then(setRegions);
  }, []);

  useEffect(() => {
    refreshRegions();
  }, [refreshRegions]);

  const estimateTiles = origin
    ? countTilesForBbox(bboxAround(origin.lat, origin.lng, radiusKm), DOWNLOAD_MIN_ZOOM, maxZoom)
    : 0;
  const estimateSize = formatBytes(estimateTiles * AVG_TILE_BYTES);

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      setOrigin(pos);
    } catch {
      toast.error(t("geoError"));
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
          name: new Date().toLocaleDateString(),
          source: OUTDOOR_SOURCE,
          bbox: bboxAround(origin.lat, origin.lng, radiusKm),
          minZoom: DOWNLOAD_MIN_ZOOM,
          maxZoom,
        },
        (p) => {
          failed = p.failed;
          setProgress(p);
        },
        controller.signal,
      );
      toast.success(
        failed > 0 ? t("offlineMapPartialToast", { failed }) : t("offlineMapSavedToast"),
      );
      refreshRegions();
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        toast.error(t("offlineMapErrorToast"));
      }
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteRegion(id);
      toast.success(t("offlineMapDeletedToast"));
      refreshRegions();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="mb-1 flex items-center gap-2 font-heading text-sm font-bold">
        <MapPinned className="h-4 w-4 text-primary-light" aria-hidden="true" />
        {t("offlineMapTitle")}
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">{t("offlineMapDesc")}</p>

      {!origin ? (
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <MapPinned className="h-4 w-4" aria-hidden="true" />
          )}
          {locating ? t("offlineMapGettingLocation") : t("offlineMapUseLocation")}
        </button>
      ) : (
        <div className="space-y-4">
          {/* Радиус */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              {t("offlineMapRadius")}
            </p>
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadiusKm(r)}
                  disabled={!!progress}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                    radiusKm === r
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/10 text-foreground hover:bg-white/15"
                  }`}
                >
                  {r} км
                </button>
              ))}
            </div>
          </div>

          {/* Детализация */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              {t("offlineMapDetail")}
            </p>
            <div className="flex gap-2">
              {DETAIL_OPTIONS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setMaxZoom(d.maxZoom)}
                  disabled={!!progress}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                    maxZoom === d.maxZoom
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/10 text-foreground hover:bg-white/15"
                  }`}
                >
                  {t(`offlineMapDetail${d.key[0].toUpperCase()}${d.key.slice(1)}` as never)}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("offlineMapEstimate", { tiles: estimateTiles, size: estimateSize })}
          </p>

          {progress ? (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{
                    width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {t("offlineMapDownloading", { done: progress.done, total: progress.total })}
                </span>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/15"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("offlineMapCancel")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void handleDownload()}
              className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {t("offlineMapDownload")}
            </button>
          )}
        </div>
      )}

      {/* Скачанные участки */}
      <div className="mt-5 border-t border-border/60 pt-4">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">
          {t("offlineMapStoredTitle")}
        </p>
        {regions.length === 0 ? (
          <p className="text-xs text-muted-foreground/70">{t("offlineMapEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {regions.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("offlineMapRegionMeta", {
                      tiles: r.tileCount,
                      size: formatBytes(r.sizeBytes),
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(r.id)}
                  disabled={deletingId === r.id}
                  aria-label={t("offlineMapDelete")}
                  title={t("offlineMapDelete")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-60"
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
        )}
      </div>
    </div>
  );
}
