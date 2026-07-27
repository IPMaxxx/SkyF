"use client";

/**
 * Ручной выбор точки входа — полноэкранная карта.
 *
 * Открывается по кнопке и автоматически, когда GPS не дал фикс. Центр карты
 * подбирается по цепочке: текущая позиция → последняя известная → якорь
 * активного похода → центр скачанного офлайн-региона → обзорный вид сервиса.
 * Карту мира не показываем никогда: тыкать в глобус бессмысленно, а именно
 * это и происходило до редизайна.
 */

import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, LocateFixed, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { OfflineTileLayer } from "@/components/app/OfflineTileLayer";
import { OUTDOOR_SOURCE, listRegions } from "@/lib/offline/tileStore";
import { loadLastKnownPosition } from "@/lib/lastKnownPosition";
import { loadTrack } from "@/lib/trackState";
import { getCurrentPosition, type Coords } from "@/lib/native/geolocation";
import {
  WbPrimaryButton,
  WbQuietButton,
} from "@/components/wayback/primitives";

/** Обзорный вид сервиса — доскроллить отсюда проще, чем с глобуса. */
const FALLBACK_VIEW = { center: { lat: 53.9, lng: 27.56 }, zoom: 6 };

/** Тот же зелёный маркер, что и якорь входа на TrackMap. */
const pickIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:34px;height:34px;background:#2f6b3f;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/></svg>
  </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function ClickCatcher({ onPick }: { onPick: (c: Coords) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

/** Кнопки зума и «моё местоположение» вынесены из Leaflet — свой стиль. */
function MapControls({
  onLocate,
  locating,
  labels,
}: {
  onLocate: () => void;
  locating: boolean;
  labels: { zoomIn: string; zoomOut: string; locate: string };
}) {
  const map = useMap();
  const btn =
    "flex h-[46px] w-[46px] items-center justify-center rounded-full bg-wb-surface text-wb-ink shadow-[0_6px_16px_-6px_rgba(20,26,21,0.45)]";
  return (
    <div className="absolute right-4 top-1/2 z-[500] flex -translate-y-1/2 flex-col gap-2.5">
      <button
        type="button"
        aria-label={labels.zoomIn}
        onClick={() => map.zoomIn()}
        className={btn}
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={labels.zoomOut}
        onClick={() => map.zoomOut()}
        className={btn}
      >
        <Minus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={labels.locate}
        onClick={onLocate}
        disabled={locating}
        className={`${btn} text-wb-primary disabled:opacity-60`}
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

/** Императивный доступ к карте для программного центрирования. */
function MapRef({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

interface Props {
  /** Известная текущая позиция — стартовый центр карты (если есть). */
  center: Coords | null;
  onConfirm: (pos: Coords) => void;
  onCancel: () => void;
}

export function WayBackPicker({ center, onConfirm, onCancel }: Props) {
  const t = useTranslations("wayback.picker");
  const [picked, setPicked] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  const [initial, setInitial] = useState<{
    center: Coords;
    zoom: number;
    source: "gps" | "local" | "region";
  } | null>(() => {
    if (center) return { center, zoom: 14, source: "gps" };
    const local = loadLastKnownPosition() ?? loadTrack()?.anchor ?? null;
    return local ? { center: local, zoom: 13, source: "local" } : null;
  });
  const [ready, setReady] = useState(Boolean(center));
  const cancelled = useRef(false);

  useEffect(() => {
    if (ready) return;
    cancelled.current = false;
    void listRegions()
      .then((regions) => {
        if (cancelled.current) return;
        setInitial((cur) => {
          // Позиция устройства точнее скачанного региона — не перебиваем.
          if (cur) return cur;
          const withCenter = regions.find((r) => r.center);
          return withCenter?.center
            ? { center: withCenter.center, zoom: 12, source: "region" as const }
            : cur;
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled.current) setReady(true);
      });
    return () => {
      cancelled.current = true;
    };
  }, [ready]);

  const handleLocate = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      setPicked(pos);
      mapRef.current?.setView([pos.lat, pos.lng], 15);
    } catch {
      /* без фикса просто оставляем карту как есть */
    } finally {
      setLocating(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-wb-canvas">
        <Loader2
          className="h-6 w-6 animate-spin text-wb-primary"
          aria-hidden="true"
        />
      </div>
    );
  }

  const hint =
    initial?.source === "local" || initial?.source === "region"
      ? t("lastKnown")
      : initial
        ? null
        : t("noFix");

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-wb-canvas">
      <div className="absolute inset-0">
        <MapContainer
          center={
            initial
              ? [initial.center.lat, initial.center.lng]
              : [FALLBACK_VIEW.center.lat, FALLBACK_VIEW.center.lng]
          }
          zoom={initial ? initial.zoom : FALLBACK_VIEW.zoom}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={false}
        >
          {/* Обзорная подложка + детальный слой с тропами (см. TrackMap) */}
          <OfflineTileLayer source={OUTDOOR_SOURCE} maxNativeZoom={6} maxZoom={19} />
          <OfflineTileLayer source={OUTDOOR_SOURCE} maxNativeZoom={18} maxZoom={19} />
          <ClickCatcher onPick={setPicked} />
          <MapRef
            onReady={(m) => {
              mapRef.current = m;
            }}
          />
          <MapControls
            onLocate={() => void handleLocate()}
            locating={locating}
            labels={{
              zoomIn: t("zoomIn"),
              zoomOut: t("zoomOut"),
              locate: t("locate"),
            }}
          />
          {picked && (
            <Marker position={[picked.lat, picked.lng]} icon={pickIcon} />
          )}
        </MapContainer>
      </div>

      {/* Подсказка сверху */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[600] px-4 pt-[calc(8px+env(safe-area-inset-top))]">
        <div className="wb-tile mx-auto flex max-w-[520px] items-start gap-3 px-5 py-4 shadow-[0_10px_30px_-16px_rgba(20,26,21,0.5)]">
          <p className="flex-1 text-[16px] font-bold leading-[1.3] text-wb-ink">
            {t("title")}
          </p>
          {hint && (
            <span className="wb-mono flex-none pt-0.5 text-right text-[11.5px] leading-[1.35] text-wb-muted-2">
              {hint}
            </span>
          )}
        </div>
      </div>

      {/* Координаты и действия снизу */}
      <div className="absolute inset-x-0 bottom-0 z-[600] px-4 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-[520px] flex-col gap-2.5">
          {picked && (
            <div className="wb-tile flex items-center justify-between gap-3 px-5 py-3.5">
              <span className="wb-mono text-[13px] text-wb-ink-2">
                {picked.lat.toFixed(4)}, {picked.lng.toFixed(4)}
              </span>
            </div>
          )}
          <WbPrimaryButton
            className="shadow-[0_14px_30px_-14px_rgba(47,107,63,0.9)]"
            disabled={!picked}
            onClick={() => picked && onConfirm(picked)}
          >
            {t("confirm")}
          </WbPrimaryButton>
          <WbQuietButton onClick={onCancel}>{t("cancel")}</WbQuietButton>
        </div>
      </div>
    </div>
  );
}
