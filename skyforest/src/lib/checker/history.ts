"use client";

/**
 * История распознаваний Mushroom Checker и производный от неё прогресс квестов.
 *
 * Данные уже есть: роут `/api/mushrooms/identify` с самого начала пишет каждое
 * успешное распознавание в `mushroom_identifications` (patch-v39) вместе с
 * очищенным от EXIF фото в приватном bucket `mushroom-photos`. Поэтому ни
 * новой таблицы, ни SQL-патча под историю и квесты не нужно.
 *
 * Читаем напрямую из браузера: RLS этой таблицы и bucket'а разрешает
 * пользователю только свои записи и только свою папку с фото, так что своего
 * серверного роута (и лишнего кода в общем `src/app/api`) здесь не требуется.
 *
 * Прогресс квестов не хранится отдельно — он вычисляется из той же истории по
 * полю `top_species`. Одно место правды: пока запись о находке есть, квест
 * закрыт; удаление аккаунта уносит и историю, и прогресс, отдельная чистка не
 * нужна.
 */

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { IdentifyResponse } from "@/app/api/mushrooms/identify/route";
import {
  normalizeSpeciesName,
  questSpeciesNames,
  QUEST_LEVELS,
  speciesReferenceUrl,
  type QuestLevel,
  type QuestSpecies,
} from "@/lib/checker/quests";

/** Сколько записей истории показываем: больше в один экран всё равно не нужно. */
const HISTORY_LIMIT = 200;
/** Время жизни подписанной ссылки на фото — на один сеанс просмотра с запасом. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

const PHOTO_BUCKET = "mushroom-photos";

export interface CheckerHistoryEntry {
  id: string;
  createdAt: string;
  scientificName: string;
  commonName: string | null;
  probability: number;
  /** Фото пользователя (подписанная ссылка) — если оно сохранилось. */
  photoUrl: string | null;
  /** Снимок вида из справочника: подстраховка, когда своего фото нет. */
  referencePhotoUrl: string | null;
  /** Куда ведёт «почитать» — всегда есть, см. `readMoreUrl`. */
  readMoreUrl: string;
}

interface HistoryRow {
  id: string;
  photo_path: string | null;
  top_species: string | null;
  top_probability: number | null;
  result_json: IdentifyResponse | null;
  created_at: string;
}

/**
 * iNaturalist отдаёт часть ссылок на Википедию по http. В WebView такие
 * адреса блокирует App Transport Security, поэтому поднимаем их до https.
 */
function secureUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("http://") ? `https://${url.slice("http://".length)}` : url;
}

/**
 * Ссылка «почитать»: сначала статья Википедии из обогащения, затем карточка
 * GBIF, и только если в результате не оказалось ни того ни другого — поиск по
 * биномиалу на iNaturalist. Придуманных адресов здесь нет: первые два берутся
 * из сохранённого ответа, последний — рабочая форма поиска.
 */
function readMoreUrl(result: IdentifyResponse | null, scientificName: string): string {
  const top = result?.suggestions?.[0];
  return (
    secureUrl(result?.details?.wikipedia_url) ??
    secureUrl(top?.wikipedia_url) ??
    secureUrl(result?.details?.gbif_url) ??
    secureUrl(top?.gbif_url) ??
    speciesReferenceUrl(scientificName)
  );
}

export interface CheckerHistoryState {
  entries: CheckerHistoryEntry[];
  loading: boolean;
  /** true — запрос не удался (сеть или сессия), список пустой не по факту. */
  failed: boolean;
  reload: () => Promise<void>;
}

/** Загружает историю распознаваний текущего пользователя вместе с фото. */
export function useCheckerHistory(): CheckerHistoryState {
  const [entries, setEntries] = useState<CheckerHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    setFailed(false);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("mushroom_identifications")
        .select("id, photo_path, top_species, top_probability, result_json, created_at")
        .order("created_at", { ascending: false })
        .limit(HISTORY_LIMIT);

      if (error) {
        setFailed(true);
        return;
      }

      const rows = (data ?? []) as HistoryRow[];

      // Подписанные ссылки берём одним запросом на все фото сразу.
      const paths = rows
        .map((row) => row.photo_path)
        .filter((path): path is string => Boolean(path));
      const signed = new Map<string, string>();
      if (paths.length > 0) {
        const { data: urls } = await supabase.storage
          .from(PHOTO_BUCKET)
          .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
        for (const item of urls ?? []) {
          if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl);
        }
      }

      setEntries(
        rows
          .filter((row) => Boolean(row.top_species))
          .map((row) => {
            const result = row.result_json;
            const top = result?.suggestions?.[0];
            const scientificName = row.top_species!;
            return {
              id: row.id,
              createdAt: row.created_at,
              scientificName,
              commonName:
                top?.common_name ?? result?.details?.common_name ?? null,
              probability: row.top_probability ?? top?.probability ?? 0,
              photoUrl: row.photo_path ? (signed.get(row.photo_path) ?? null) : null,
              referencePhotoUrl: secureUrl(top?.reference_photo_url),
              readMoreUrl: readMoreUrl(result, scientificName),
            };
          }),
      );
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { entries, loading, failed, reload };
}

/* ------------------------------------------------------------------ */
/* Прогресс квестов из истории                                         */
/* ------------------------------------------------------------------ */

export interface QuestSpeciesProgress {
  species: QuestSpecies;
  /** Первое распознавание, закрывшее квест; null — вид ещё не найден. */
  found: CheckerHistoryEntry | null;
}

export interface QuestLevelProgress {
  level: QuestLevel;
  species: QuestSpeciesProgress[];
  foundCount: number;
  total: number;
  complete: boolean;
}

export interface QuestProgress {
  levels: QuestLevelProgress[];
  foundCount: number;
  total: number;
}

/**
 * Сопоставляет историю с квестами.
 *
 * Засчитывается только топ-1 результат распознавания: в `top_species` лежит
 * именно он. Если вид попадался несколько раз, показываем самую раннюю
 * находку — это дата, когда квест был закрыт.
 */
export function questProgressFrom(entries: CheckerHistoryEntry[]): QuestProgress {
  const earliest = new Map<string, CheckerHistoryEntry>();
  for (const entry of entries) {
    const key = normalizeSpeciesName(entry.scientificName);
    const known = earliest.get(key);
    if (!known || entry.createdAt < known.createdAt) earliest.set(key, entry);
  }

  const levels = QUEST_LEVELS.map((level) => {
    const species = level.species.map((item) => {
      const hit = questSpeciesNames(item)
        .map((name) => earliest.get(name))
        .filter((entry): entry is CheckerHistoryEntry => Boolean(entry))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
      return { species: item, found: hit ?? null };
    });
    const foundCount = species.filter((item) => item.found).length;
    return {
      level,
      species,
      foundCount,
      total: species.length,
      complete: foundCount === species.length,
    };
  });

  return {
    levels,
    foundCount: levels.reduce((sum, level) => sum + level.foundCount, 0),
    total: levels.reduce((sum, level) => sum + level.total, 0),
  };
}

/** «12 August 2026» / «12 августа 2026» — дата находки. */
export function formatHistoryDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
