"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  LayersControl,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Star,
  Loader2,
  Search,
  RefreshCw,
  X,
  Trash2,
  Calendar,
  User,
  Camera,
  Download,
  BarChart3,
  ChevronDown,
  Tag,
  MessageSquare,
  Check,
  Leaf,
} from "lucide-react";

/* ─── Types ─── */

interface MapLocation {
  id: string;
  user_id: string;
  name: string;
  lat: number;
  lng: number;
  forest_info?: Record<string, unknown> | null;
  created_at: string;
  profile?: { full_name: string | null; email: string | null } | null;
  _deleted?: boolean;
  deleted_at?: string;
  original_id?: string;
}

interface MapBestDay {
  id: string;
  user_id: string;
  name: string;
  best_date: string;
  photos?: string[];
  created_at: string;
  location?: { name: string; lat: number; lng: number } | null;
  mushroom?: {
    latin_name: string;
    common_name: string | null;
    image_url: string | null;
  } | null;
  profile?: { full_name: string | null; email: string | null } | null;
  _deleted?: boolean;
  deleted_at?: string;
  original_id?: string;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
  mushroom_latin_name?: string;
  mushroom_common_name?: string;
  mushroom_image_url?: string;
}

interface MapUser {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface AdminMark {
  id: string;
  admin_id: string;
  target_type: string;
  target_id: string;
  status: MarkStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

type MarkStatus = "interesting" | "priority" | "secondary" | "reviewed" | "suspicious";
type FilterMode = "all" | "locations" | "best_days";
type StatusFilter = "all" | "active" | "deleted";
type MarkFilter = "all" | MarkStatus | "unmarked";

/* ─── Mark config ─── */

const MARK_CONFIG: Record<MarkStatus, { label: string; color: string; bgLight: string; borderLight: string; ring: string }> = {
  priority:    { label: "Приоритет",     color: "#ef4444", bgLight: "bg-red-50",    borderLight: "border-red-300",    ring: "#ef4444" },
  interesting: { label: "Интересно",     color: "#8b5cf6", bgLight: "bg-violet-50", borderLight: "border-violet-300", ring: "#8b5cf6" },
  suspicious:  { label: "Подозрительно", color: "#f97316", bgLight: "bg-orange-50", borderLight: "border-orange-300", ring: "#f97316" },
  secondary:   { label: "Второстепенно", color: "#6b7280", bgLight: "bg-gray-50",   borderLight: "border-gray-300",   ring: "#6b7280" },
  reviewed:    { label: "Просмотрено",   color: "#10b981", bgLight: "bg-emerald-50",borderLight: "border-emerald-300",ring: "#10b981" },
};

const MARK_STATUSES = Object.keys(MARK_CONFIG) as MarkStatus[];

/* ─── Icons ─── */

function makeIcon(color: string, borderColor: string, svg: string, size: number = 28, ringColor?: string) {
  const ringStyle = ringColor
    ? `box-shadow:0 0 0 3px ${ringColor}, 0 2px 8px rgba(0,0,0,.4);`
    : "box-shadow:0 2px 8px rgba(0,0,0,.4);";
  return new L.DivIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2.5px solid ${borderColor};border-radius:50%;${ringStyle}display:flex;align-items:center;justify-content:center">${svg}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const PIN_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M17 10c0 4.4-5 9-5 9s-5-4.6-5-9a5 5 0 1 1 10 0Z"/><circle cx="12" cy="10" r="1.5"/></svg>';
const STAR_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="#fff" stroke="#fff" stroke-width="1"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>';

const BASE_ICONS = {
  location: makeIcon("#10b981", "#fff", PIN_SVG),
  locationDeleted: makeIcon("#ef4444", "#fff", PIN_SVG),
  bestDay: makeIcon("#f59e0b", "#fff", STAR_SVG, 26),
  bestDayDeleted: makeIcon("#dc2626", "#fca5a5", STAR_SVG, 26),
};

const iconCache = new Map<string, L.DivIcon>();

function getIcon(type: "location" | "bestDay", deleted: boolean, markStatus?: MarkStatus): L.DivIcon {
  const key = `${type}-${deleted}-${markStatus ?? "none"}`;
  if (iconCache.has(key)) return iconCache.get(key)!;

  if (!markStatus) {
    const icon = type === "location"
      ? (deleted ? BASE_ICONS.locationDeleted : BASE_ICONS.location)
      : (deleted ? BASE_ICONS.bestDayDeleted : BASE_ICONS.bestDay);
    iconCache.set(key, icon);
    return icon;
  }

  const ring = MARK_CONFIG[markStatus].ring;
  const icon = type === "location"
    ? makeIcon(deleted ? "#ef4444" : "#10b981", "#fff", PIN_SVG, 28, ring)
    : makeIcon(deleted ? "#dc2626" : "#f59e0b", deleted ? "#fca5a5" : "#fff", STAR_SVG, 26, ring);
  iconCache.set(key, icon);
  return icon;
}

/* ─── Map auto-bounds ─── */

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const prevKey = useRef("");

  useEffect(() => {
    if (points.length === 0) return;
    const key = points.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join("|");
    if (key === prevKey.current) return;
    prevKey.current = key;
    const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [map, points]);

  return null;
}

/* ─── Helpers ─── */

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getUserName(p: { full_name: string | null; email: string | null } | null | undefined) {
  if (!p) return "—";
  return p.full_name || p.email || "—";
}

function getTargetType(isDeleted: boolean, kind: "location" | "best_day"): string {
  return isDeleted ? `deleted_${kind}` : kind;
}

/* ─── Main Component ─── */

export function AdminMap() {
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [bestDays, setBestDays] = useState<MapBestDay[]>([]);
  const [users, setUsers] = useState<MapUser[]>([]);
  const [marks, setMarks] = useState<AdminMark[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [markFilter, setMarkFilter] = useState<MarkFilter>("all");
  const [userFilter, setUserFilter] = useState<string>("");
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const [mushroomFilter, setMushroomFilter] = useState<string>("");
  const [mushroomSearch, setMushroomSearch] = useState("");
  const [showMushroomDropdown, setShowMushroomDropdown] = useState(false);
  const mushroomDropdownRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async (userId?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (userId) params.set("user_id", userId);
      const [mapRes, marksRes] = await Promise.all([
        fetch(`/api/admin/map-data?${params}`),
        fetch("/api/admin/marks"),
      ]);
      if (!mapRes.ok) throw new Error();
      const data = await mapRes.json();

      const locs: MapLocation[] = (data.locations ?? []).map(
        (l: MapLocation) => ({ ...l, _deleted: false }),
      );
      const delLocs: MapLocation[] = (data.deleted_locations ?? []).map(
        (l: MapLocation) => ({ ...l, _deleted: true }),
      );
      const bds: MapBestDay[] = (data.best_days ?? []).map(
        (b: MapBestDay) => ({ ...b, _deleted: false }),
      );
      const delBds: MapBestDay[] = (data.deleted_best_days ?? []).map(
        (b: MapBestDay) => ({ ...b, _deleted: true }),
      );

      setLocations([...locs, ...delLocs]);
      setBestDays([...bds, ...delBds]);
      setUsers(data.users ?? []);

      if (marksRes.ok) {
        const marksData = await marksRes.json();
        setMarks(marksData.marks ?? []);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(userFilter || undefined);
  }, [loadData, userFilter]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
      if (mushroomDropdownRef.current && !mushroomDropdownRef.current.contains(e.target as Node)) {
        setShowMushroomDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const marksMap = useMemo(() => {
    const m = new Map<string, AdminMark>();
    for (const mark of marks) {
      m.set(`${mark.target_type}:${mark.target_id}`, mark);
    }
    return m;
  }, [marks]);

  const getMark = useCallback(
    (targetType: string, targetId: string) => marksMap.get(`${targetType}:${targetId}`) ?? null,
    [marksMap],
  );

  const handleSetMark = useCallback(async (
    targetType: string,
    targetId: string,
    status: MarkStatus,
    note?: string,
  ) => {
    try {
      const res = await fetch("/api/admin/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_type: targetType, target_id: targetId, status, note }),
      });
      if (!res.ok) return;
      setMarks((prev) => {
        const key = `${targetType}:${targetId}`;
        const existing = prev.find((m) => `${m.target_type}:${m.target_id}` === key);
        if (existing) {
          return prev.map((m) =>
            `${m.target_type}:${m.target_id}` === key
              ? { ...m, status, note: note ?? m.note, updated_at: new Date().toISOString() }
              : m,
          );
        }
        return [
          ...prev,
          {
            id: crypto.randomUUID(),
            admin_id: "",
            target_type: targetType,
            target_id: targetId,
            status,
            note: note ?? null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      });
    } catch { /* noop */ }
  }, []);

  const handleRemoveMark = useCallback(async (targetType: string, targetId: string) => {
    try {
      await fetch(`/api/admin/marks?target_type=${targetType}&target_id=${targetId}`, {
        method: "DELETE",
      });
      setMarks((prev) =>
        prev.filter((m) => !(m.target_type === targetType && m.target_id === targetId)),
      );
    } catch { /* noop */ }
  }, []);

  const filteredLocations = useMemo(() => {
    if (filterMode === "best_days") return [];
    return locations.filter((l) => {
      if (statusFilter === "active" && l._deleted) return false;
      if (statusFilter === "deleted" && !l._deleted) return false;
      if (markFilter !== "all") {
        const tt = getTargetType(!!l._deleted, "location");
        const mark = getMark(tt, l.id);
        if (markFilter === "unmarked") {
          if (mark) return false;
        } else {
          if (!mark || mark.status !== markFilter) return false;
        }
      }
      return true;
    });
  }, [locations, filterMode, statusFilter, markFilter, getMark]);

  const filteredBestDays = useMemo(() => {
    if (filterMode === "locations") return [];
    return bestDays.filter((b) => {
      if (statusFilter === "active" && b._deleted) return false;
      if (statusFilter === "deleted" && !b._deleted) return false;
      if (mushroomFilter) {
        const latinName = b._deleted ? b.mushroom_latin_name : b.mushroom?.latin_name;
        if (latinName !== mushroomFilter) return false;
      }
      if (markFilter !== "all") {
        const tt = getTargetType(!!b._deleted, "best_day");
        const mark = getMark(tt, b.id);
        if (markFilter === "unmarked") {
          if (mark) return false;
        } else {
          if (!mark || mark.status !== markFilter) return false;
        }
      }
      return true;
    });
  }, [bestDays, filterMode, statusFilter, mushroomFilter, markFilter, getMark]);

  const allPoints = useMemo(() => {
    const pts: [number, number][] = [];
    for (const l of filteredLocations) {
      if (l.lat && l.lng) pts.push([l.lat, l.lng]);
    }
    for (const b of filteredBestDays) {
      const lat = b._deleted ? b.location_lat : (b.location as Record<string, unknown>)?.lat as number;
      const lng = b._deleted ? b.location_lng : (b.location as Record<string, unknown>)?.lng as number;
      if (lat && lng) pts.push([lat, lng]);
    }
    return pts;
  }, [filteredLocations, filteredBestDays]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q),
    );
  }, [users, userSearch]);

  const mushroomOptions = useMemo(() => {
    const map = new Map<string, { latin_name: string; common_name: string | null; image_url: string | null; count: number }>();
    for (const b of bestDays) {
      const latinName = b._deleted ? b.mushroom_latin_name : b.mushroom?.latin_name;
      if (!latinName) continue;
      const commonName = b._deleted ? (b.mushroom_common_name ?? null) : (b.mushroom?.common_name ?? null);
      const imageUrl = b._deleted ? (b.mushroom_image_url ?? null) : (b.mushroom?.image_url ?? null);
      const existing = map.get(latinName);
      if (existing) {
        existing.count++;
      } else {
        map.set(latinName, { latin_name: latinName, common_name: commonName, image_url: imageUrl, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [bestDays]);

  const filteredMushroomOptions = useMemo(() => {
    if (!mushroomSearch.trim()) return mushroomOptions;
    const q = mushroomSearch.toLowerCase();
    return mushroomOptions.filter(
      (m) =>
        m.latin_name.toLowerCase().includes(q) ||
        m.common_name?.toLowerCase().includes(q),
    );
  }, [mushroomOptions, mushroomSearch]);

  const selectedMushroomName = useMemo(() => {
    if (!mushroomFilter) return "";
    const m = mushroomOptions.find((m) => m.latin_name === mushroomFilter);
    return m ? (m.common_name || m.latin_name) : "";
  }, [mushroomFilter, mushroomOptions]);

  const selectedUserName = useMemo(() => {
    if (!userFilter) return "";
    const u = users.find((u) => u.id === userFilter);
    return u ? (u.full_name || u.email || u.id.slice(0, 8)) : "";
  }, [userFilter, users]);

  const stats = useMemo(() => {
    const activeLocs = locations.filter((l) => !l._deleted).length;
    const deletedLocs = locations.filter((l) => l._deleted).length;
    const activeBds = bestDays.filter((b) => !b._deleted).length;
    const deletedBds = bestDays.filter((b) => b._deleted).length;
    const markedCount = marks.length;
    return { activeLocs, deletedLocs, activeBds, deletedBds, markedCount };
  }, [locations, bestDays, marks]);

  const handleExportCSV = () => {
    const rows: string[] = [
      "type,status,name,lat,lng,user,date,mushroom,deleted_at,admin_mark,admin_note",
    ];
    for (const l of filteredLocations) {
      const tt = getTargetType(!!l._deleted, "location");
      const mark = getMark(tt, l.id);
      rows.push(
        [
          "location",
          l._deleted ? "deleted" : "active",
          `"${l.name}"`,
          l.lat,
          l.lng,
          `"${getUserName(l.profile)}"`,
          l.created_at,
          "",
          l.deleted_at || "",
          mark?.status || "",
          `"${mark?.note || ""}"`,
        ].join(","),
      );
    }
    for (const b of filteredBestDays) {
      const lat = b._deleted ? b.location_lat : (b.location as Record<string, unknown>)?.lat;
      const lng = b._deleted ? b.location_lng : (b.location as Record<string, unknown>)?.lng;
      const mName = b._deleted
        ? b.mushroom_common_name || b.mushroom_latin_name || ""
        : b.mushroom?.common_name || b.mushroom?.latin_name || "";
      const tt = getTargetType(!!b._deleted, "best_day");
      const mark = getMark(tt, b.id);
      rows.push(
        [
          "best_day",
          b._deleted ? "deleted" : "active",
          `"${b.name}"`,
          lat,
          lng,
          `"${getUserName(b.profile)}"`,
          b.best_date,
          `"${mName}"`,
          b.deleted_at || "",
          mark?.status || "",
          `"${mark?.note || ""}"`,
        ].join(","),
      );
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-map-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasAnyFilter = userFilter || mushroomFilter || filterMode !== "all" || statusFilter !== "all" || markFilter !== "all";

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">{stats.activeLocs}</p>
          <p className="text-[10px] text-muted-foreground">Активных локаций</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
          <p className="text-lg font-bold text-red-400">{stats.deletedLocs}</p>
          <p className="text-[10px] text-muted-foreground">Удалённых локаций</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
          <p className="text-lg font-bold text-amber-400">{stats.activeBds}</p>
          <p className="text-[10px] text-muted-foreground">Активных гр. дней</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
          <p className="text-lg font-bold text-red-400">{stats.deletedBds}</p>
          <p className="text-[10px] text-muted-foreground">Удалённых гр. дней</p>
        </div>
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-center">
          <p className="text-lg font-bold text-violet-400">{stats.markedCount}</p>
          <p className="text-[10px] text-muted-foreground">С отметкой</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Type filter */}
        <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
          {([
            { key: "all", label: "Все", icon: BarChart3 },
            { key: "locations", label: "Локации", icon: MapPin },
            { key: "best_days", label: "Гр. дни", icon: Star },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilterMode(key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filterMode === key
                  ? "bg-purple-500/20 text-purple-300"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
          {([
            { key: "all", label: "Все", color: "" },
            { key: "active", label: "Активные", color: "text-emerald-400" },
            { key: "deleted", label: "Удалённые", color: "text-red-400" },
          ] as const).map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === key
                  ? `bg-purple-500/20 ${color || "text-purple-300"}`
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {key === "deleted" && <Trash2 className="h-3 w-3" />}
              {label}
            </button>
          ))}
        </div>

        {/* Mark filter */}
        <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
          <button
            onClick={() => setMarkFilter("all")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              markFilter === "all" ? "bg-purple-500/20 text-purple-300" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Tag className="h-3 w-3" />
            Все
          </button>
          {MARK_STATUSES.map((ms) => (
            <button
              key={ms}
              onClick={() => setMarkFilter(ms)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                markFilter === ms ? "bg-purple-500/20 text-purple-300" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: MARK_CONFIG[ms].color }}
              />
              {MARK_CONFIG[ms].label}
            </button>
          ))}
          <button
            onClick={() => setMarkFilter("unmarked")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              markFilter === "unmarked" ? "bg-purple-500/20 text-purple-300" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Без отметки
          </button>
        </div>

        {/* Mushroom filter */}
        <div className="relative" ref={mushroomDropdownRef}>
          <button
            onClick={() => {
              setShowMushroomDropdown(!showMushroomDropdown);
              setMushroomSearch("");
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              mushroomFilter
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Leaf className="h-3.5 w-3.5" />
            {mushroomFilter ? selectedMushroomName : "Все грибы"}
            <ChevronDown className="h-3 w-3" />
          </button>

          {showMushroomDropdown && (
            <div className="absolute left-0 top-full z-[9999] mt-1 w-72 rounded-xl border border-white/10 bg-[#1a2a1f]/95 p-2 shadow-2xl backdrop-blur-xl">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={mushroomSearch}
                  onChange={(e) => setMushroomSearch(e.target.value)}
                  placeholder="Поиск гриба..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground/50 focus:border-amber-500/30"
                  autoFocus
                />
              </div>
              <div className="max-h-56 overflow-y-auto space-y-0.5">
                <button
                  onClick={() => {
                    setMushroomFilter("");
                    setShowMushroomDropdown(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    !mushroomFilter ? "bg-amber-500/20 text-amber-300" : "text-foreground/70 hover:bg-white/5"
                  }`}
                >
                  Все грибы
                </button>
                {filteredMushroomOptions.map((m) => (
                  <button
                    key={m.latin_name}
                    onClick={() => {
                      setMushroomFilter(m.latin_name);
                      setShowMushroomDropdown(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                      mushroomFilter === m.latin_name ? "bg-amber-500/20 text-amber-300" : "text-foreground/70 hover:bg-white/5"
                    }`}
                  >
                    {m.image_url && (
                      <img
                        src={m.image_url}
                        alt=""
                        className="h-5 w-5 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <span className="truncate font-medium">{m.common_name || m.latin_name}</span>
                    <span className="ml-auto flex-shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {m.count}
                    </span>
                  </button>
                ))}
                {filteredMushroomOptions.length === 0 && (
                  <p className="px-2.5 py-2 text-xs text-muted-foreground/50">Не найдено</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User filter */}
        <div className="relative" ref={userDropdownRef}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              userFilter
                ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
                : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            {userFilter ? selectedUserName : "Все пользователи"}
            <ChevronDown className="h-3 w-3" />
          </button>

          {showUserDropdown && (
            <div className="absolute left-0 top-full z-[9999] mt-1 w-72 rounded-xl border border-white/10 bg-[#1a2a1f]/95 p-2 shadow-2xl backdrop-blur-xl">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Поиск пользователя..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground/50 focus:border-purple-500/30"
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                <button
                  onClick={() => {
                    setUserFilter("");
                    setShowUserDropdown(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    !userFilter ? "bg-purple-500/20 text-purple-300" : "text-foreground/70 hover:bg-white/5"
                  }`}
                >
                  Все пользователи
                </button>
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setUserFilter(u.id);
                      setShowUserDropdown(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                      userFilter === u.id ? "bg-purple-500/20 text-purple-300" : "text-foreground/70 hover:bg-white/5"
                    }`}
                  >
                    <span className="truncate font-medium">{u.full_name || "—"}</span>
                    <span className="ml-auto truncate text-[10px] text-muted-foreground">{u.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active filter indicator */}
        {hasAnyFilter && (
          <button
            onClick={() => {
              setFilterMode("all");
              setStatusFilter("all");
              setMarkFilter("all");
              setMushroomFilter("");
              setUserFilter("");
            }}
            className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
          >
            <X className="h-3 w-3" />
            Сбросить
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            title="Экспорт CSV"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            onClick={() => loadData(userFilter || undefined)}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition-colors hover:bg-white/5 disabled:opacity-50"
            title="Обновить"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Легенда:</span>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
          <span className="text-xs text-foreground/70">Локация</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-amber-500 border-2 border-white" />
          <span className="text-xs text-foreground/70">Грибной день</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500 border-2 border-white" />
          <span className="text-xs text-foreground/70">Удалено</span>
        </div>
        <span className="text-[10px] text-muted-foreground/40">|</span>
        {MARK_STATUSES.map((ms) => (
          <div key={ms} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full border-2"
              style={{ borderColor: MARK_CONFIG[ms].color, background: "transparent" }}
            />
            <span className="text-xs text-foreground/70">{MARK_CONFIG[ms].label}</span>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="overflow-hidden rounded-xl border border-white/10">
        {loading && filteredLocations.length === 0 && filteredBestDays.length === 0 ? (
          <div className="flex h-[600px] items-center justify-center bg-[#0d1a12]/50">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <MapContainer
            center={[53.9, 27.56]}
            zoom={7}
            className="h-[600px] w-full"
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
                  maxZoom={18}
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            {allPoints.length > 0 && <FitBounds points={allPoints} />}

            {filteredLocations.map((loc) => {
              const tt = getTargetType(!!loc._deleted, "location");
              const mark = getMark(tt, loc.id);
              return (
                <Marker
                  key={`loc-${loc.id}`}
                  position={[loc.lat, loc.lng]}
                  icon={getIcon("location", !!loc._deleted, mark?.status)}
                >
                  <Popup maxWidth={340} minWidth={280}>
                    <LocationPopup
                      location={loc}
                      mark={mark}
                      onSetMark={(s, n) => handleSetMark(tt, loc.id, s, n)}
                      onRemoveMark={() => handleRemoveMark(tt, loc.id)}
                    />
                  </Popup>
                </Marker>
              );
            })}

            {filteredBestDays.map((bd) => {
              const lat = bd._deleted
                ? bd.location_lat
                : (bd.location as Record<string, unknown>)?.lat as number;
              const lng = bd._deleted
                ? bd.location_lng
                : (bd.location as Record<string, unknown>)?.lng as number;
              if (!lat || !lng) return null;
              const tt = getTargetType(!!bd._deleted, "best_day");
              const mark = getMark(tt, bd.id);
              return (
                <Marker
                  key={`bd-${bd.id}`}
                  position={[lat, lng]}
                  icon={getIcon("bestDay", !!bd._deleted, mark?.status)}
                >
                  <Popup maxWidth={380} minWidth={300}>
                    <BestDayPopup
                      bestDay={bd}
                      mark={mark}
                      onSetMark={(s, n) => handleSetMark(tt, bd.id, s, n)}
                      onRemoveMark={() => handleRemoveMark(tt, bd.id)}
                    />
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Bottom count */}
      <p className="text-xs text-muted-foreground text-center">
        На карте: {filteredLocations.length} локаций, {filteredBestDays.length} грибных дней
      </p>
    </div>
  );
}

/* ─── Mark Selector (shared by popups) ─── */

function MarkSelector({
  mark,
  onSetMark,
  onRemoveMark,
}: {
  mark: AdminMark | null;
  onSetMark: (status: MarkStatus, note?: string) => void;
  onRemoveMark: () => void;
}) {
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(mark?.note ?? "");
  const [savingNote, setSavingNote] = useState(false);

  const handleSaveNote = async () => {
    if (!mark) return;
    setSavingNote(true);
    await onSetMark(mark.status, noteText);
    setSavingNote(false);
    setShowNote(false);
  };

  return (
    <div className="border-t border-gray-200 pt-2 mt-2 space-y-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Tag className="h-3 w-3 text-gray-500" />
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Отметка админа</span>
      </div>

      {/* Current mark badge */}
      {mark && (
        <div
          className={`flex items-center gap-2 rounded px-2 py-1 text-xs font-medium ${MARK_CONFIG[mark.status].bgLight} ${MARK_CONFIG[mark.status].borderLight} border`}
          style={{ color: MARK_CONFIG[mark.status].color }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full flex-shrink-0"
            style={{ background: MARK_CONFIG[mark.status].color }}
          />
          {MARK_CONFIG[mark.status].label}
          {mark.note && (
            <span className="ml-1 text-gray-500 font-normal truncate max-w-[120px]" title={mark.note}>
              — {mark.note}
            </span>
          )}
          <button
            onClick={onRemoveMark}
            className="ml-auto text-gray-400 hover:text-red-500 flex-shrink-0"
            title="Убрать отметку"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Status buttons */}
      <div className="flex flex-wrap gap-1">
        {MARK_STATUSES.map((ms) => {
          const isActive = mark?.status === ms;
          return (
            <button
              key={ms}
              onClick={() => onSetMark(ms)}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium border transition-colors ${
                isActive
                  ? `${MARK_CONFIG[ms].bgLight} ${MARK_CONFIG[ms].borderLight}`
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
              style={isActive ? { color: MARK_CONFIG[ms].color } : { color: "#6b7280" }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0"
                style={{ background: MARK_CONFIG[ms].color }}
              />
              {MARK_CONFIG[ms].label}
              {isActive && <Check className="h-2.5 w-2.5 ml-0.5" />}
            </button>
          );
        })}
      </div>

      {/* Note toggle / editor */}
      {mark && (
        <>
          {!showNote ? (
            <button
              onClick={() => {
                setNoteText(mark.note ?? "");
                setShowNote(true);
              }}
              className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
            >
              <MessageSquare className="h-3 w-3" />
              {mark.note ? "Ред. заметку" : "Добавить заметку"}
            </button>
          ) : (
            <div className="space-y-1">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Заметка..."
                rows={2}
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-400 resize-none"
              />
              <div className="flex gap-1">
                <button
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  className="rounded bg-blue-500 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  {savingNote ? "..." : "Сохранить"}
                </button>
                <button
                  onClick={() => setShowNote(false)}
                  className="rounded px-2.5 py-1 text-[11px] text-gray-500 hover:bg-gray-100"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Popup Components ─── */

function LocationPopup({
  location: l,
  mark,
  onSetMark,
  onRemoveMark,
}: {
  location: MapLocation;
  mark: AdminMark | null;
  onSetMark: (status: MarkStatus, note?: string) => void;
  onRemoveMark: () => void;
}) {
  return (
    <div className="text-sm text-[#1a2a1f] space-y-1.5" style={{ fontFamily: "inherit" }}>
      <div className="flex items-center gap-2">
        {l._deleted ? (
          <Trash2 className="h-4 w-4 text-red-500 flex-shrink-0" />
        ) : (
          <MapPin className="h-4 w-4 text-emerald-600 flex-shrink-0" />
        )}
        <span className="font-bold text-sm">{l.name}</span>
      </div>

      {l._deleted && (
        <div className="rounded bg-red-50 border border-red-200 px-2 py-1 text-[11px] text-red-700 font-medium">
          Удалено {formatDate(l.deleted_at)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <div>
          <span className="text-gray-500">Координаты:</span>
          <br />
          <a
            href={`https://www.google.com/maps?q=${l.lat},${l.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {l.lat.toFixed(5)}, {l.lng.toFixed(5)}
          </a>
        </div>
        <div>
          <span className="text-gray-500">Пользователь:</span>
          <br />
          <span className="font-medium">{getUserName(l.profile)}</span>
        </div>
      </div>

      <div className="text-[11px] text-gray-500 flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        Создана: {formatDate(l.created_at)}
      </div>

      <MarkSelector mark={mark} onSetMark={onSetMark} onRemoveMark={onRemoveMark} />
    </div>
  );
}

function BestDayPopup({
  bestDay: b,
  mark,
  onSetMark,
  onRemoveMark,
}: {
  bestDay: MapBestDay;
  mark: AdminMark | null;
  onSetMark: (status: MarkStatus, note?: string) => void;
  onRemoveMark: () => void;
}) {
  const mName = b._deleted
    ? b.mushroom_common_name || b.mushroom_latin_name
    : b.mushroom?.common_name || b.mushroom?.latin_name;
  const mImage = b._deleted ? b.mushroom_image_url : b.mushroom?.image_url;
  const locName = b._deleted
    ? b.location_name
    : (b.location as Record<string, unknown>)?.name as string;
  const photos = b.photos || [];

  return (
    <div className="text-sm text-[#1a2a1f] space-y-1.5" style={{ fontFamily: "inherit" }}>
      <div className="flex items-center gap-2">
        {b._deleted ? (
          <Trash2 className="h-4 w-4 text-red-500 flex-shrink-0" />
        ) : (
          <Star className="h-4 w-4 text-amber-500 flex-shrink-0" />
        )}
        <span className="font-bold text-sm">{b.name}</span>
      </div>

      {b._deleted && (
        <div className="rounded bg-red-50 border border-red-200 px-2 py-1 text-[11px] text-red-700 font-medium">
          Удалено {formatDate(b.deleted_at)}
        </div>
      )}

      {mName && (
        <div className="flex items-center gap-2">
          {mImage && (
            <img
              src={mImage}
              alt=""
              className="h-8 w-8 rounded object-cover flex-shrink-0"
            />
          )}
          <span className="text-xs font-medium">{mName}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <div>
          <span className="text-gray-500">Дата:</span>
          <br />
          <span className="font-medium">
            {new Date(b.best_date).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Локация:</span>
          <br />
          <span className="font-medium">{locName || "—"}</span>
        </div>
        <div>
          <span className="text-gray-500">Пользователь:</span>
          <br />
          <span className="font-medium">{getUserName(b.profile)}</span>
        </div>
        {photos.length > 0 && (
          <div className="flex items-center gap-1 text-emerald-700">
            <Camera className="h-3 w-3" />
            <span>{photos.length} фото</span>
          </div>
        )}
      </div>

      {photos.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {photos.slice(0, 4).map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              className="h-12 w-12 rounded object-cover flex-shrink-0"
            />
          ))}
          {photos.length > 4 && (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-gray-100 text-[10px] text-gray-500">
              +{photos.length - 4}
            </div>
          )}
        </div>
      )}

      <div className="text-[11px] text-gray-500 flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        Создан: {formatDate(b.created_at)}
      </div>

      <MarkSelector mark={mark} onSetMark={onSetMark} onRemoveMark={onRemoveMark} />
    </div>
  );
}
