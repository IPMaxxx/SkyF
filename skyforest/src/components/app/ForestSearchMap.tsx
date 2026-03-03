"use client";

import { useState, useEffect } from "react";
import {
  MapContainer, TileLayer, Marker, Circle, Popup, useMapEvents, useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ForestMatch } from "@/app/api/forest-search/route";

const BELARUS_CENTER: [number, number] = [53.9, 27.56];

const GENUS_RU: Record<string, string> = {
  pinus: "Сосна", picea: "Ель", betula: "Берёза", quercus: "Дуб",
  alnus: "Ольха", populus: "Тополь", acer: "Клён", tilia: "Липа",
  salix: "Ива", fraxinus: "Ясень", ulmus: "Вяз", carpinus: "Граб",
  corylus: "Лещина", sorbus: "Рябина", fagus: "Бук", larix: "Лиственница",
  abies: "Пихта", juniperus: "Можжевельник", prunus: "Черёмуха",
  malus: "Яблоня", robinia: "Робиния",
};

const FOREST_LABELS: Record<string, string> = {
  coniferous: "Хвойный", broadleaved: "Лиственный", mixed: "Смешанный", unknown: "Не определён",
};

const refIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:28px;height:28px;background:#10b981;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M17 10c0 4.4-5 9-5 9s-5-4.6-5-9a5 5 0 1 1 10 0Z"/><circle cx="12" cy="10" r="1.5"/></svg>
  </div>`,
  iconSize: [28, 28], iconAnchor: [14, 14],
});

const searchIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:28px;height:28px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><circle cx="11" cy="11" r="6"/><path d="m21 21-4-4"/></svg>
  </div>`,
  iconSize: [28, 28], iconAnchor: [14, 14],
});

function makeResultIcon(similarity: number) {
  const color = similarity >= 70 ? "#10b981" : similarity >= 40 ? "#f59e0b" : "#6b7280";
  return new L.DivIcon({
    className: "",
    html: `<div style="width:26px;height:26px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">
      <span style="color:#fff;font-size:10px;font-weight:700">${similarity}</span>
    </div>`,
    iconSize: [26, 26], iconAnchor: [13, 13],
  });
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function FlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom ?? map.getZoom(), { duration: 0.8 });
  }, [lat, lng, zoom, map]);
  return null;
}

interface Props {
  step: "reference" | "search" | "results";
  refLat: number | null;
  refLng: number | null;
  searchLat: number | null;
  searchLng: number | null;
  radiusKm: number;
  matches: ForestMatch[];
  onClick: (lat: number, lng: number) => void;
}

