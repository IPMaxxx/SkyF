"use client";

/**
 * Предсохранение карты с карты: выбор области касанием и зумом.
 *
 * Второй вход в офлайн-карту рядом со старым (радиус × детализация). Правила
 * простые и видимые глазом:
 *  - касание переносит рамку в это место, поэтому выбранная область всегда
 *    целиком на экране, а не уезжает за край;
 *  - рамка — это ровно то, что скачается: вокруг неё затемнение;
 *  - зум задаёт и охват, и глубину: чем ближе, тем меньше площадь и тем глубже
 *    уровни (см. zoomPlanFor).
 *
 * Объём считается до старта и показывает трафик, а не размер области: тайлы из
 * ранее скачанных участков пропускаются. Отмена сохраняет запись с фактическими
 * числами — иначе скачанное осталось бы в хранилище невидимым.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, useMap, useMapEvents } from "react-leaflet";
import type L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, LocateFixed, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { OfflineTileLayer } from "@/components/app/OfflineTileLayer";
import { OUTDOOR_SOURCE, listRegions, type BBox, type DownloadedRegion } from "@/lib/offline/tileStore";
import { loadLastKnownPosition } from "@/lib/lastKnownPosition";
import { getCurrentPosition, type Coords } from "@/lib/native/geolocation";
import {
  areaVerdict,
  bboxSpanKm,
  downloadArea,
  estimateArea,
  formatBytes,
  zoomPlanFor,
  type AreaProgress,
} from "@/lib/wayback/offlineArea";
import { WbPrimaryButton, WbQuietButton } from "@/components/wayback/primitives";

/** Обзорный вид сервиса — тот же фолбэк, что у выбора точки входа. */
const FALLBACK_VIEW = { center: { lat: 53.9, lng: 27.56 }, zoom: 6 };
/** Стартовый зум: область ≈ 7 км по стороне, привычный порядок «10 км». */
const DEFAULT_ZOOM = 12;
/**
 * Ближе этого не открываем, даже если карта на главной стояла на 15-м зуме:
 * на 16-м рамка накрывает 400 м, а за такой площадью в поход не ходят. Ближе
 * человек приблизит сам, и рамка сразу покажет, что площадь уменьшилась.
 */
const START_MAX_ZOOM = 13;
/** Отступы рамки от краёв экрана и запас, чтобы она не липла к плиткам. */
const FRAME_MARGIN_X = 20;
const FRAME_GAP = 12;
/** Меньше этого рамка не имеет смысла — на узких экранах берём что есть. */
const MIN_FRAME_SIZE = 160;

interface FrameRect {
  left: number;
  top: number;
  size: number;
}

interface ControlsPlacement {
  top: number;
  right: number;
  /** Кнопки в ряд под рамкой (иначе столбиком справа от неё). */
  row: boolean;
}

interface ViewArea {
  bbox: BBox;
  zoom: number;
}

