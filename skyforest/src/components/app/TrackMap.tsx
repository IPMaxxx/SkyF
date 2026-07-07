"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  LayersControl,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Maximize2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TrackPoint } from "@/lib/trackState";

/** Зелёный флажок — точка входа в лес (якорь возврата). */
const anchorIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:34px;height:34px;background:#10b981;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/></svg>
  </div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

/** Синяя пульсирующая точка — «я сейчас здесь». Анимация в globals.css (sf-track-pulse). */
const currentIcon = new L.DivIcon({
  className: "",
  html: `<div style="position:relative;width:22px;height:22px">
    <div class="sf-track-pulse" style="position:absolute;inset:-6px;border-radius:50%;background:rgba(59,130,246,.35)"></div>
    <div style="position:absolute;inset:0;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/** Кнопка «показать весь путь» — fitBounds по якорю, точкам и текущей позиции. */
function FitAllButton({ points, label }: { points: [number, number][]; label: string }) {
  const map = useMap();
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!btnRef.current) return;
    L.DomEvent.disableClickPropagation(btnRef.current);
  }, []);

  const fitAll = () => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 17 });
    }
  };

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={fitAll}
      aria-label={label}
      title={label}
      className="absolute bottom-3 right-3 z-[1000] flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-700 shadow-[0_2px_10px_rgba(0,0,0,0.35)] transition-colors hover:bg-gray-100 active:bg-gray-200"
    >
      <Maximize2 className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

/** Первичный зум на трек при монтировании. */
function InitialFit({ points }: { points: [number, number][] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || points.length === 0) return;
    fitted.current = true;
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 17 });
    }
  }, [map, points]);

  return null;
}

interface Props {
  anchor: TrackPoint;
  points: TrackPoint[];
  current: { lat: number; lng: number } | null;
}

export function TrackMap({ anchor, points, current }: Props) {
  const tc = useTranslations("common");
  const t = useTranslations("track");

  /** Пройденный путь: якорь → точки → текущая позиция (если есть). */
  const walkedPath = useMemo<[number, number][]>(() => {
    const path: [number, number][] = [
      [anchor.lat, anchor.lng],
      ...points.map((p) => [p.lat, p.lng] as [number, number]),
    ];
    if (current) path.push([current.lat, current.lng]);
    return path;
  }, [anchor, points, current]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={[anchor.lat, anchor.lng]}
        zoom={15}
        className="h-[320px] sm:h-[400px] w-full"
        zoomControl={true}
        attributionControl={false}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name={tc("mapLayerMap")}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name={tc("mapLayerSatellite")}>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* Пройденный путь: белая подложка + тёмно-зелёная линия поверх */}
        {walkedPath.length > 1 && (
          <>
            <Polyline
              positions={walkedPath}
              pathOptions={{ color: "#fff", weight: 7, opacity: 0.8, lineJoin: "round", lineCap: "round" }}
            />
            <Polyline
              positions={walkedPath}
              pathOptions={{ color: "#166534", weight: 4, opacity: 0.9, lineJoin: "round", lineCap: "round" }}
            />
          </>
        )}

        {/* Прямая «назад к входу» — изумрудный пунктир */}
        {current && (
          <Polyline
            positions={[
              [current.lat, current.lng],
              [anchor.lat, anchor.lng],
            ]}
            pathOptions={{ color: "#10b981", weight: 4, opacity: 0.9, dashArray: "8 10", lineCap: "round" }}
          />
        )}

        <Marker position={[anchor.lat, anchor.lng]} icon={anchorIcon} title={t("anchorTitle")} />
        {current && <Marker position={[current.lat, current.lng]} icon={currentIcon} />}

        <InitialFit points={walkedPath} />
        <FitAllButton points={walkedPath} label={t("fitAll")} />
      </MapContainer>
    </div>
  );
}
