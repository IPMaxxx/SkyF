/**
 * Курируемая справка «Где искать?»: типичная зона обитания и погодные условия,
 * способствующие росту, для распространённых родов грибов.
 * Порт `bot/data/habitat.py` из Mashbot.
 *
 * ВАЖНО (безопасность): это образовательная справка о местах и условиях роста,
 * а не призыв к сбору. Сервис не даёт советов о съедобности.
 *
 * Локализация: сервер отдаёт только СТАБИЛЬНЫЙ КОД совпадения (вид/род); сам
 * текст зоны и погоды переводится на клиенте через namespace `identify`
 * (`habitatData`). Старые сохранённые результаты могли нести готовый русский
 * текст в `zone`/`weather` — клиент выводит его как есть (обратная совместимость).
 *
 * Ключ — род (genus) или вид (binomial). Поиск идёт сначала по виду, затем по роду.
 */

export interface Habitat {
  /** Стабильный код совпадения (вид-биномиал или род) для перевода на клиенте. */
  code: string;
  /** Legacy: готовый (русский) текст из старых сохранённых результатов. */
  zone?: string;
  weather?: string;
}

/** Виды, для которых есть отдельная (более точная) справка. */
const SPECIES_KEYS = new Set<string>(["Boletus edulis"]);

/** Роды, для которых есть справка. */
const GENUS_KEYS = new Set<string>([
  "Boletus",
  "Leccinum",
  "Suillus",
  "Cantharellus",
  "Armillaria",
  "Pleurotus",
  "Agaricus",
  "Macrolepiota",
  "Russula",
  "Lactarius",
  "Amanita",
  "Imleria",
]);

function genusOf(scientificName: string): string {
  return scientificName ? scientificName.trim().split(" ")[0] : "";
}

/**
 * Справка о месте/условиях роста (по виду, затем по роду). Возвращает стабильный
 * код совпадения или null, если данных нет.
 */
export function habitatFor(
  scientificName: string,
  genus?: string | null,
): Habitat | null {
  if (SPECIES_KEYS.has(scientificName)) return { code: scientificName };
  const g = (genus || genusOf(scientificName)).trim();
  if (GENUS_KEYS.has(g)) return { code: g };
  return null;
}
