/**
 * Журнал событий записи пути.
 *
 * Появился потому, что четыре разбора подряд начинались одинаково: человек
 * сообщает симптом, а данных нет — телефон в лесу, Logcat не спросишь, тост
 * пролистан, состояние в памяти JS стёрто следующей попыткой. Здесь остаётся
 * след: что мы пробовали, чем это кончилось и в каком порядке.
 *
 * Пишется в localStorage, а не в память, ровно по той причине, из-за которой
 * журнал и понадобился: при погашенном экране WebView замораживается, а при
 * нехватке памяти система его и вовсе выгружает. Всё, что жило только в
 * переменных, к возвращению человека исчезает — вместе с самым интересным.
 *
 * Записи короткие и с меткой времени; их число ограничено, потому что поход
 * идёт часами, а место в хранилище общее с картой и треком.
 */

const KEY = "sf:track-log";
const LIMIT = 240;

export interface TrackLogEntry {
  /** Момент события, Date.now(). */
  t: number;
  /** Короткая метка события: «bg.start», «bg.failed», «app.foreground»… */
  tag: string;
  /** Подробности: код и текст отказа, статусы разрешений. */
  text?: string;
}

export function trackLog(tag: string, text?: string): void {
  if (typeof window === "undefined") return;
  try {
    const entries = readTrackLog();
    entries.push({ t: Date.now(), tag, ...(text ? { text } : {}) });
    // Режем с головы: свежие события важнее — дефект ищут по последним минутам.
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(-LIMIT)));
  } catch {
    /* хранилище переполнено или запрещено — журнал не стоит похода */
  }
}

export function readTrackLog(): TrackLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TrackLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function clearTrackLog(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* нечего чистить */
  }
}

/** Журнал одним текстом: человек нажимает «скопировать» и присылает его нам. */
export function formatTrackLog(header: string[], entries: TrackLogEntry[]): string {
  const lines = entries.map((entry) => {
    const time = new Date(entry.t).toISOString().slice(11, 23);
    return `${time} ${entry.tag}${entry.text ? ` — ${entry.text}` : ""}`;
  });
  return [...header, "", ...lines].join("\n");
}
