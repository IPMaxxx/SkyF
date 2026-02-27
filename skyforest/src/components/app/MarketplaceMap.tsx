"use client";

import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MarketplaceListing } from "@/lib/supabase/types";
import { getSeasonLabel } from "@/lib/supabase/types";

const BELARUS_CENTER: [number, number] = [53.9, 27.56];

const ZONE_RADIUS_M = 8000;

const SEASON_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  winter: { fill: "#3b82f6", stroke: "#60a5fa", text: "#93bbfd" },
  spring: { fill: "#22c55e", stroke: "#4ade80", text: "#86efac" },
  summer: { fill: "#eab308", stroke: "#facc15", text: "#fde047" },
  autumn: { fill: "#f97316", stroke: "#fb923c", text: "#fdba74" },
};

function FitBounds({ listings }: { listings: MarketplaceListing[] }) {
  const map = useMap();
  useEffect(() => {
    if (listings.length === 0) return;
    const points = listings
      .filter((l) => l.best_day?.location)
      .map(
        (l) =>
          [l.best_day!.location!.lat, l.best_day!.location!.lng] as [number, number]
      );
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 9 });
    }
  }, [listings, map]);
  return null;
}

function FlyToSelected({ listings, selectedId }: { listings: MarketplaceListing[]; selectedId: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!selectedId) return;
    const listing = listings.find((l) => l.id === selectedId);
    const loc = listing?.best_day?.location;
    if (loc) {
      map.flyTo([loc.lat, loc.lng], 10, { duration: 0.8 });
    }
  }, [selectedId, listings, map]);
  return null;
}

interface Props {
  listings: MarketplaceListing[];
  selectedId: string | null;
  onSelect: (listing: MarketplaceListing) => void;
  onBuy: (listing: MarketplaceListing) => void;
}

export function MarketplaceMap({
  listings,
  selectedId,
  onSelect,
  onBuy,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl bg-white/5">
        <p className="text-sm text-muted-foreground">Загрузка карты...</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border h-full">
      <MapContainer
        center={BELARUS_CENTER}
        zoom={7}
        className="h-full w-full"
        zoomControl={true}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds listings={listings} />
        <FlyToSelected listings={listings} selectedId={selectedId} />

        {listings.map((listing) => {
          const loc = listing.best_day?.location;
          if (!loc) return null;

          const colors =
            SEASON_COLORS[listing.season] ?? SEASON_COLORS.autumn;
          const isSelected = listing.id === selectedId;

          return (
            <Circle
              key={listing.id}
              center={[loc.lat, loc.lng]}
              radius={ZONE_RADIUS_M}
              pathOptions={{
                fillColor: colors.fill,
                fillOpacity: isSelected ? 0.45 : 0.3,
                color: colors.stroke,
                weight: isSelected ? 3.5 : 2.5,
                opacity: isSelected ? 1 : 0.8,
              }}
              eventHandlers={{
                click: () => onSelect(listing),
              }}
            >
              <Popup maxWidth={320} minWidth={260}>
                <ListingPopup listing={listing} onBuy={() => onBuy(listing)} />
              </Popup>
            </Circle>
          );
        })}
      </MapContainer>
    </div>
  );
}

function ListingPopup({
  listing,
  onBuy,
}: {
  listing: MarketplaceListing;
  onBuy: () => void;
}) {
  const bd = listing.best_day;
  const loc = bd?.location;
  const mushroom = bd?.mushroom;
  const seller = listing.seller;
  const colors = SEASON_COLORS[listing.season] ?? SEASON_COLORS.autumn;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: 1.5 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        {mushroom?.image_url ? (
          <img
            src={mushroom.image_url}
            alt={mushroom.latin_name}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 20,
            }}
          >
            ★
          </div>
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {bd?.name ?? "Best Day"}
          </div>
          {mushroom && (
            <div style={{ fontSize: 11, color: "#888", fontStyle: "italic" }}>
              {mushroom.common_name || mushroom.latin_name}
            </div>
          )}
        </div>
      </div>

      {/* Info rows */}
      <div
        style={{
          fontSize: 12,
          display: "flex",
          flexDirection: "column",
          gap: 5,
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#888" }}>Продавец:</span>
          <span style={{ fontWeight: 500 }}>
            {seller?.full_name || "Пользователь"}
          </span>
        </div>
        {loc && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#888" }}>Район:</span>
            <span style={{ fontWeight: 500 }}>{loc.name}</span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#888" }}>Сезон:</span>
          <span
            style={{
              fontWeight: 600,
              color: colors.stroke,
              background: `${colors.fill}22`,
              padding: "1px 8px",
              borderRadius: 6,
              fontSize: 11,
            }}
          >
            {getSeasonLabel(listing.season)}
          </span>
        </div>
        {loc?.forest_info && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#888" }}>Лес:</span>
            <span style={{ fontWeight: 500 }}>
              {loc.forest_info.forest_type === "coniferous"
                ? "Хвойный"
                : loc.forest_info.forest_type === "broadleaved"
                ? "Лиственный"
                : loc.forest_info.forest_type === "mixed"
                ? "Смешанный"
                : "Не определён"}
            </span>
          </div>
        )}
      </div>

      {/* Photos preview */}
      {bd?.photos && bd.photos.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 10,
            overflowX: "auto",
          }}
        >
          {bd.photos.slice(0, 3).map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              style={{
                width: 64,
                height: 48,
                objectFit: "cover",
                borderRadius: 6,
              }}
            />
          ))}
          {bd.photos.length > 3 && (
            <div
              style={{
                width: 64,
                height: 48,
                borderRadius: 6,
                background: "rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              +{bd.photos.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Hidden data notice */}
      <div
        style={{
          fontSize: 11,
          color: "#f59e0b",
          background: "rgba(245,158,11,0.1)",
          padding: "6px 8px",
          borderRadius: 6,
          marginBottom: 10,
          border: "1px solid rgba(245,158,11,0.2)",
        }}
      >
        Зона ~8 км. Точные координаты и погодный паттерн откроются после покупки
      </div>

      {/* Buy button */}
      <button
        onClick={onBuy}
        style={{
          width: "100%",
          padding: "8px 0",
          borderRadius: 8,
          background: "linear-gradient(135deg, #10b981, #059669)",
          color: "#fff",
          fontWeight: 600,
          fontSize: 13,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        Купить · {listing.price} токенов
      </button>
    </div>
  );
}
