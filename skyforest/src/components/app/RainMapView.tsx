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

const centerIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:30px;height:30px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M17 10c0 4.4-5 9-5 9s-5-4.6-5-9a5 5 0 1 1 10 0Z"/><circle cx="12" cy="10" r="1.5"/></svg>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
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

interface UserLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface UserLocationLabels {
  unitMm: string;
  rainForDays: string;
  outOfArea: string;
  nearestPoint: string;
}

interface Props {
  centerLat: number | null;
  centerLng: number | null;
  radius: number;
  step: number;
  gridData: GridPoint[];
  onCenterSelect: (lat: number, lng: number) => void;
  userLocations?: UserLocation[];
  showUserLocations?: boolean;
  userLocationLabels?: UserLocationLabels;
}

// Приблизительное расстояние в км (равнопрямоугольная проекция).
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = (bLat - aLat) * 111.32;
  const dLng =
    (bLng - aLng) * 111.32 * Math.cos((((aLat + bLat) / 2) * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

// Ближайшая точка сетки осадков к заданным координатам.
function nearestGridPoint(
  lat: number,
  lng: number,
  grid: GridPoint[]
): { point: GridPoint; distKm: number } | null {
  let best: GridPoint | null = null;
  let bestDist = Infinity;
  for (const p of grid) {
    const d = distanceKm(lat, lng, p.lat, p.lng);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best ? { point: best, distKm: bestDist } : null;
}

// Маркер пользовательской локации: изумрудная «булавка» с бейджем осадков.
function userLocationIcon(badgeText: string | null): L.DivIcon {
  const badge = badgeText
    ? `<div style="position:absolute;bottom:34px;left:50%;transform:translateX(-50%);white-space:nowrap;background:#fff;color:#065f46;font-size:11px;font-weight:700;line-height:1;padding:3px 6px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.35);border:1px solid #10b981">${badgeText}</div>`
    : "";
  return new L.DivIcon({
    className: "",
    html: `<div style="position:relative;width:28px;height:34px">
      ${badge}
      <svg width="28" height="34" viewBox="0 0 24 30" fill="#10b981" stroke="#fff" stroke-width="2" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))">
        <path d="M12 1C6.5 1 2 5.4 2 10.8 2 18 12 29 12 29s10-11 10-18.2C22 5.4 17.5 1 12 1Z"/>
        <circle cx="12" cy="11" r="3.5" fill="#fff" stroke="none"/>
      </svg>
    </div>`,
    iconSize: [28, 34],
    iconAnchor: [14, 30],
    popupAnchor: [0, -28],
  });
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
  userLocations = [],
  showUserLocations = false,
  userLocationLabels,
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

  // Локация считается «покрытой» картой, если ближайшая точка сетки не дальше
  // полутора шагов — за пределами круга расстояние быстро растёт.
  const sampleThresholdKm = Math.max(step, 2) * 1.5;
  const showLocations =
    showUserLocations && gridData.length > 0 && userLocations.length > 0;

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

        {showLocations &&
          userLocations.map((loc) => {
            const nearest = nearestGridPoint(loc.lat, loc.lng, gridData);
            const inArea = nearest !== null && nearest.distKm <= sampleThresholdKm;
            const rainVal = inArea ? nearest!.point.rain_total : null;
            const unit = userLocationLabels?.unitMm ?? "мм";
            const badge =
              rainVal !== null ? `${rainVal.toFixed(1)} ${unit}` : null;
            return (
              <Marker
                key={`loc-${loc.id}`}
                position={[loc.lat, loc.lng]}
                icon={userLocationIcon(badge)}
                zIndexOffset={1000}
              >
                <Popup>
                  <div className="text-sm min-w-[180px]">
                    <p className="font-bold text-emerald-600 text-base flex items-center gap-1">
                      📍 {loc.name}
                    </p>
                    {rainVal !== null ? (
                      <p className="text-gray-700 mt-1">
                        🌧 {rainVal.toFixed(1)} {unit}
                        <span className="text-gray-400 text-xs">
                          {" "}
                          · {userLocationLabels?.rainForDays ?? ""}
                        </span>
                      </p>
                    ) : (
                      <p className="text-gray-500 mt-1">
                        {userLocationLabels?.outOfArea ?? ""}
                      </p>
                    )}
                    {nearest && (
                      <p className="text-xs text-gray-400 mt-1.5 border-t border-gray-200 pt-1">
                        ≈{nearest.distKm.toFixed(1)}{" "}
                        {userLocationLabels?.nearestPoint ?? ""}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}
