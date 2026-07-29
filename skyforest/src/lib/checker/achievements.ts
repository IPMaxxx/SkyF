"use client";

/**
 * Достижения Mushroom Checker: ранг аккаунта, медали уровней и разбор того,
 * что именно закрыла только что сделанная находка.
 *
 * Ничего не хранится отдельно — как и прогресс квестов, всё выводится из
 * `mushroom_identifications`. Одно место правды: не бывает аккаунта с медалью
 * без находки и находки без медали, а удаление аккаунта уносит и достижения.
 *
 * Здесь своя, облегчённая выборка вместо `useCheckerHistory`: экрану аккаунта и
 * экрану результата нужны только имена и даты, а история тянет ещё и
 * подписанные ссылки на фотографии — до двухсот штук одним запросом. Поэтому
 * читаем лишь строки с квестовыми видами и лишь три поля.
 *
 * Единственное, что действительно лежит в браузере, — отметка «в квестах есть
 * непросмотренное» для точки на вкладке. Это состояние интерфейса, а не данные:
 * потеря отметки не ломает ничего, кроме самой точки.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  findQuestSpecies,
  normalizeSpeciesName,
  QUEST_LEVELS,
  QUEST_LOOKUP_NAMES,
  QUEST_TOTAL_SPECIES,
  questSpeciesNames,
} from "@/lib/checker/quests";

/* ------------------------------------------------------------------ */
/* Ранги                                                               */
/* ------------------------------------------------------------------ */

export type RankKey =
  | "start"
  | "spotter"
  | "naturalist"
  | "mycophile"
  | "master";

export interface Rank {
  key: RankKey;
  /** С какого количества найденных видов ранг действует. */
  from: number;
}

/**
 * Пороги подобраны так, чтобы ранг менялся заметно, но не на каждой находке:
 * первый вид уже выводит из нулевого состояния, а последний — только когда
 * закрыты все пятнадцать.
 */
export const RANKS: readonly Rank[] = [
  { key: "start", from: 0 },
  { key: "spotter", from: 1 },
  { key: "naturalist", from: 5 },
  { key: "mycophile", from: 10 },
  { key: "master", from: QUEST_TOTAL_SPECIES },
];

export interface RankState {
  rank: Rank;
  /** Следующий ранг; null — дальше некуда. */
  next: Rank | null;
  /** Сколько видов осталось до следующего ранга. */
  toNext: number;
}

export function rankFor(found: number): RankState {
  let index = 0;
  for (let i = 0; i < RANKS.length; i += 1) {
    if (found >= RANKS[i].from) index = i;
  }
  const next = RANKS[index + 1] ?? null;
  return {
    rank: RANKS[index],
    next,
    toNext: next ? next.from - found : 0,
  };
}

/* ------------------------------------------------------------------ */
/* Облегчённая выборка находок                                         */
/* ------------------------------------------------------------------ */

export interface QuestFind {
  /** id распознавания — по нему видно, эта ли находка закрыла квест. */
  id: string;
  createdAt: string;
}

/** Ключ — нормализованное имя вида, значение — самая ранняя его находка. */
export type QuestFinds = Map<string, QuestFind>;

/** null — запрос не удался; пустая карта означает «находок действительно нет». */
export async function fetchQuestFinds(): Promise<QuestFinds | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("mushroom_identifications")
      .select("id, top_species, created_at")
      .in("top_species", [...QUEST_LOOKUP_NAMES])
      .order("created_at", { ascending: true });

    if (error) return null;

    const finds: QuestFinds = new Map();
    for (const row of (data ?? []) as {
      id: string;
      top_species: string | null;
      created_at: string;
    }[]) {
      if (!row.top_species) continue;
      const key = normalizeSpeciesName(row.top_species);
      // Порядок по возрастанию даты: первая встреченная запись и есть самая
      // ранняя, поздние перезаписывать не нужно.
      if (!finds.has(key)) finds.set(key, { id: row.id, createdAt: row.created_at });
    }
    return finds;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Счёт по уровням                                                     */
/* ------------------------------------------------------------------ */

export interface LevelCount {
  id: number;
  key: string;
  found: number;
  total: number;
  complete: boolean;
}

export interface QuestCounts {
  found: number;
  total: number;
  levels: LevelCount[];
}

export const EMPTY_COUNTS: QuestCounts = {
  found: 0,
  total: QUEST_TOTAL_SPECIES,
  levels: QUEST_LEVELS.map((level) => ({
    id: level.id,
    key: level.key,
    found: 0,
    total: level.species.length,
    complete: false,
  })),
};

/** Есть ли находка у вида — с учётом псевдонимов. */
function isFound(finds: QuestFinds, names: string[]): boolean {
  return names.some((name) => finds.has(name));
}

