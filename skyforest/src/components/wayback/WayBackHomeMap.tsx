"use client";

/**
 * Карта на стартовом экране WayBack: «где я сейчас», без единого действия.
 *
 * Карта рисуется сразу — центр берётся из последней известной позиции, а если
 * её нет, из обзорного вида сервиса (мир показывать бессмысленно, см.
 * WayBackPicker). Свежий фикс приходит асинхронно и меняет только вид карты и
 * подпись под ней: высота плитки фиксирована, поэтому появление маркера ничего
 * не сдвигает.
 *
 * Слои те же, что у карты похода: обзорная подложка низких зумов + детальный
 * слой троп с автокешем (OfflineTileLayer), поэтому экран работает и офлайн.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, LocateFixed, LocateOff, DownloadCloud } from "lucide-react";
import { useTranslations } from "next-intl";
import { OfflineTileLayer } from "@/components/app/OfflineTileLayer";
import { OUTDOOR_SOURCE } from "@/lib/offline/tileStore";
import { useHomePosition } from "@/lib/wayback/useHomePosition";
import type { Coords } from "@/lib/native/geolocation";

/** Обзорный вид сервиса: тот же фолбэк, что у выбора точки входа. */
const FALLBACK_VIEW = { center: { lat: 53.9, lng: 27.56 }, zoom: 6 };
/** Зум под пешехода: видно опушку и ближние дороги. */
const FIX_ZOOM = 15;
/** Карта без фикса стоит на последней известной позиции — чуть шире. */
const LAST_KNOWN_ZOOM = 13;

/** Синяя пульсирующая точка «я здесь» — та же, что на карте похода. */
const currentIcon = new L.DivIcon({
  className: "",
  html: `<div style="position:relative;width:22px;height:22px">
    <div class="sf-track-pulse" style="position:absolute;inset:-6px;border-radius:50%;background:rgba(59,130,246,.35)"></div>
    <div style="position:absolute;inset:0;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/** Императивный доступ к карте: центрируем её из обработчиков, не через props. */
function MapRef({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

export function WayBackHomeMap({
  known,
  onSaveArea,
}: {
  known?: Coords | null;
  /** Предсохранить карту: отдаём наружу вид, который человек видит сейчас. */
  onSaveArea?: (view: { center: Coords; zoom: number }) => void;
}) {
  const t = useTranslations("wayback.home");
  const { position, lastKnown, status, locate } = useHomePosition(known ?? null);

  const mapRef = useRef<L.Map | null>(null);
  /** Автоцентрирование — только на первый фикс: дальше карту ведёт человек. */
  const centered = useRef(Boolean(known));
  const [initialView] = useState(() => {
    const start = known ?? lastKnown;
    return start
      ? { center: start, zoom: known ? FIX_ZOOM : LAST_KNOWN_ZOOM }
      : FALLBACK_VIEW;
  });

  useEffect(() => {
    if (!position || centered.current) return;
    centered.current = true;
    mapRef.current?.setView([position.lat, position.lng], FIX_ZOOM, {
      animate: true,
    });
  }, [position]);

  const handleLocate = async () => {
    const fresh = await locate();
    const target = fresh ?? position;
    if (!target) return;
    centered.current = true;
    mapRef.current?.setView([target.lat, target.lng], FIX_ZOOM, {
      animate: true,
    });
  };

  const statusText = useMemo(() => {
    if (status === "locating") return t("mapLocating");
    if (status === "ready" && position) {
      return t("mapHere", {
        coords: `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`,
      });
    }
    if (status === "denied") return t("mapDenied");
    return lastKnown ? t("mapLastKnown") : t("mapNoFix");
  }, [status, position, lastKnown, t]);

  const locating = status === "locating";

  return (
    <div className="wb-tile p-2.5">
      <div className="relative h-[220px] w-full overflow-hidden rounded-[20px]">
        <MapContainer
          center={[initialView.center.lat, initialView.center.lng]}
          zoom={initialView.zoom}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={false}
        >
          {/* Обзорная подложка + детальный слой троп (см. TrackMap) */}
          <OfflineTileLayer
            source={OUTDOOR_SOURCE}
            maxNativeZoom={6}
            maxZoom={19}
          />
          <OfflineTileLayer
            source={OUTDOOR_SOURCE}
            maxNativeZoom={18}
            maxZoom={19}
          />
          <MapRef
            onReady={(m) => {
              mapRef.current = m;
            }}
          />
          {position && (
            <Marker position={[position.lat, position.lng]} icon={currentIcon} />
          )}
        </MapContainer>

        {/* Кнопки карты — свои, в системе плиток, а не контролы Leaflet.
            Лежат вне MapContainer, поэтому нажатие не уходит в карту. */}
        <div className="absolute bottom-3 right-3 z-[500] flex items-center gap-2">
          {onSaveArea && (
            <button
              type="button"
              onClick={() => {
                const map = mapRef.current;
                const c = map?.getCenter();
                onSaveArea(
                  c
                    ? { center: { lat: c.lat, lng: c.lng }, zoom: map!.getZoom() }
                    : {
                        center: position ?? lastKnown ?? FALLBACK_VIEW.center,
                        zoom: FIX_ZOOM,
                      },
                );
              }}
              aria-label={t("mapSaveArea")}
              title={t("mapSaveArea")}
              className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-wb-surface text-wb-primary shadow-[0_6px_16px_-6px_rgba(20,26,21,0.45)]"
            >
              <DownloadCloud
                className="h-5 w-5"
                strokeWidth={2.5}
                aria-hidden="true"
              />
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleLocate()}
            disabled={locating}
            aria-label={t("mapLocate")}
            title={t("mapLocate")}
            className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-wb-surface text-wb-primary shadow-[0_6px_16px_-6px_rgba(20,26,21,0.45)] disabled:opacity-60"
          >
            {locating ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : status === "denied" ? (
              <LocateOff
                className="h-5 w-5 text-wb-muted-2"
                strokeWidth={2.5}
                aria-hidden="true"
              />
            ) : (
              <LocateFixed
                className="h-5 w-5"
                strokeWidth={2.5}
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </div>

      {/* Подпись фиксированной высоты: смена состояния не двигает плитку. */}
      <div className="flex min-h-[34px] items-center gap-2 px-2 pt-2.5">
        {locating && (
          <Loader2
            className="h-3.5 w-3.5 flex-none animate-spin text-wb-muted-2"
            aria-hidden="true"
          />
        )}
        <span
          className="wb-mono flex-1 text-[11.5px] leading-[1.35] text-wb-muted-2"
          aria-live="polite"
        >
          {statusText}
        </span>
      </div>
    </div>
  );
}
