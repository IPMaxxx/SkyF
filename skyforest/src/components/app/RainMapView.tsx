"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const centerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const BELARUS_CENTER: [number, number] = [53.9, 27.56];

interface GridPoint {
  lat: number;
  lng: number;
  rain_total: number;
  rain_daily: number[];
  temp_mean: number;
  temp_daily_max?: number[];
  temp_daily_min?: number[];
  dates?: string[];
}

interface Props {
  centerLat: number | null;
  centerLng: number | null;
  radius: number;
  step: number;
  gridData: GridPoint[];
  onCenterSelect: (lat: number, lng: number) => void;
}

function rainColor(rain: number, maxRain: number): string {
  if (maxRain <= 0) return "#dbeafe";
  const ratio = Math.min(rain / maxRain, 1);

  if (ratio < 0.15) return "#dbeafe";
  if (ratio < 0.25) return "#bfdbfe";
  if (ratio < 0.35) return "#93c5fd";
  if (ratio < 0.45) return "#22d3ee";
  if (ratio < 0.55) return "#4ade80";
  if (ratio < 0.65) return "#facc15";
  if (ratio < 0.80) return "#fb923c";
  return "#ef4444";
}

function daysAgoLabel(dateStr: string): string {
  const diff = Math.round(
    (Date.now() - new Date(dateStr).getTime()) / 86_400_000
  );
  if (diff === 0) return "сегодня";
  if (diff === 1) return "1 день назад";
  if (diff >= 2 && diff <= 4) return `${diff} дня назад`;
  return `${diff} дней назад`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

function PointPopup({ point }: { point: GridPoint }) {
  const hasDaily = point.dates && point.dates.length > 0;

  let maxTemp: { val: number; date: string } | null = null;
  let minTemp: { val: number; date: string } | null = null;
  let maxRainDay: { val: number; date: string } | null = null;

  if (hasDaily) {
    const dates = point.dates!;

    if (point.temp_daily_max && point.temp_daily_max.length > 0) {
      let idx = 0;
      for (let i = 1; i < point.temp_daily_max.length; i++) {
        if (point.temp_daily_max[i] > point.temp_daily_max[idx]) idx = i;
      }
      maxTemp = { val: point.temp_daily_max[idx], date: dates[idx] };
    }

    if (point.temp_daily_min && point.temp_daily_min.length > 0) {
      let idx = 0;
      for (let i = 1; i < point.temp_daily_min.length; i++) {
        if (point.temp_daily_min[i] < point.temp_daily_min[idx]) idx = i;
      }
      minTemp = { val: point.temp_daily_min[idx], date: dates[idx] };
    }

    if (point.rain_daily.length > 0) {
      let idx = 0;
      for (let i = 1; i < point.rain_daily.length; i++) {
        if (point.rain_daily[i] > point.rain_daily[idx]) idx = i;
      }
      if (point.rain_daily[idx] > 0) {
        maxRainDay = { val: point.rain_daily[idx], date: dates[idx] };
      }
    }
  }

  return (
    <div className="text-sm min-w-[200px]">
      <p className="font-bold text-blue-600 text-base">
        🌧 {point.rain_total.toFixed(1)} мм
      </p>
      <p className="text-gray-600 mt-1">
        t° средняя: {point.temp_mean.toFixed(1)}°C
      </p>

      {maxTemp && (
        <p className="text-gray-600 mt-0.5">
          <span className="text-red-500">▲</span> Макс: {maxTemp.val.toFixed(1)}°C
          — {formatDate(maxTemp.date)}{" "}
          <span className="text-gray-400">({daysAgoLabel(maxTemp.date)})</span>
        </p>
      )}
      {minTemp && (
        <p className="text-gray-600 mt-0.5">
          <span className="text-blue-500">▼</span> Мин: {minTemp.val.toFixed(1)}°C
          — {formatDate(minTemp.date)}{" "}
          <span className="text-gray-400">({daysAgoLabel(minTemp.date)})</span>
        </p>
      )}
      {maxRainDay && (
        <p className="text-gray-600 mt-0.5">
          <span className="text-blue-500">💧</span> Макс дождь: {maxRainDay.val.toFixed(1)} мм
          — {formatDate(maxRainDay.date)}{" "}
          <span className="text-gray-400">({daysAgoLabel(maxRainDay.date)})</span>
        </p>
      )}

      <p className="text-xs text-gray-400 mt-1.5 border-t border-gray-200 pt-1">
        {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
      </p>
    </div>
  );
}

function ClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RadiusCircle({ lat, lng, radius }: { lat: number; lng: number; radius: number }) {
  return (
    <Circle
      center={[lat, lng]}
      radius={radius * 1000}
      pathOptions={{
        color: "#3b82f6",
        weight: 2,
        dashArray: "8 4",
        fillOpacity: 0.03,
      }}
    />
  );
}

function FitToRadius({ lat, lng, radiusKm }: { lat: number; lng: number; radiusKm: number }) {
  const map = useMap();
  useEffect(() => {
    const center = L.latLng(lat, lng);
    const bounds = center.toBounds(radiusKm * 2 * 1000);
    map.flyToBounds(bounds, { padding: [30, 30], duration: 0.8 });
  }, [lat, lng, radiusKm, map]);
  return null;
}

export function RainMapView({
  centerLat,
  centerLng,
  radius,
  step,
  gridData,
  onCenterSelect,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl bg-muted">
        <p className="text-sm text-muted-foreground">Загрузка карты...</p>
      </div>
    );
  }

  const maxRain = gridData.length > 0 ? Math.max(...gridData.map((p) => p.rain_total), 1) : 1;
  const cellRadius = (step * 1000) / 2;

  return (
    <div className="overflow-hidden rounded-2xl border border-border h-full">
      <MapContainer
        center={centerLat && centerLng ? [centerLat, centerLng] : BELARUS_CENTER}
        zoom={centerLat ? 9 : 7}
        className="h-full w-full"
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClickHandler onSelect={onCenterSelect} />

        {centerLat !== null && centerLng !== null && (
          <>
            <FitToRadius lat={centerLat} lng={centerLng} radiusKm={radius} />
            <Marker position={[centerLat, centerLng]} icon={centerIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-medium">Центр</p>
                  <p>{centerLat.toFixed(4)}, {centerLng.toFixed(4)}</p>
                  <p>Радиус: {radius} км, шаг: {step} км</p>
                </div>
              </Popup>
            </Marker>
            <RadiusCircle lat={centerLat} lng={centerLng} radius={radius} />
          </>
        )}

        {gridData.map((point, i) => (
          <Circle
            key={`rain-${i}`}
            center={[point.lat, point.lng]}
            radius={cellRadius}
            pathOptions={{
              fillColor: rainColor(point.rain_total, maxRain),
              fillOpacity: 0.65,
              color: rainColor(point.rain_total, maxRain),
              weight: 1,
              opacity: 0.4,
            }}
          >
            <Popup>
              <PointPopup point={point} />
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
}