export function countsFrom(finds: QuestFinds): QuestCounts {
  const levels = QUEST_LEVELS.map((level) => {
    const found = level.species.filter((species) =>
      isFound(finds, questSpeciesNames(species)),
    ).length;
    return {
      id: level.id,
      key: level.key,
      found,
      total: level.species.length,
      complete: found === level.species.length,
    };
  });

  return {
    levels,
    found: levels.reduce((sum, level) => sum + level.found, 0),
    total: levels.reduce((sum, level) => sum + level.total, 0),
  };
}

/* ------------------------------------------------------------------ */
/* Что закрыла находка                                                 */
/* ------------------------------------------------------------------ */

export interface QuestUnlock {
  speciesKey: string;
  levelId: number;
  levelKey: string;
  /** Этой находкой закрылся весь уровень. */
  levelComplete: boolean;
  /** Новый ранг, если находка его подняла. */
  rankUp: RankKey | null;
  /** Закрыты все виды всех уровней. */
  allDone: boolean;
  counts: QuestCounts;
}

/**
 * Разбирает, что дало распознавание `identificationId` вида `scientificName`.
 *
 * Возвращает null, когда праздновать нечего: вид не входит в квесты либо уже
 * был найден раньше. «Раньше» проверяется по id самой ранней находки этого
 * вида, а не по количеству записей: повторные снимки того же гриба не должны
 * заново закрывать квест.
 */
export function unlockFrom(
  finds: QuestFinds,
  identificationId: string,
  scientificName: string,
): QuestUnlock | null {
  const target = findQuestSpecies(scientificName);
  if (!target) return null;

  const names = questSpeciesNames(target.species);
  const earliest = names
    .map((name) => finds.get(name))
    .filter((find): find is QuestFind => Boolean(find))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];

  if (!earliest || earliest.id !== identificationId) return null;

  const counts = countsFrom(finds);
  const level = counts.levels.find((item) => item.id === target.level.id);
  const before = rankFor(counts.found - 1).rank.key;
  const after = rankFor(counts.found).rank.key;

  return {
    speciesKey: target.species.key,
    levelId: target.level.id,
    levelKey: target.level.key,
    levelComplete: Boolean(level?.complete),
    rankUp: before === after ? null : after,
    allDone: counts.found === counts.total,
    counts,
  };
}

/* ------------------------------------------------------------------ */
/* Счёт для экранов                                                    */
/* ------------------------------------------------------------------ */

export interface QuestStats {
  counts: QuestCounts;
  rank: RankState;
  loading: boolean;
  failed: boolean;
}

/** Прогресс без фотографий — для аккаунта и других мест, где нужен только счёт. */
export function useQuestStats(): QuestStats {
  const [counts, setCounts] = useState<QuestCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const finds = await fetchQuestFinds();
      if (!alive) return;
      if (finds) setCounts(countsFrom(finds));
      setFailed(!finds);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { counts, rank: rankFor(counts.found), loading, failed };
}

/* ------------------------------------------------------------------ */
/* Точка «есть непросмотренное» на вкладке                             */
/* ------------------------------------------------------------------ */

const UNSEEN_KEY = "ck-quests-unseen";
/** Своё событие: `storage` в той же вкладке не срабатывает. */
const UNSEEN_EVENT = "ck-quests-unseen";

/**
 * Значение кэшируется в модуле, потому что `useSyncExternalStore` дёргает
 * снимок на каждом рендере, а чтение localStorage на горячем пути ни к чему.
 */
let unseenCache = false;
let hydrated = false;

function readUnseen(): boolean {
  try {
    return window.localStorage.getItem(UNSEEN_KEY) === "1";
  } catch {
    // Приватный режим и заблокированное хранилище: точка не так важна.
    return false;
  }
}

function writeUnseen(next: boolean) {
  unseenCache = next;
  hydrated = true;
  try {
    if (next) window.localStorage.setItem(UNSEEN_KEY, "1");
    else window.localStorage.removeItem(UNSEEN_KEY);
  } catch {
    /* см. readUnseen */
  }
  window.dispatchEvent(new Event(UNSEEN_EVENT));
}

export function markQuestsUnseen() {
  if (typeof window === "undefined") return;
  writeUnseen(true);
}

export function clearQuestsUnseen() {
  if (typeof window === "undefined") return;
  if (!readUnseen() && !unseenCache) return;
  writeUnseen(false);
}

function subscribeUnseen(onChange: () => void): () => void {
  if (!hydrated) {
    hydrated = true;
    unseenCache = readUnseen();
  }
  const sync = () => {
    unseenCache = readUnseen();
    onChange();
  };
  window.addEventListener(UNSEEN_EVENT, sync);
  window.addEventListener("storage", sync);
  return () => {
    window.removeEventListener(UNSEEN_EVENT, sync);
    window.removeEventListener("storage", sync);
  };
}

/** true — после последнего визита в квесты что-то открылось. */
export function useQuestsBadge(): boolean {
  return useSyncExternalStore(
    subscribeUnseen,
    () => unseenCache,
    () => false,
  );
}
