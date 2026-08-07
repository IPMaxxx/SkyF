/**
 * Последняя известная позиция устройства.
 *
 * Нужна как разумный центр карты там, где GPS-фикса сейчас нет: ручной выбор
 * точки входа в лес открывался бы на обзоре всего мира. Данные не покидают
 * устройство и живут ограниченное время.
 *
 * Хранится дважды, и это не запас, а необходимость. В нативной оболочке
 * автономный офлайн-экран живёт на другом источнике (`https://localhost`), чем
 * сайт, и localStorage сайта для него закрыт наглухо — как и IndexedDB с Cache
 * Storage. Общее хранилище у двух источников ровно одно, нативное, поэтому
 * позиция зеркалится ещё и в Preferences. Без этого зеркала офлайн-экран не
 * знает о человеке ничего и держит вид на обзоре мира, пока холодный GPS без
 * сети ищет спутники, — а это минуты, в которые на экране нет ни своей точки,
 * ни своей местности.
 */

import { isNativeApp } from "@/lib/native/capacitor";
import { preferencesPlugin } from "@/lib/native/plugins";
import type { Coords } from "@/lib/native/geolocation";

const KEY = "sf_last_position";
/** Позиция старше двух недель для центрирования карты уже бесполезна. */
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Зеркало в нативное хранилище. Ничего не ждёт и не бросает: запомнить позицию —
 * побочное дело замера, и оно не вправе задержать того, кто замер заказал.
 */
function mirrorToNative(json: string): void {
  if (!isNativeApp()) return;
  void preferencesPlugin()
    .then(({ Preferences }) => Preferences.set({ key: KEY, value: json }))
    .catch(() => {
      /* куска бандла нет / нет связи — на карте сайта позиция всё равно есть */
    });
}

export function rememberPosition(pos: Coords): void {
  const json = JSON.stringify({ lat: pos.lat, lng: pos.lng, t: Date.now() });
  try {
    window.localStorage.setItem(KEY, json);
  } catch {
    /* приватный режим / нет доступа к storage — не критично */
  }
  mirrorToNative(json);
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
