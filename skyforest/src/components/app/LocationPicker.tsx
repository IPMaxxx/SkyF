"use client";

import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, Loader2 } from "lucide-react";
import { getCurrentPosition } from "@/lib/native/geolocation";

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

function FlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  const prevRef = useRef<string>("");

  useEffect(() => {
    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (key === prevRef.current) return;
    prevRef.current = key;
    map.flyTo([lat, lng], zoom ?? 14, { duration: 1 });
  }, [map, lat, lng, zoom]);

  return null;
}

interface Props {
  lat: number | null;
  lng: number | null;
  flyToLat?: number | null;
  flyToLng?: number | null;
  flyToZoom?: number;
  onSelect: (lat: number, lng: number) => void;
}

export function LocationPicker({ lat, lng, flyToLat, flyToLng, flyToZoom, onSelect }: Props) {
  const [mounted, setMounted] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  useEffect(() => setMounted(true), []);

  const handleLocate = async () => {
    setGeoError("");
    setLocating(true);
    try {
      const { lat: gLat, lng: gLng } = await getCurrentPosition();
      onSelect(gLat, gLng);
    } catch {
      setGeoError("Не удалось определить местоположение");
    } finally {
      setLocating(false);
    }
  };
  if (!mounted) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl bg-muted">
        <p className="text-sm text-muted-foreground">Загрузка карты...</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border">
      <button
        type="button"
        onClick={handleLocate}
        disabled={locating}
        aria-label="Моё местоположение"
        title="Моё местоположение"
        className="absolute bottom-3 right-3 z-[1000] flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-colors hover:bg-primary-dark disabled:opacity-60"
      >
        {locating ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <LocateFixed className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
      {geoError && (
        <div className="absolute bottom-3 left-3 z-[1000] rounded-lg bg-red-500/90 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
          {geoError}
        </div>
      )}
      <MapContainer
        center={lat && lng ? [lat, lng] : BELARUS_CENTER}
        zoom={lat && lng ? 12 : 7}
        className="h-[400px] w-full"
        zoomControl={true}
        attributionControl={false}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Карта">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Спутник">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        {lat !== null && lng !== null && (
          <Marker position={[lat, lng]} icon={pinIcon} />
        )}
        <ClickHandler onSelect={onSelect} />
        {flyToLat != null && flyToLng != null && (
          <FlyTo lat={flyToLat} lng={flyToLng} zoom={flyToZoom} />
        )}
      </MapContainer>
    </div>
  );
}
