/**
 * Курируемый справочник опасных двойников распространённых грибов.
 * Порт `bot/data/lookalikes.py` из Mashbot.
 *
 * ВАЖНО (безопасность): это образовательная, НЕ исчерпывающая справка. Цель —
 * предупредить, что у похожего вида есть ядовитые двойники, и побудить сверять
 * признаки. Сервис не даёт советов о съедобности.
 *
 * Двойники заданы реальными биномиальными названиями (`scientific_name`), чтобы
 * по ним можно было подтянуть фото из биологических баз. Поиск идёт сначала по
 * точному виду, затем по роду.
 *
 * Локализация: сам биномиал — стабильный код. Человекочитаемая подпись двойника
 * переводится на клиенте через namespace `identify` (`lookalikeLabels`) по
 * `scientific_name`. Старые сохранённые результаты могли нести готовую русскую
 * подпись в `label` — клиент выводит её как есть (обратная совместимость).
 */

export interface Lookalike {
  /** Реальный биномиал — стабильный код, для фото/ссылок и перевода подписи. */
  scientific_name: string;
}

const BY_SPECIES: Record<string, Lookalike[]> = {
  "Boletus edulis": [
    { scientific_name: "Tylopilus felleus" },
    { scientific_name: "Rubroboletus satanas" },
  ],
  "Cantharellus cibarius": [
    { scientific_name: "Hygrophoropsis aurantiaca" },
    { scientific_name: "Omphalotus olearius" },
  ],
  "Macrolepiota procera": [
    { scientific_name: "Chlorophyllum molybdites" },
    { scientific_name: "Amanita phalloides" },
  ],
};

const BY_GENUS: Record<string, Lookalike[]> = {
  Boletus: [
    { scientific_name: "Tylopilus felleus" },
    { scientific_name: "Rubroboletus satanas" },
  ],
  Agaricus: [
    { scientific_name: "Amanita phalloides" },
    { scientific_name: "Amanita virosa" },
  ],
  Armillaria: [
    { scientific_name: "Galerina marginata" },
    { scientific_name: "Hypholoma fasciculare" },
  ],
  Pleurotus: [{ scientific_name: "Omphalotus olearius" }],
  Cantharellus: [
    { scientific_name: "Hygrophoropsis aurantiaca" },
    { scientific_name: "Omphalotus olearius" },
  ],
  Leccinum: [{ scientific_name: "Tylopilus felleus" }],
  Amanita: [
    { scientific_name: "Amanita phalloides" },
    { scientific_name: "Amanita muscaria" },
  ],
  Lactarius: [{ scientific_name: "Lactarius torminosus" }],
  Russula: [{ scientific_name: "Russula emetica" }],
};

function genusOf(scientificName: string): string {
  return scientificName ? scientificName.trim().split(" ")[0] : "";
}

/** Список опасных двойников для вида (по виду, затем по роду). Может быть пустым. */
export function dangerousLookalikes(
  scientificName: string,
  genus?: string | null,
): Lookalike[] {
  if (BY_SPECIES[scientificName]) return BY_SPECIES[scientificName];
  const g = (genus || genusOf(scientificName)).trim();
  return BY_GENUS[g] ?? [];
}
