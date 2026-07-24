"use client";

/**
 * Превью скачанной офлайн-зоны: полноэкранная карта, отцентрованная на регионе,
 * с прямоугольником его границ. Открывается по клику на участок в списке
 * OfflineMapManager, чтобы наглядно показать, что именно скачано.
 */

import { useEffect } from "react";
import { MapContainer, Rectangle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { X } from "lucide-react";
import { OfflineTileLayer } from "@/components/app/OfflineTileLayer";
import { OUTDOOR_SOURCE, type DownloadedRegion } from "@/lib/offline/tileStore";

function FitToBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, bounds]);
  return null;
}

interface Props {
  region: DownloadedRegion;
  onClose: () => void;
  closeLabel: string;
}

export function RegionPreview({ region, onClose, closeLabel }: Props) {
  const b = region.bbox;
  const bounds: L.LatLngBoundsExpression = [
    [b.south, b.west],
    [b.north, b.east],
  ];

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col bg-black/70 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="truncate text-sm font-semibold text-white">{region.name}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          title={closeLabel}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <MapContainer
          bounds={bounds}
          className="h-full w-full"
          zoomControl={true}
          attributionControl={false}
        >
          <OfflineTileLayer source={OUTDOOR_SOURCE} maxNativeZoom={6} maxZoom={19} />
          <OfflineTileLayer source={OUTDOOR_SOURCE} maxNativeZoom={18} maxZoom={19} />
          <Rectangle
            bounds={bounds}
            pathOptions={{ color: "#10b981", weight: 2, fillColor: "#10b981", fillOpacity: 0.1 }}
          />
          <FitToBounds bounds={bounds} />
        </MapContainer>
      </div>
    </div>
  );
}
