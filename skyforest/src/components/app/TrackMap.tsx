"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
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
import { destinationPoint, haversineM, type TrackPoint } from "@/lib/trackState";
import { OfflineTileLayer } from "@/components/app/OfflineTileLayer";
import { OUTDOOR_SOURCE } from "@/lib/offline/tileStore";

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
  /** Текущая позиция; t — время замера (для честного пунктира после фона). */
  current: { lat: number; lng: number; t?: number } | null;
  /** Курс движения по GPS (0–360°, 0 = север) или null, если стоим на месте. */
  course?: number | null;
}

/**
 * Разрыв между соседними точками больше этого времени означает, что точки
 * не собирались (приложение было в фоне) — такой сегмент рисуем пунктиром,
 * чтобы прямая «дорисовка» не выглядела как реальный путь.
 */
const GAP_MS = 5 * 60_000;

export function TrackMap({ anchor, points, current, course }: Props) {
  const tc = useTranslations("common");
  const t = useTranslations("track");

  /**
   * Линия направления движения: короткий синий отрезок из текущей точки по
   * курсу GPS. Длину привязываем к расстоянию до входа (но в разумных рамках),
   * чтобы визуально сравнивать её с изумрудной линией «на вход».
   */
  const movementLine = useMemo(() => {
    if (!current || course == null) return null;
    const distToAnchor = haversineM(current, anchor);
    const len = Math.min(Math.max(distToAnchor * 0.5, 40), 150);
    const tip = destinationPoint(current, course, len);
    return [
      [current.lat, current.lng],
      [tip.lat, tip.lng],
    ] as [number, number][];
  }, [current, course, anchor]);

  /**
   * Пройденный путь: якорь → точки → текущая позиция (если есть),
   * разбитый на непрерывные сегменты и «разрывы» (долгие паузы без точек).
   */
  const { solidSegments, gapSegments, allPoints } = useMemo(() => {
    const pts: TrackPoint[] = [anchor, ...points];
    if (current) {
      pts.push({ lat: current.lat, lng: current.lng, t: current.t ?? pts[pts.length - 1].t });
    }

    const solid: [number, number][][] = [];
    const gaps: [number, number][][] = [];
    let segment: [number, number][] = [[pts[0].lat, pts[0].lng]];
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].t - pts[i - 1].t > GAP_MS) {
        if (segment.length > 1) solid.push(segment);
        gaps.push([
          [pts[i - 1].lat, pts[i - 1].lng],
          [pts[i].lat, pts[i].lng],
        ]);
        segment = [[pts[i].lat, pts[i].lng]];
      } else {
        segment.push([pts[i].lat, pts[i].lng]);
      }
    }
    if (segment.length > 1) solid.push(segment);

    return {
      solidSegments: solid,
      gapSegments: gaps,
      allPoints: pts.map((p) => [p.lat, p.lng] as [number, number]),
    };
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
        {/*
          Нижний «базовый» слой обзорной карты: тайлы низких зумов (≤6), которые
          Leaflet растягивает на все зумы. Всегда что-то показывает — даже без
          скачанного региона и без сети (после первой загрузки онлайн он
          автоматически кешируется). Поверх — детальный слой с тропами.
        */}
        <OfflineTileLayer source={OUTDOOR_SOURCE} maxNativeZoom={6} maxZoom={19} />

        <LayersControl position="topright">
          {/* Уличный слой с тропами — работает офлайн по скачанному региону. */}
          <LayersControl.BaseLayer checked name={t("mapLayerOutdoor")}>
            <OfflineTileLayer source={OUTDOOR_SOURCE} maxNativeZoom={16} maxZoom={19} />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name={tc("mapLayerMap")}>
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
        {solidSegments.map((seg, i) => (
          <Fragment key={`solid-${i}`}>
            <Polyline
              positions={seg}
              pathOptions={{ color: "#fff", weight: 7, opacity: 0.8, lineJoin: "round", lineCap: "round" }}
            />
            <Polyline
              positions={seg}
              pathOptions={{ color: "#166534", weight: 4, opacity: 0.9, lineJoin: "round", lineCap: "round" }}
            />
          </Fragment>
        ))}

        {/* Разрывы (точки не собирались — приложение было в фоне): полупрозрачный пунктир */}
        {gapSegments.map((seg, i) => (
          <Polyline
            key={`gap-${i}`}
            positions={seg}
            pathOptions={{ color: "#166534", weight: 3, opacity: 0.45, dashArray: "4 8", lineCap: "round" }}
          />
        ))}

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

        {/* Направление движения по GPS — сплошная синяя линия из текущей точки */}
        {movementLine && (
          <Polyline
            positions={movementLine}
            pathOptions={{ color: "#3b82f6", weight: 5, opacity: 0.95, lineCap: "round" }}
          />
        )}

        <Marker position={[anchor.lat, anchor.lng]} icon={anchorIcon} title={t("anchorTitle")} />
        {current && <Marker position={[current.lat, current.lng]} icon={currentIcon} />}

        <InitialFit points={allPoints} />
        <FitAllButton points={allPoints} label={t("fitAll")} />
      </MapContainer>
    </div>
  );
}
