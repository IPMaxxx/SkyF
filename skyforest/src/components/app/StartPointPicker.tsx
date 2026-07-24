"use client";

/**
 * Ручной выбор точки входа в лес на карте — фолбэк для «Я вошёл в лес»,
 * когда GPS недоступен (нет разрешения, холодный старт без сети и т.п.).
 *
 * Центр карты: текущая позиция (если известна) → центр последнего скачанного
 * офлайн-региона → обзор мира. Тап по карте ставит маркер, кнопка подтверждает.
 */

import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { OfflineTileLayer } from "@/components/app/OfflineTileLayer";
import { OUTDOOR_SOURCE, listRegions } from "@/lib/offline/tileStore";
import type { Coords } from "@/lib/native/geolocation";

/** Тот же зелёный маркер, что и якорь входа на TrackMap. */
const pickIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:34px;height:34px;background:#10b981;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">
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

interface Props {
  /** Известная текущая позиция — стартовый центр карты (если есть). */
  center: Coords | null;
  onConfirm: (pos: Coords) => void;
  onCancel: () => void;
}

export function StartPointPicker({ center, onConfirm, onCancel }: Props) {
  const t = useTranslations("track");
  const [picked, setPicked] = useState<Coords | null>(null);
  const [initial, setInitial] = useState<{ center: Coords; zoom: number } | null>(
    center ? { center, zoom: 14 } : null,
  );
  const [ready, setReady] = useState(Boolean(center));
  const cancelled = useRef(false);

  useEffect(() => {
    if (ready) return;
    cancelled.current = false;
    void listRegions()
      .then((regions) => {
        if (cancelled.current) return;
        const withCenter = regions.find((r) => r.center);
        if (withCenter?.center) {
          setInitial({ center: withCenter.center, zoom: 12 });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled.current) setReady(true);
      });
    return () => {
      cancelled.current = true;
    };
  }, [ready]);

  if (!ready) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl bg-muted">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <p className="px-4 py-3 text-sm text-muted-foreground">{t("pickOnMapHint")}</p>
      <MapContainer
        center={initial ? [initial.center.lat, initial.center.lng] : [30, 10]}
        zoom={initial ? initial.zoom : 2}
        className="h-[320px] sm:h-[400px] w-full"
        zoomControl={true}
        attributionControl={false}
      >
        {/* Обзорная подложка + детальный слой с тропами (см. TrackMap) */}
        <OfflineTileLayer source={OUTDOOR_SOURCE} maxNativeZoom={6} maxZoom={19} />
        <OfflineTileLayer source={OUTDOOR_SOURCE} maxNativeZoom={18} maxZoom={19} />
        <ClickCatcher onPick={setPicked} />
        {picked && <Marker position={[picked.lat, picked.lng]} icon={pickIcon} />}
      </MapContainer>
      <div className="flex gap-2 p-3">
        <button
          type="button"
          onClick={() => picked && onConfirm(picked)}
          disabled={!picked}
          className="btn-primary flex-1 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
        >
          {t("pickConfirm")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
        >
          {t("pickCancel")}
        </button>
      </div>
    </div>
  );
}