/** Императивный доступ к карте: центрируем и зумим из обработчиков. */
function MapRef({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

/**
 * Следит за видом: пересчитывает bbox рамки после каждого движения карты и
 * переносит рамку в точку касания (панорамирует так, чтобы точка оказалась в
 * центре рамки).
 */
function AreaWatcher({
  frame,
  locked,
  onChange,
}: {
  frame: FrameRect | null;
  locked: boolean;
  onChange: (area: ViewArea) => void;
}) {
  const map = useMap();

  const emit = useCallback(() => {
    if (!frame) return;
    const nw = map.containerPointToLatLng([frame.left, frame.top]);
    const se = map.containerPointToLatLng([
      frame.left + frame.size,
      frame.top + frame.size,
    ]);
    onChange({
      bbox: { west: nw.lng, north: nw.lat, east: se.lng, south: se.lat },
      zoom: map.getZoom(),
    });
  }, [frame, map, onChange]);

  useMapEvents({
    moveend: emit,
    zoomend: emit,
    resize: emit,
    click(e) {
      if (locked || !frame) return;
      map.panBy(
        [
          e.containerPoint.x - (frame.left + frame.size / 2),
          e.containerPoint.y - (frame.top + frame.size / 2),
        ],
        { animate: true },
      );
    },
  });

  useEffect(() => {
    emit();
  }, [emit]);

  return null;
}

/**
 * Кнопки зума и «моё местоположение» — свой стиль, не контролы Leaflet.
 * Ставим их вне рамки: она показывает, что скачается, и закрывать её кнопками
 * нельзя. Если снизу места нет (низкий экран) — уходим на правое поле.
 */
function MapControls({
  placement,
  disabled,
  locating,
  onLocate,
  labels,
}: {
  placement: ControlsPlacement;
  disabled: boolean;
  locating: boolean;
  onLocate: () => void;
  labels: { zoomIn: string; zoomOut: string; locate: string };
}) {
  const map = useMap();
  const btn =
    "flex h-[46px] w-[46px] items-center justify-center rounded-full bg-wb-surface text-wb-ink shadow-[0_6px_16px_-6px_rgba(20,26,21,0.45)] disabled:opacity-60";
  return (
    <div
      className={
        placement.row
          ? "absolute z-[560] flex flex-row gap-2.5"
          : "absolute z-[560] flex -translate-y-1/2 flex-col gap-2.5"
      }
      style={{ top: placement.top, right: placement.right }}
    >
      <button
        type="button"
        aria-label={labels.zoomIn}
        disabled={disabled}
        onClick={() => map.zoomIn()}
        className={btn}
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={labels.zoomOut}
        disabled={disabled}
        onClick={() => map.zoomOut()}
        className={btn}
      >
        <Minus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={labels.locate}
        disabled={disabled || locating}
        onClick={onLocate}
        className={`${btn} text-wb-primary`}
      >
        {locating ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <LocateFixed className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

function formatKm(km: number): string {
  return km < 10 ? km.toFixed(1) : String(Math.round(km));
}

interface Props {
  /** Стартовый центр: позиция похода или свежий фикс, если он есть. */
  center: Coords | null;
  /** Стартовый зум, если экран пришёл с уже открытой карты. */
  zoom?: number;
  onClose: () => void;
  /** Область сохранена — обновить список скачанных участков. */
  onSaved: () => void;
}

export function WayBackAreaPicker({ center, zoom, onClose, onSaved }: Props) {
  const t = useTranslations("wayback.area");

  const mapRef = useRef<L.Map | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const [frame, setFrame] = useState<FrameRect | null>(null);
  const [controls, setControls] = useState<ControlsPlacement | null>(null);
  const [area, setArea] = useState<ViewArea | null>(null);
  const [regions, setRegions] = useState<DownloadedRegion[]>([]);
  const [locating, setLocating] = useState(false);
  const [progress, setProgress] = useState<AreaProgress | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [initialView] = useState(() => {
    const start = center ?? loadLastKnownPosition();
    return start
      ? { center: start, zoom: Math.min(zoom ?? DEFAULT_ZOOM, START_MAX_ZOOM) }
      : FALLBACK_VIEW;
  });
  /** Карту центрируем на скачанной области, только если своей позиции нет. */
  const hasOwnCenter = useRef(Boolean(center ?? loadLastKnownPosition()));

  useEffect(() => {
    let alive = true;
    void listRegions().then((list) => {
      if (!alive) return;
      setRegions(list);
      if (hasOwnCenter.current) return;
      const withCenter = list.find((r) => r.center);
      if (withCenter?.center) {
        hasOwnCenter.current = true;
        mapRef.current?.setView(
          [withCenter.center.lat, withCenter.center.lng],
          DEFAULT_ZOOM,
        );
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Рамка считается по фактическим размерам верхней подсказки и нижней плитки:
   * так она никогда не уезжает под них, на каком бы экране ни открыли.
   */
  useEffect(() => {
    const measure = () => {
      const shell = shellRef.current;
      if (!shell) return;
      const width = shell.clientWidth;
      const height = shell.clientHeight;
      const topInset = (topRef.current?.offsetHeight ?? 0) + FRAME_GAP;
      const bottomInset = (sheetRef.current?.offsetHeight ?? 0) + FRAME_GAP;
      const availableH = height - topInset - bottomInset;
      const size = Math.max(
        MIN_FRAME_SIZE,
        Math.min(width - FRAME_MARGIN_X * 2, availableH),
      );
      const next: FrameRect = {
        left: Math.round((width - size) / 2),
        top: Math.round(topInset + Math.max(0, (availableH - size) / 2)),
        size: Math.round(size),
      };
      const gapBelow = height - bottomInset - (next.top + next.size);
      setControls(
        gapBelow >= 56
          ? {
              top: next.top + next.size + 10,
              right: Math.max(16, width - next.left - next.size),
              row: true,
            }
          : { top: next.top + next.size / 2, right: 16, row: false },
      );
      // Плитка снизу растёт вместе с текстом оценки, а её высота задаёт рамку:
      // без сравнения наблюдатель гонял бы пересчёт по кругу.
      setFrame((cur) =>
        cur && cur.left === next.left && cur.top === next.top && cur.size === next.size
          ? cur
          : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (shellRef.current) observer.observe(shellRef.current);
    if (topRef.current) observer.observe(topRef.current);
    if (sheetRef.current) observer.observe(sheetRef.current);
    return () => observer.disconnect();
  }, []);

  const plan = useMemo(
    () => zoomPlanFor(area?.zoom ?? initialView.zoom),
    [area?.zoom, initialView.zoom],
  );
  const estimate = useMemo(
    () => (area ? estimateArea(area.bbox, plan, regions) : null),
    [area, plan, regions],
  );
  const span = useMemo(() => (area ? bboxSpanKm(area.bbox) : null), [area]);
  const verdict = estimate ? areaVerdict(estimate.bytes) : "ok";
  const nothingToDo = Boolean(estimate && estimate.pending === 0);

  const handleLocate = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      // Зум оставляем как есть: человек уже выбрал масштаб области.
      const map = mapRef.current;
      map?.setView([pos.lat, pos.lng], map.getZoom(), { animate: true });
    } catch {
      toast.error(t("locateError"));
    } finally {
      setLocating(false);
    }
  };

  const regionLabel = (partial: boolean) => {
    const date = new Date().toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
    const size = span
      ? `${formatKm(span.widthKm)} × ${formatKm(span.heightKm)} km`
      : "";
    return partial
      ? t("regionPartial", { size, minZoom: plan.minZoom, maxZoom: plan.maxZoom, date })
      : t("regionName", { size, minZoom: plan.minZoom, maxZoom: plan.maxZoom, date });
  };

  const handleSave = async () => {
    if (!area || !estimate || progress || nothingToDo) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress({ done: 0, total: estimate.total, skipped: 0, failed: 0, bytes: 0 });
    try {
      const result = await downloadArea(
        {
          name: regionLabel(false),
          partialName: regionLabel(true),
          bbox: area.bbox,
          minZoom: plan.minZoom,
          maxZoom: plan.maxZoom,
          center: {
            lat: (area.bbox.north + area.bbox.south) / 2,
            lng: (area.bbox.east + area.bbox.west) / 2,
          },
          radiusKm: span ? Math.max(1, Math.round(span.widthKm / 2)) : undefined,
        },
        setProgress,
        controller.signal,
      );
      if (result.aborted) {
        toast.success(
          result.region
            ? t("stoppedToast", { size: formatBytes(result.progress.bytes) })
            : t("stoppedEmptyToast"),
        );
      } else if (result.progress.failed > 0) {
        toast.success(t("partialToast", { failed: result.progress.failed }));
      } else {
        toast.success(t("savedToast"));
      }
      onSaved();
      const fresh = await listRegions();
      setRegions(fresh);
    } catch {
      toast.error(t("errorToast"));
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  };

  const pct = progress?.total
    ? Math.round((progress.done / progress.total) * 100)
    : 0;
  const downloading = progress !== null;

  return (
    <div
      ref={shellRef}
      className="relative min-h-[100dvh] w-full overflow-hidden bg-wb-canvas"
    >
      <div className="absolute inset-0">
        <MapContainer
          center={[initialView.center.lat, initialView.center.lng]}
          zoom={initialView.zoom}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={false}
        >
          {/* Обзорная подложка + детальный слой троп (как на карте похода) */}
          <OfflineTileLayer source={OUTDOOR_SOURCE} maxNativeZoom={6} maxZoom={19} />
          <OfflineTileLayer source={OUTDOOR_SOURCE} maxNativeZoom={18} maxZoom={19} />
          <MapRef
            onReady={(m) => {
              mapRef.current = m;
            }}
          />
          <AreaWatcher frame={frame} locked={downloading} onChange={setArea} />
          {controls && (
            <MapControls
              placement={controls}
              disabled={downloading}
              locating={locating}
              onLocate={() => void handleLocate()}
              labels={{
                zoomIn: t("zoomIn"),
                zoomOut: t("zoomOut"),
                locate: t("locate"),
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Рамка = ровно то, что скачается. Затемнение вокруг — тенью наружу. */}
      {frame && (
        <div
          className="wb-area-frame pointer-events-none absolute z-[540]"
          style={{
            left: frame.left,
            top: frame.top,
            width: frame.size,
            height: frame.size,
          }}
          role="presentation"
        >
          <span className="wb-area-crosshair" />
        </div>
      )}

      {/* Во время загрузки область зафиксирована: карту не двигаем. */}
      {downloading && <div className="absolute inset-0 z-[545]" />}

      <div
        ref={topRef}
        className="pointer-events-none absolute inset-x-0 top-0 z-[600] px-4 pt-[calc(8px+env(safe-area-inset-top))]"
      >
        <div className="wb-tile mx-auto max-w-[520px] px-5 py-4 shadow-[0_10px_30px_-16px_rgba(20,26,21,0.5)]">
          <p className="text-[16px] font-bold leading-[1.3] text-wb-ink">
            {t("title")}
          </p>
          <p className="wb-mono mt-1 text-[11.5px] leading-[1.4] text-wb-muted-2">
            {downloading ? t("hintLocked") : t("hint")}
          </p>
        </div>
      </div>

      <div
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 z-[600] px-4 pb-[calc(20px+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto flex max-w-[520px] flex-col gap-2.5">
          {downloading ? (
            <div className="rounded-[26px] bg-wb-primary px-5 py-[18px] text-wb-on-primary">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[18px] font-extrabold">
                  {t("downloading")}
                </span>
                <span className="wb-mono text-[13.5px] font-semibold">
                  {t("progress", {
                    done: progress.done,
                    total: progress.total,
                  })}
                </span>
              </div>
              <div
                className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[rgba(6,18,10,0.22)]"
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
                <span className="wb-mono flex flex-col gap-0.5 text-[11.5px] leading-[1.35] opacity-85">
                  <span>
                    {t("progressSize", {
                      done: formatBytes(progress.bytes),
                      size: formatBytes(estimate?.bytes ?? 0),
                    })}
                  </span>
                  {progress.skipped > 0 && (
                    <span>{t("progressReused", { count: progress.skipped })}</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="h-9 flex-none rounded-full bg-[rgba(6,18,10,0.16)] px-4 text-[13px] font-bold text-wb-on-primary"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="wb-tile flex flex-col gap-2 px-5 py-4">
                <span className="wb-label">{t("selection")}</span>
                <span className="wb-mono text-[13px] leading-[1.5] text-wb-ink-2">
                  {span
                    ? t("size", {
                        width: formatKm(span.widthKm),
                        height: formatKm(span.heightKm),
                        minZoom: plan.minZoom,
                        maxZoom: plan.maxZoom,
                      })
                    : t("measuring")}
                </span>
                {estimate && (
                  <span className="wb-mono flex flex-col gap-0.5 text-[12.5px] leading-[1.5] text-wb-muted">
                    <span className="text-wb-ink-2">
                      {t("estimate", {
                        tiles: estimate.pending,
                        size: formatBytes(estimate.bytes),
                      })}
                    </span>
                    <span>{t("layers")}</span>
                    {estimate.cached > 0 && (
                      <span>{t("reused", { count: estimate.cached })}</span>
                    )}
                  </span>
                )}
              </div>

              {estimate && verdict !== "ok" && (
                <div className="rounded-[26px] bg-wb-amber-tint px-5 py-3.5">
                  <p className="text-[13px] font-semibold leading-[1.45] text-wb-amber-ink">
                    {verdict === "too-large"
                      ? t("tooLarge", { size: formatBytes(estimate.bytes) })
                      : t("large", { size: formatBytes(estimate.bytes) })}
                  </p>
                </div>
              )}

              {nothingToDo && (
                <div className="wb-tile-tint px-5 py-3.5">
                  <p className="text-[13px] font-semibold leading-[1.45] text-wb-ink-2">
                    {t("alreadySaved")}
                  </p>
                </div>
              )}

              <WbPrimaryButton
                className="shadow-[0_14px_30px_-14px_rgba(47,107,63,0.9)]"
                disabled={!estimate || verdict === "too-large" || nothingToDo}
                onClick={() => void handleSave()}
              >
                {t("save")}
              </WbPrimaryButton>
              <WbQuietButton onClick={onClose}>{t("close")}</WbQuietButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
