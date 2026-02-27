"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pinIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
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
