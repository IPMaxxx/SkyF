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
 */

export interface Lookalike {
  /** Реальный биномиал — для фото и ссылок. */
  scientific_name: string;
  /** Человекочитаемое описание с пометкой опасности. */
  label: string;
}

const BY_SPECIES: Record<string, Lookalike[]> = {
  "Boletus edulis": [
    { scientific_name: "Tylopilus felleus", label: "жёлчный гриб — очень горький, несъедобен" },
    { scientific_name: "Rubroboletus satanas", label: "сатанинский гриб — ядовит" },
  ],
  "Cantharellus cibarius": [
    { scientific_name: "Hygrophoropsis aurantiaca", label: "ложная лисичка" },
    { scientific_name: "Omphalotus olearius", label: "омфалот маслиновый — ядовит" },
  ],
  "Macrolepiota procera": [
    { scientific_name: "Chlorophyllum molybdites", label: "хлорофиллум — вызывает отравления" },
    { scientific_name: "Amanita phalloides", label: "бледная поганка (молодые похожи) — смертельно ядовита" },
  ],
};

const BY_GENUS: Record<string, Lookalike[]> = {
  Boletus: [
    { scientific_name: "Tylopilus felleus", label: "жёлчный гриб — горький, несъедобен" },
    { scientific_name: "Rubroboletus satanas", label: "сатанинский гриб — ядовит" },
  ],
  Agaricus: [
    { scientific_name: "Amanita phalloides", label: "бледная поганка — смертельно ядовита" },
    { scientific_name: "Amanita virosa", label: "белый мухомор — смертельно ядовит" },
  ],
  Armillaria: [
    { scientific_name: "Galerina marginata", label: "галерина окаймлённая — смертельно ядовита" },
    { scientific_name: "Hypholoma fasciculare", label: "ложноопёнок серно-жёлтый — ядовит" },
  ],
  Pleurotus: [
    { scientific_name: "Omphalotus olearius", label: "омфалот маслиновый — ядовит" },
  ],
  Cantharellus: [
    { scientific_name: "Hygrophoropsis aurantiaca", label: "ложная лисичка" },
    { scientific_name: "Omphalotus olearius", label: "омфалот маслиновый — ядовит" },
  ],
  Leccinum: [
    { scientific_name: "Tylopilus felleus", label: "жёлчный гриб — горький, несъедобен" },
  ],
  Amanita: [
    { scientific_name: "Amanita phalloides", label: "бледная поганка — смертельно ядовита" },
    { scientific_name: "Amanita muscaria", label: "мухомор красный — ядовит" },
  ],
  Lactarius: [
    { scientific_name: "Lactarius torminosus", label: "волнушка розовая — едкий млечный сок" },
  ],
  Russula: [
    { scientific_name: "Russula emetica", label: "сыроежка жгучая — едкая" },
  ],
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
