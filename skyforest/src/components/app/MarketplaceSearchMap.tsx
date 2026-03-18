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

const sellingIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:24px;height:24px;background:#f59e0b;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/></svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const purchasedIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:24px;height:24px;background:#10b981;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
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
  id: string;
  lat: number;
  lng: number;
  name: string;
  type?: "selling" | "purchased";
}

export interface ListingSpot {
  id: string;
  lat: number;
  lng: number;
  name: string;
  mushroomName?: string;
  price: number;
}

interface Props {
  centerLat: number | null;
  centerLng: number | null;
  radiusKm: number;
  ownedDays: OwnedBestDay[];
  listingSpots?: ListingSpot[];
  onSelect: (lat: number, lng: number) => void;
  onSpotClick?: (id: string) => void;
}

const SPOT_CIRCLE_RADIUS = 10000; // 10 km = d20 km

export function MarketplaceSearchMap({
  centerLat,
  centerLng,
  radiusKm,
  ownedDays,
  listingSpots = [],
  onSelect,
  onSpotClick,
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

      {listingSpots.map((spot) => (
        <Circle
          key={`spot-${spot.id}`}
          center={[spot.lat, spot.lng]}
          radius={SPOT_CIRCLE_RADIUS}
          pathOptions={{
            color: "#059669",
            fillColor: "#065f46",
            fillOpacity: 0.35,
            weight: 2.5,
          }}
          eventHandlers={onSpotClick ? {
            click: () => onSpotClick(spot.id),
          } : undefined}
        >
          <Popup>
            <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13 }}>
              <p style={{ fontWeight: 600, marginBottom: 2 }}>{spot.name}</p>
              {spot.mushroomName && (
                <p style={{ color: "#888", fontSize: 11, fontStyle: "italic", marginBottom: 4 }}>
                  {spot.mushroomName}
                </p>
              )}
              <p style={{ color: "#f59e0b", fontWeight: 600, fontSize: 12 }}>
                {spot.price} токенов
              </p>
            </div>
          </Popup>
        </Circle>
      ))}

      {ownedDays.map((d, i) => {
        const isSelling = d.type === "selling";
        return (
          <Marker key={`owned-${i}`} position={[d.lat, d.lng]} icon={isSelling ? sellingIcon : purchasedIcon}>
            <Popup>
              <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 13 }}>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>{isSelling ? "★" : "✓"} {d.name}</p>
                <p style={{ color: "#888", fontSize: 11, marginBottom: 6 }}>
                  {isSelling ? "Выставлено на продажу" : "Купленная локация"}
                </p>
                <a
                  href={`/dashboard/best-day/${d.id}`}
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: 6,
                    background: isSelling ? "#f59e0b" : "#10b981",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Открыть →
                </a>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
