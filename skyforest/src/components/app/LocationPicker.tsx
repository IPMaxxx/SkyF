"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pinIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:30px;height:30px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M17 10c0 4.4-5 9-5 9s-5-4.6-5-9a5 5 0 1 1 10 0Z"/><circle cx="12" cy="10" r="1.5"/></svg>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const BELARUS_CENTER: [number, number] = [53.9, 27.56];

function ClickHandler({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface Props {
  lat: number | null;
  lng: number | null;
  onSelect: (lat: number, lng: number) => void;
}

export function LocationPicker({ lat, lng, onSelect }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl bg-muted">
        <p className="text-sm text-muted-foreground">Загрузка карты...</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={lat && lng ? [lat, lng] : BELARUS_CENTER}
        zoom={lat && lng ? 12 : 7}
        className="h-[400px] w-full"
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {lat !== null && lng !== null && (
          <Marker position={[lat, lng]} icon={pinIcon} />
        )}
        <ClickHandler onSelect={onSelect} />
      </MapContainer>
    </div>
  );
}
