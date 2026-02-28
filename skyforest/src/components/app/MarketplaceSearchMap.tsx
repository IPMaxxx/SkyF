"use client";

import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Popup,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BELARUS_CENTER: [number, number] = [53.9, 27.56];

const searchIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:30px;height:30px;background:#e11d48;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="11" cy="11" r="6"/><path d="m21 21-4-4"/></svg>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const ownedIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:24px;height:24px;background:#f59e0b;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/></svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function ClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface OwnedBestDay {
  lat: number;
  lng: number;
  name: string;
}

interface Props {
  centerLat: number | null;
  centerLng: number | null;
  radiusKm: number;
  ownedDays: OwnedBestDay[];
  onSelect: (lat: number, lng: number) => void;
}

export function MarketplaceSearchMap({
  centerLat,
  centerLng,
  radiusKm,
  ownedDays,
  onSelect,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex h-[300px] items-center justify-center bg-white/5">
        <p className="text-sm text-muted-foreground">Загрузка карты...</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={
        centerLat && centerLng ? [centerLat, centerLng] : BELARUS_CENTER
      }
      zoom={centerLat ? 9 : 7}
      className="h-[300px] w-full"
      zoomControl={true}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler onSelect={onSelect} />

      {centerLat !== null && centerLng !== null && (
        <>
          <Marker position={[centerLat, centerLng]} icon={searchIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-medium">Центр поиска</p>
                <p className="text-gray-500">Радиус: {radiusKm} км</p>
              </div>
            </Popup>
          </Marker>
          <Circle
            center={[centerLat, centerLng]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: "#e11d48",
              fillColor: "#e11d48",
              fillOpacity: 0.08,
              weight: 2,
              dashArray: "6 4",
            }}
          />
        </>
      )}

      {ownedDays.map((d, i) => (
        <Marker key={`owned-${i}`} position={[d.lat, d.lng]} icon={ownedIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-medium">★ {d.name}</p>
              <p className="text-gray-500">Ваш Best Day</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