export function ForestSearchMap({
  step, refLat, refLng, searchLat, searchLng, radiusKm, matches, onClick,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-xl bg-white/5">
        <p className="text-sm text-muted-foreground">Загрузка карты...</p>
      </div>
    );
  }

  const center: [number, number] = searchLat && searchLng
    ? [searchLat, searchLng]
    : refLat && refLng ? [refLat, refLng] : BELARUS_CENTER;
  const zoom = refLat ? 12 : 7;

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <MapContainer center={center} zoom={zoom} className="h-[500px] w-full" zoomControl={true} attributionControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler onClick={onClick} />

        {refLat !== null && refLng !== null && (
          <>
            <Marker position={[refLat, refLng]} icon={refIcon}>
              <Popup><strong>Эталон</strong><br />{refLat.toFixed(5)}, {refLng.toFixed(5)}</Popup>
            </Marker>
            {step === "reference" && <FlyTo lat={refLat} lng={refLng} zoom={13} />}
          </>
        )}

        {searchLat !== null && searchLng !== null && (
          <>
            <Marker position={[searchLat, searchLng]} icon={searchIcon}>
              <Popup><strong>Центр поиска</strong><br />Радиус: {radiusKm} км</Popup>
            </Marker>
            <Circle
              center={[searchLat, searchLng]}
              radius={radiusKm * 1000}
              pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.08, weight: 2, dashArray: "6 4" }}
            />
            {step === "search" && <FlyTo lat={searchLat} lng={searchLng} />}
            {step === "results" && <FlyTo lat={searchLat} lng={searchLng} />}
          </>
        )}

        {matches.map((m, i) => (
          <Marker key={`${m.lat}-${m.lng}-${i}`} position={[m.lat, m.lng]} icon={makeResultIcon(m.similarity)}>
            <Popup maxWidth={320} minWidth={260}>
              <ResultPopup match={m} index={i} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function ResultPopup({ match: m, index }: { match: ForestMatch; index: number }) {
  const simColor = m.similarity >= 70 ? "#10b981" : m.similarity >= 40 ? "#f59e0b" : "#6b7280";
  const p = m.pattern;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: 1.5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, background: simColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 700, fontSize: 14,
        }}>
          {m.similarity}%
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{p.dominant_species || m.name || `Массив #${index + 1}`}</div>
          <div style={{ fontSize: 11, color: "#888" }}>{m.lat.toFixed(5)}, {m.lng.toFixed(5)} · {p.points_sampled} точек</div>
        </div>
      </div>

      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <tbody>
          {p.genera.length > 0 && (
            <>
              <SectionHeader label="Рода деревьев" color="#22c55e" />
              <PopupRow label="Виды" value={p.genera.map((g) => GENUS_RU[g] || g).join(", ")} bold />
            </>
          )}
          {p.fgis_species_list.length > 0 && (
            <>
              <SectionHeader label="ФГИС ЛК" color="#f59e0b" />
              <PopupRow label="Породы" value={p.fgis_species_list.join(", ")} bold />
              {p.dominant_species && <PopupRow label="Доминирующая" value={p.dominant_species} />}
            </>
          )}
          <SectionHeader label="Тип леса" color="#3b82f6" />
          <PopupRow label="Тип" value={FOREST_LABELS[p.forest_type] || p.forest_type} />
          {p.modis_class && (
            <>
              <SectionHeader label="MODIS" color="#a855f7" />
              <PopupRow label="Класс" value={p.modis_class} />
              <PopupRow label="Лес" value={p.modis_is_forest ? "Да" : "Нет"} />
            </>
          )}
          <SectionHeader label="Детали оценки" color={simColor} />
          <ScorePopupRow label="Рода" score={m.breakdown.genera_overlap.score} max={m.breakdown.genera_overlap.max} reason={m.breakdown.genera_overlap.reason} />
          <ScorePopupRow label="Порода" score={m.breakdown.dominant_species.score} max={m.breakdown.dominant_species.max} reason={m.breakdown.dominant_species.reason} />
          <ScorePopupRow label="Тип" score={m.breakdown.forest_type.score} max={m.breakdown.forest_type.max} reason={m.breakdown.forest_type.reason} />
          <ScorePopupRow label="MODIS" score={m.breakdown.modis.score} max={m.breakdown.modis.max} reason={m.breakdown.modis.reason} />
        </tbody>
      </table>
    </div>
  );
}

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <tr><td colSpan={2} style={{ paddingTop: 8, paddingBottom: 3, fontWeight: 700, fontSize: 11, color, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1px solid ${color}33` }}>{label}</td></tr>
  );
}

function PopupRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr>
      <td style={{ padding: "2px 8px 2px 0", color: "#888", whiteSpace: "nowrap", verticalAlign: "top" }}>{label}</td>
      <td style={{ padding: "2px 0", fontWeight: bold ? 600 : 400 }}>{value}</td>
    </tr>
  );
}

function ScorePopupRow({ label, score, max, reason }: { label: string; score: number; max: number; reason: string }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  const barColor = score === max ? "#10b981" : score > 0 ? "#f59e0b" : "#555";
  return (
    <>
      <tr>
        <td style={{ padding: "3px 8px 0 0", color: "#888", fontSize: 11 }}>{label}</td>
        <td style={{ padding: "3px 0 0", fontSize: 11 }}><span style={{ fontWeight: 600 }}>{score}</span><span style={{ color: "#666" }}>/{max}</span></td>
      </tr>
      <tr>
        <td colSpan={2} style={{ padding: "1px 0 4px" }}>
          <div style={{ height: 4, borderRadius: 2, background: "#333", marginBottom: 2 }}>
            <div style={{ height: "100%", borderRadius: 2, background: barColor, width: `${pct}%`, transition: "width 0.3s" }} />
          </div>
          <div style={{ fontSize: 10, color: "#888", lineHeight: 1.3 }}>{reason}</div>
        </td>
      </tr>
    </>
  );
}
