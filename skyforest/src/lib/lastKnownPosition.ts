/**
 * Последняя известная позиция устройства (localStorage).
 *
 * Нужна как разумный центр карты там, где GPS-фикса сейчас нет: ручной выбор
 * точки входа в лес открывался бы на обзоре всего мира. Данные не покидают
 * устройство и живут ограниченное время.
 */

import type { Coords } from "@/lib/native/geolocation";

const KEY = "sf_last_position";
/** Позиция старше двух недель для центрирования карты уже бесполезна. */
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export function rememberPosition(pos: Coords): void {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ lat: pos.lat, lng: pos.lng, t: Date.now() }),
    );
  } catch {
    /* приватный режим / нет доступа к storage — не критично */
  }
}

export function loadLastKnownPosition(): Coords | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number; t?: number };
    if (typeof parsed.lat !== "number" || typeof parsed.lng !== "number") return null;
    if (!parsed.t || Date.now() - parsed.t > MAX_AGE_MS) return null;
    return { lat: parsed.lat, lng: parsed.lng };
  } catch {
    return null;
  }
}
