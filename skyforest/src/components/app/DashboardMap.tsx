"use client";

import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Location } from "@/lib/supabase/types";
import type { BestDaySummary } from "@/lib/AppDataContext";

const locationIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:32px;height:32px;background:#10b981;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M17 10c0 4.4-5 9-5 9s-5-4.6-5-9a5 5 0 1 1 10 0Z"/><circle cx="12" cy="10" r="1.5"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const bestDayIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:32px;height:32px;background:#f59e0b;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" stroke="#fff" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

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
}

export function DashboardMap({ locations, bestDays }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const locMap = new Map(locations.map((l) => [l.id, l]));

  const bestDayMarkers = bestDays
    .map((bd) => {
      const loc = locMap.get(bd.location_id);
      if (!loc) return null;
      return { ...bd, lat: loc.lat, lng: loc.lng };
    })
    .filter(Boolean) as (BestDaySummary & { lat: number; lng: number })[];

  const allPoints: [number, number][] = [
    ...locations.map((l) => [l.lat, l.lng] as [number, number]),
    ...bestDayMarkers.map((bd) => [bd.lat, bd.lng] as [number, number]),
  ];

  if (!mounted) {
    return (
      <div className="flex h-[300px] sm:h-[360px] items-center justify-center rounded-xl bg-muted">
        <p className="text-sm text-muted-foreground">Загрузка карты...</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={[53.9, 27.56]}
        zoom={7}
        className="h-[300px] sm:h-[360px] w-full"
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {locations.map((loc) => (
          <Marker key={`loc-${loc.id}`} position={[loc.lat, loc.lng]} icon={locationIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{loc.name}</p>
                <p className="text-xs text-gray-500">
                  {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {bestDayMarkers.map((bd) => (
          <Marker key={`bd-${bd.id}`} position={[bd.lat, bd.lng]} icon={bestDayIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{bd.name}</p>
                <p className="text-xs text-gray-500">
                  {bd.location?.name} &middot;{" "}
                  {new Date(bd.best_date).toLocaleDateString("ru-RU")}
                </p>
                {bd.mushroom && (
                  <p className="text-xs italic text-gray-400">{bd.mushroom.latin_name}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {allPoints.length > 0 && <FitBounds points={allPoints} />}
      </MapContainer>

      <div className="flex items-center gap-4 px-3 py-2 text-xs text-muted-foreground bg-card/50">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-emerald-500 border border-white shadow-sm" />
          Локации
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-amber-500 border border-white shadow-sm" />
          Грибные дни
        </span>
      </div>
    </div>
  );
}
