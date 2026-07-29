/**
 * Mushroom Checker — состав квестов.
 *
 * ЭТО ЕДИНСТВЕННОЕ МЕСТО, ГДЕ МЕНЯЕТСЯ СПИСОК ВИДОВ И ИХ РАСПРЕДЕЛЕНИЕ ПО
 * УРОВНЯМ. Чтобы переставить гриб между уровнями, достаточно перенести строчку
 * из одного массива `species` в другой — механика подтянется сама: прогресс
 * считается по фактическим распознаваниям, ничего не закэшировано и не лежит
 * отдельной таблицей в базе. Названия видов на двух языках, предупреждения о
 * двойниках и подсказка «где и когда искать» живут в `checker.{en,ru}.ts` под
 * ключами `quests.species.<key>`, `quests.warnings.<key>` и `quests.where.<key>`
 * — новый вид означает и новые строки там.
 *
 * КАК ЗАСЧИТЫВАЕТСЯ ПРОГРЕСС. Вид отмечен найденным, если в истории
 * распознаваний есть запись, где ПЕРВЫЙ по вероятности результат — этот вид.
 * `aliases` существуют потому, что модель возвращает конкретный биномиал, а в
 * поле (и в разных регионах) цель квеста — это группа близких видов: опёнок
 * осенний в Северной Америке чаще определяется как Armillaria ostoyae,
 * лисичка на западном побережье США — как Cantharellus formosus, рыжик под
 * елью — как Lactarius deterrimus. Считать это «не тем грибом» было бы
 * таксономически честно и обидно для пользователя, поэтому такие имена
 * закрывают тот же квест.
 *
 * ПРОВЕРЕНО ПО БАЗЕ РАСПОЗНАВАНИЯ. Все 15 целей и все псевдонимы найдены как
 * самостоятельные сущности в базе знаний Kindwise
 * (`GET /api/v1/kb/mushroom/name_search`) — это та же база, что стоит за
 * `/api/mushrooms/identify`. Ни одна цель не пришлось сводить к роду.
 *
 * УРОВНИ НЕ ЗАПЕРТЫ. Квест засчитывается независимо от того, закрыты ли
 * предыдущие уровни: находка редкого гриба не должна пропадать из-за того,
 * что человеку повезло раньше времени.
 *
 * БЕЗОПАСНОСТЬ. Квест — про распознавание и фотографию, а не про сбор в
 * корзину: в текстах нет «собери», карточка вида ведёт на справку о виде, а у
 * видов с опасными двойниками (или спорной съедобностью) стоит `warning` —
 * экран показывает предупреждение прямо в карточке. Флаг ставится по факту
 * опасности, а не «на всякий случай»: лишние предупреждения перестают читать.
 */

/**
 * Морфология вида. По ней рисуется силуэт цели, которую ещё не нашли:
 * фотографии у такой цели нет, а шесть узнаваемых форм на шестнадцать видов
 * дают плитке смысл. Свои силуэты, а не снимки из справочников: карточка
 * работает офлайн и не тянет за собой чужие лицензии на фото.
 */
export type MushroomShape =
  | "bolete"
  | "chanterelle"
  | "gilled"
  | "morel"
  | "parasol"
  | "trumpet";

export interface QuestSpecies {
  /** Ключ текстов: `checker.quests.species.<key>`. */
  key: string;
  /** Канонический биномиал: его показываем и с ним сверяем в первую очередь. */
  scientificName: string;
  /** Форма силуэта для плитки, пока вид не найден. */
  shape: MushroomShape;
  /**
   * Имена, которые модель может вернуть вместо канонического: региональные
   * виды-двойники той же цели и синонимы. Засчитываются в тот же квест.
   */
  aliases?: string[];
  /**
   * У вида есть опасный двойник или спорная съедобность. Экран покажет текст
   * `checker.quests.warnings.<key>` прямо в карточке.
   */
  warning?: true;
}

export interface QuestLevel {
  /** Номер уровня, он же порядок показа. */
  id: number;
  /** Ключ текстов: `checker.quests.levels.<key>`. */
  key: string;
  species: QuestSpecies[];
}

