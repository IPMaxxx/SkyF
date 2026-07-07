"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, LayersControl, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useIsNative } from "@/lib/native/useIsNative";
import { getCurrentPosition } from "@/lib/native/geolocation";
import type { Location } from "@/lib/supabase/types";
import type { BestDaySummary } from "@/lib/AppDataContext";

/**
 * Native: диаметр области (~10 км), на которую зумируется карта при выборе
 * точки или определении своей геопозиции. `LatLng.toBounds(size)` строит
 * квадрат со стороной `size` метров вокруг точки — fitBounds по нему даёт
 * нужный масштаб.
 */
const NATIVE_ZOOM_DIAMETER_M = 10_000;

const locationIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:32px;height:32px;background:#10b981;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;cursor:pointer">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M17 10c0 4.4-5 9-5 9s-5-4.6-5-9a5 5 0 1 1 10 0Z"/><circle cx="12" cy="10" r="1.5"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function makeBestDayIcon(count: number) {
  return new L.DivIcon({
    className: "",
    html: `<div style="position:relative;width:32px;height:32px;background:#f59e0b;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;cursor:pointer">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" stroke="#fff" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      ${count > 1 ? `<div style="position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;background:#ef4444;border:2px solid #fff;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;padding:0 3px">${count}</div>` : ""}
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

const queryIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:30px;height:30px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

type Filter = "all" | "locations" | "bestDays";

/**
 * Выбранная на карте точка (native-режим). Прокидывается через `onPointSelect`
 * в родительский дашборд, который на её основе строит панель действий.
 */
export type MapSelection =
  | { kind: "location"; lat: number; lng: number; location: Location }
  | {
      kind: "bestDay";
      lat: number;
      lng: number;
      location: Location;
      bestDay: BestDaySummary;
    }
  | { kind: "empty"; lat: number; lng: number };

/** Клик по свободному месту карты открывает попап быстрых действий. */
function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function QueryMarker({
  lat,
  lng,
  onWeather,
  onForest,
  labels,
}: {
  lat: number;
  lng: number;
  onWeather: () => void;
  onForest: () => void;
  labels: { title: string; hint: string; weather: string; forest: string };
}) {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    markerRef.current?.openPopup();
  }, [lat, lng]);

  return (
    <Marker position={[lat, lng]} icon={queryIcon} ref={markerRef}>
      <Popup minWidth={220} maxWidth={260}>
        <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13 }}>
          <p style={{ fontWeight: 600, marginBottom: 2 }}>{labels.title}</p>
          <p style={{ color: "#888", fontSize: 11, marginBottom: 8 }}>
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </p>
          <p style={{ color: "#888", fontSize: 11, marginBottom: 8 }}>{labels.hint}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button
              type="button"
              onClick={onWeather}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 44,
                borderRadius: 8,
                background: "#0284c7",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                padding: "0 12px",
              }}
            >
              {labels.weather}
            </button>
            <button
              type="button"
              onClick={onForest}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 44,
                borderRadius: 8,
                background: "#10b981",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                padding: "0 12px",
              }}
            >
              {labels.forest}
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

/** Пробрасывает инстанс leaflet-карты наружу (для flyTo из обработчиков). */
function MapRefBinder({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    return () => {
      mapRef.current = null;
    };
  }, [map, mapRef]);
  return null;
}

/**
 * Native: FAB «Моя геопозиция» поверх карты. По тапу — getCurrentPosition()
 * и выбор найденной точки через `onLocated` (тот же путь, что тап по пустому
 * месту карты: синий пин + панель действий + зум ~10 км). Zoom-контролы
 * leaflet — слева сверху, LayersControl — справа сверху, поэтому FAB внизу
 * справа.
 */
function LocateButton({
  label,
  deniedMessage,
  onLocated,
}: {
  label: string;
  deniedMessage: string;
  onLocated: (lat: number, lng: number) => void;
}) {
  const [locating, setLocating] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Тап по кнопке не должен долетать до карты (иначе выберется точка).
  useEffect(() => {
    if (!btnRef.current) return;
    L.DomEvent.disableClickPropagation(btnRef.current);
  }, []);

  const handleLocate = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      // Зум делает handleNativeSelect (flyToBounds) — здесь не дублируем.
      onLocated(pos.lat, pos.lng);
    } catch {
      toast.error(deniedMessage);
    } finally {
      setLocating(false);
    }
  };

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleLocate}
      aria-label={label}
      title={label}
      className="absolute bottom-3 right-3 z-[1000] flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-700 shadow-[0_2px_10px_rgba(0,0,0,0.35)] transition-colors hover:bg-gray-100 active:bg-gray-200"
    >
      {locating ? (
        <Loader2 className="h-5 w-5 animate-spin text-emerald-600" aria-hidden="true" />
      ) : (
        <LocateFixed className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || points.length === 0) return;
    fitted.current = true;

    if (points.length === 1) {
      map.setView(points[0], 11);
    } else {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [map, points]);

  return null;
}

interface Props {
  locations: Location[];
  bestDays: BestDaySummary[];
  /** Native-режим: клик по карте/маркеру выбирает точку вместо веб-попапа. */
  native?: boolean;
  /** Точка «пустого» выбора в native — рисуем синий маркер-цель. */
  nativeSelectedPoint?: { lat: number; lng: number } | null;
  /** Колбэк выбора точки (только native). */
  onPointSelect?: (sel: MapSelection) => void;
}

export function DashboardMap({
  locations,
  bestDays,
  native = false,
  nativeSelectedPoint = null,
  onPointSelect,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [queryPoint, setQueryPoint] = useState<{ lat: number; lng: number } | null>(null);
  const router = useRouter();
  const tActions = useTranslations("dashboard.mapActions");
  const tMap = useTranslations("dashboard.map");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isNative = useIsNative();
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => setMounted(true), []);

  /**
   * Native: выбор точки (тап по карте или маркеру) — помимо колбэка наружу,
   * плавно зумируем карту на точку с областью «диаметр ~10 км».
   */
  const handleNativeSelect = useCallback(
    (sel: MapSelection) => {
      onPointSelect?.(sel);
      mapRef.current?.flyToBounds(
        L.latLng(sel.lat, sel.lng).toBounds(NATIVE_ZOOM_DIAMETER_M),
        { duration: 0.8 },
      );
    },
    [onPointSelect],
  );

  const locMap = useMemo(
    () => new Map(locations.map((l) => [l.id, l])),
    [locations]
  );

  const bestDayMarkers = useMemo(
    () =>
      bestDays
        .map((bd) => {
          const loc = locMap.get(bd.location_id);
          if (!loc) return null;
          return { ...bd, lat: loc.lat, lng: loc.lng };
        })
        .filter(Boolean) as (BestDaySummary & { lat: number; lng: number })[],
    [bestDays, locMap]
  );

  const groupedBestDays = useMemo(() => {
    const groups = new Map<string, (BestDaySummary & { lat: number; lng: number })[]>();
    for (const bd of bestDayMarkers) {
      const key = bd.location_id;
      const arr = groups.get(key) || [];
      arr.push(bd);
      groups.set(key, arr);
    }
    return Array.from(groups.values());
  }, [bestDayMarkers]);

  const showLocations = filter === "all" || filter === "locations";
  const showBestDays = filter === "all" || filter === "bestDays";

  const allPoints: [number, number][] = [
    ...(showLocations
      ? locations.map((l) => [l.lat, l.lng] as [number, number])
      : []),
    ...(showBestDays
      ? bestDayMarkers.map((bd) => [bd.lat, bd.lng] as [number, number])
      : []),
  ];

  if (!mounted) {
    return (
      <div className="flex h-[300px] sm:h-[360px] items-center justify-center rounded-xl bg-muted">
        <p className="text-sm text-muted-foreground">{tc("loadingMap")}</p>
      </div>
    );
  }

  const filterButtons: { value: Filter; label: string }[] = [
    { value: "all", label: tMap("filterAll") },
    { value: "locations", label: tMap("locations") },
    { value: "bestDays", label: tMap("bestDays") },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={[53.9, 27.56]}
        zoom={7}
        className="h-[300px] sm:h-[360px] w-full"
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

        {showLocations &&
          locations.map((loc) => (
            <Marker
              key={`loc-${loc.id}`}
              position={[loc.lat, loc.lng]}
              icon={locationIcon}
              eventHandlers={
                native
                  ? {
                      click: () =>
                        handleNativeSelect({
                          kind: "location",
                          lat: loc.lat,
                          lng: loc.lng,
                          location: loc,
                        }),
                    }
                  : undefined
              }
            >
              {!native && (
              <Popup>
                <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13 }}>
                  <p style={{ fontWeight: 600, marginBottom: 2 }}>{loc.name}</p>
                  <p style={{ color: "#888", fontSize: 11, marginBottom: 6 }}>
                    {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                  </p>
                  <a
                    href={`/dashboard/locations/${loc.id}`}
                    style={{
                      display: "inline-block",
                      padding: "4px 12px",
                      borderRadius: 6,
                      background: "#10b981",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    {tMap("open")}
                  </a>
                </div>
              </Popup>
              )}
            </Marker>
          ))}

        {showBestDays &&
          groupedBestDays.map((group) => {
            const first = group[0];
            const groupLoc = locMap.get(first.location_id);
            return (
              <Marker
                key={`bd-group-${first.location_id}`}
                position={[first.lat, first.lng]}
                icon={makeBestDayIcon(group.length)}
                eventHandlers={
                  native && groupLoc
                    ? {
                        click: () =>
                          handleNativeSelect({
                            kind: "bestDay",
                            lat: first.lat,
                            lng: first.lng,
                            location: groupLoc,
                            bestDay: first,
                          }),
                      }
                    : undefined
                }
              >
                {!native && (
                <Popup>
                  <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, maxHeight: 240, overflowY: "auto" }}>
                    {group.map((bd, i) => (
                      <div
                        key={bd.id}
                        style={{
                          padding: "8px 0",
                          borderTop: i > 0 ? "1px solid #e5e7eb" : "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          {bd.mushroom?.image_url ? (
                            <img
                              src={bd.mushroom.image_url}
                              alt=""
                              style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                            />
                          ) : null}
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{bd.name}</p>
                            <p style={{ color: "#888", fontSize: 11, margin: 0 }}>
                              {new Date(bd.best_date).toLocaleDateString(locale)}
                              {bd.mushroom ? ` · ${bd.mushroom.common_name || bd.mushroom.latin_name}` : ""}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`/dashboard/best-day/${bd.id}`}
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 6,
                            background: "#f59e0b",
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          {tMap("open")}
                        </a>
                      </div>
                    ))}
                  </div>
                </Popup>
                )}
              </Marker>
            );
          })}

        <MapClickHandler
          onPick={(lat, lng) => {
            if (native) {
              handleNativeSelect({ kind: "empty", lat, lng });
            } else {
              setQueryPoint({ lat, lng });
            }
          }}
        />

        {native && (
          <>
            <MapRefBinder mapRef={mapRef} />
            <LocateButton
              label={tActions("locateMe")}
              deniedMessage={tActions("locateDenied")}
              onLocated={(lat, lng) =>
                handleNativeSelect({ kind: "empty", lat, lng })
              }
            />
          </>
        )}

        {native && nativeSelectedPoint && (
          <Marker
            position={[nativeSelectedPoint.lat, nativeSelectedPoint.lng]}
            icon={queryIcon}
          />
        )}

        {!native && queryPoint && (
          <QueryMarker
            lat={queryPoint.lat}
            lng={queryPoint.lng}
            labels={{
              title: tActions("title"),
              hint: tActions("hint"),
              // В native кнопки переименованы: «Прогноз погоды» / «Тип леса».
              // На вебе — прежние подписи, чтобы не менять веб-версию.
              weather: tActions(isNative ? "weatherForecast" : "weather"),
              forest: tActions(isNative ? "forestType" : "forest"),
            }}
            onWeather={() =>
              router.push(
                `/dashboard/weather?lat=${queryPoint.lat.toFixed(6)}&lng=${queryPoint.lng.toFixed(6)}&tab=rain-map`
              )
            }
            onForest={() =>
              router.push(
                `/dashboard/forest-search?lat=${queryPoint.lat.toFixed(6)}&lng=${queryPoint.lng.toFixed(6)}`
              )
            }
          />
        )}

        {allPoints.length > 0 && <FitBounds points={allPoints} />}
      </MapContainer>

      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-card/50">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {showLocations && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-emerald-500 border border-white shadow-sm" />
              {tMap("locations")}
            </span>
          )}
          {showBestDays && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-amber-500 border border-white shadow-sm" />
              {tMap("bestDays")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === btn.value
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
