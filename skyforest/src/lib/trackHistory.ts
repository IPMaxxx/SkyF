/**
 * История завершённых походов.
 *
 * Основное хранилище — Supabase (таблица tracks, RLS «только свои»,
 * миграция supabase/patch-v43-tracks.sql). Fallback — localStorage: если
 * пользователь не залогинен или запрос упал, трек сохраняется локально
 * и не теряется. Список истории объединяет оба источника.
 *
 * Точки перед сохранением прореживаются (Douglas–Peucker), чтобы jsonb
 * не раздувался; первая точка сохранённого трека — якорь (точка входа).
 */

import { createClient } from "@/lib/supabase/client";
import { haversineM, trackDistanceM, type ActiveTrack, type TrackPoint } from "@/lib/trackState";

export interface SavedTrack {
  id: string;
  name: string;
  /** Unix ms */
  startedAt: number;
  /** Unix ms */
  finishedAt: number;
  distanceM: number;
  /** Первая точка — якорь (вход в лес). */
  points: TrackPoint[];
  /** true — лежит только в localStorage этого устройства. */
  local: boolean;
}

const LOCAL_KEY = "sf_track_history";
const LOCAL_MAX = 20;

/** Допуск упрощения Douglas–Peucker, метры (~ каждая точка значима на 15 м). */
const SIMPLIFY_TOLERANCE_M = 15;

/* ------------------------------------------------------------------ */
/* Упрощение трека (Douglas–Peucker по haversine-расстоянию до хорды)  */
/* ------------------------------------------------------------------ */

function pointToSegmentM(p: TrackPoint, a: TrackPoint, b: TrackPoint): number {
  // Локальная равнопромежуточная проекция вокруг точки a — на масштабах
  // похода (километры) погрешность пренебрежима.
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos((a.lat * Math.PI) / 180);
  const px = (p.lng - a.lng) * mPerDegLng;
  const py = (p.lat - a.lat) * mPerDegLat;
  const bx = (b.lng - a.lng) * mPerDegLng;
  const by = (b.lat - a.lat) * mPerDegLat;
  const lenSq = bx * bx + by * by;
  if (lenSq === 0) return haversineM(p, a);
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / lenSq));
  const dx = px - t * bx;
  const dy = py - t * by;
  return Math.sqrt(dx * dx + dy * dy);
}

export function simplifyPoints(points: TrackPoint[], toleranceM = SIMPLIFY_TOLERANCE_M): TrackPoint[] {
  if (points.length <= 2) return points;
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;

  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let maxIdx = -1;
    for (let i = start + 1; i < end; i++) {
      const d = pointToSegmentM(points[i], points[start], points[end]);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxIdx !== -1 && maxDist > toleranceM) {
      keep[maxIdx] = true;
      stack.push([start, maxIdx], [maxIdx, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/* ------------------------------------------------------------------ */
/* Сохранение                                                          */
/* ------------------------------------------------------------------ */

/**
 * Сохраняет завершённый поход: в Supabase, а при отсутствии сессии или
 * ошибке сети — в localStorage. Никогда не бросает: трек не должен
 * потеряться из-за сбоя сохранения.
 */
export async function saveFinishedTrack(track: ActiveTrack, name: string): Promise<SavedTrack> {
  const finishedAt = Date.now();
  const points = simplifyPoints([track.anchor, ...track.points]);
  const saved: SavedTrack = {
    id: `local-${finishedAt}`,
    name,
    startedAt: track.startedAt,
    finishedAt,
    distanceM: Math.round(trackDistanceM(track)),
    points,
    local: true,
  };

  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const { data, error } = await supabase
        .from("tracks")
        .insert({
          user_id: auth.user.id,
          name,
          started_at: new Date(track.startedAt).toISOString(),
          finished_at: new Date(finishedAt).toISOString(),
          distance_m: saved.distanceM,
          points,
        })
        .select("id")
        .single();
      if (!error && data) {
        return { ...saved, id: data.id as string, local: false };
      }
    }
  } catch {
    /* нет сети/сессии — сохраняем локально ниже */
  }

  saveLocal(saved);
  return saved;
}

/* ------------------------------------------------------------------ */
/* Список и удаление                                                   */
/* ------------------------------------------------------------------ */

export async function loadTrackHistory(): Promise<SavedTrack[]> {
  const local = loadLocal();
  let remote: SavedTrack[] = [];
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const { data, error } = await supabase
        .from("tracks")
        .select("id, name, started_at, finished_at, distance_m, points")
        .order("finished_at", { ascending: false })
        .limit(100);
      if (!error && data) {
        remote = data.map((row) => ({
          id: row.id as string,
          name: (row.name as string) ?? "",
          startedAt: Date.parse(row.started_at as string),
          finishedAt: Date.parse(row.finished_at as string),
          distanceM: (row.distance_m as number) ?? 0,
          points: (row.points as TrackPoint[]) ?? [],
          local: false,
        }));
      }
    }
  } catch {
    /* офлайн — показываем только локальные */
  }
  return [...local, ...remote].sort((a, b) => b.finishedAt - a.finishedAt);
}

export async function deleteSavedTrack(track: SavedTrack): Promise<void> {
  if (track.local) {
    try {
      const rest = loadLocal().filter((t) => t.id !== track.id);
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(rest));
    } catch {
      /* noop */
    }
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.from("tracks").delete().eq("id", track.id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* localStorage fallback                                               */
/* ------------------------------------------------------------------ */

function loadLocal(): SavedTrack[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedTrack[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t) => Array.isArray(t?.points) && typeof t?.finishedAt === "number");
  } catch {
    return [];
  }
}

function saveLocal(track: SavedTrack) {
  try {
    const list = [track, ...loadLocal()].slice(0, LOCAL_MAX);
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* квота/приватный режим */
  }
}