export const QUEST_LEVELS: readonly QuestLevel[] = [
  {
    id: 1,
    key: "level1",
    species: [
      {
        key: "cantharellusCibarius",
        scientificName: "Cantharellus cibarius",
        shape: "chanterelle",
        aliases: ["Cantharellus formosus", "Cantharellus roseocanus"],
        warning: true,
      },
      {
        key: "boletusReticulatus",
        scientificName: "Boletus reticulatus",
        shape: "bolete",
        aliases: ["Boletus aestivalis"],
      },
      {
        key: "armillariaMellea",
        scientificName: "Armillaria mellea",
        shape: "gilled",
        aliases: [
          "Armillaria ostoyae",
          "Armillaria solidipes",
          "Armillaria borealis",
          "Armillaria gallica",
          "Armillaria cepistipes",
        ],
        warning: true,
      },
      { key: "suillusLuteus", scientificName: "Suillus luteus", shape: "bolete" },
      {
        key: "russulaAeruginea",
        scientificName: "Russula aeruginea",
        shape: "gilled",
        aliases: ["Russula virescens"],
        warning: true,
      },
    ],
  },
  {
    id: 2,
    key: "level2",
    species: [
      {
        key: "macrolepiotaProcera",
        scientificName: "Macrolepiota procera",
        shape: "parasol",
        warning: true,
      },
      {
        key: "leccinumScabrum",
        scientificName: "Leccinum scabrum",
        shape: "bolete",
      },
      {
        key: "lactariusDeliciosus",
        scientificName: "Lactarius deliciosus",
        shape: "gilled",
        aliases: [
          "Lactarius deterrimus",
          "Lactarius sanguifluus",
          "Lactarius rubrilacteus",
        ],
      },
      {
        key: "leccinumVersipelle",
        scientificName: "Leccinum versipelle",
        shape: "bolete",
      },
      {
        key: "tricholomaEquestre",
        scientificName: "Tricholoma equestre",
        shape: "gilled",
        aliases: ["Tricholoma auratum", "Tricholoma flavovirens"],
        warning: true,
      },
    ],
  },
  {
    id: 3,
    key: "level3",
    species: [
      {
        key: "morchellaEsculenta",
        scientificName: "Morchella esculenta",
        shape: "morel",
        aliases: ["Morchella americana", "Morchella esculentoides"],
        warning: true,
      },
      {
        key: "boletusPinophilus",
        scientificName: "Boletus pinophilus",
        shape: "bolete",
      },
      {
        key: "craterellusCornucopioides",
        scientificName: "Craterellus cornucopioides",
        shape: "trumpet",
        aliases: ["Craterellus fallax"],
      },
      {
        key: "leccinumAlbostipitatum",
        scientificName: "Leccinum albostipitatum",
        shape: "bolete",
      },
      {
        key: "flammulinaVelutipes",
        scientificName: "Flammulina velutipes",
        shape: "gilled",
        aliases: ["Flammulina filiformis"],
        warning: true,
      },
    ],
  },
] as const;

export const QUEST_TOTAL_SPECIES = QUEST_LEVELS.reduce(
  (sum, level) => sum + level.species.length,
  0,
);

/**
 * Имена всех целей ровно в том виде, в каком их возвращает распознавание.
 * Нужны для выборки «только квестовые находки» по `top_species`: экраны
 * достижений считают прогресс, не читая всю историю с фотографиями.
 */
export const QUEST_LOOKUP_NAMES: readonly string[] = QUEST_LEVELS.flatMap(
  (level) =>
    level.species.flatMap((species) => [
      species.scientificName,
      ...(species.aliases ?? []),
    ]),
);

/**
 * Приводит имя вида к сравнимому виду: снимает регистр, лишние пробелы и
 * инфравидовой ранг («Cantharellus cibarius var. amethysteus»), который
 * справочники иногда дописывают к биномиалу.
 */
export function normalizeSpeciesName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+(var|subsp|ssp|f|forma)\.?\s+.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Все имена вида (каноническое + псевдонимы) в нормализованном виде. */
export function questSpeciesNames(species: QuestSpecies): string[] {
  return [species.scientificName, ...(species.aliases ?? [])].map(
    normalizeSpeciesName,
  );
}

/**
 * Цель квеста по имени из распознавания — вместе с уровнем, которому она
 * принадлежит. Псевдонимы учитываются, поэтому региональный вид-двойник
 * находит ту же цель, что и канонический биномиал.
 */
export function findQuestSpecies(
  scientificName: string,
): { species: QuestSpecies; level: QuestLevel } | null {
  const name = normalizeSpeciesName(scientificName);
  for (const level of QUEST_LEVELS) {
    for (const species of level.species) {
      if (questSpeciesNames(species).includes(name)) return { species, level };
    }
  }
  return null;
}

/**
 * Справочная страница вида — куда ведёт карточка ещё не найденного гриба.
 *
 * Поиск iNaturalist, а не статья Википедии: адрес статьи зависит от языка и от
 * текущего принятого названия вида, захардкоженные ссылки протухают. Поиск по
 * биномиалу работает всегда и открывает карточку с фотографиями и ареалом —
 * то есть ведёт к информации о виде, а не к инструкции по сбору.
 */
export function speciesReferenceUrl(scientificName: string): string {
  return `https://www.inaturalist.org/search?q=${encodeURIComponent(scientificName)}`;
}
