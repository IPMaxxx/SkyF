/**
 * Клиент и парсер Kindwise mushroom.id API.
 *
 * Порт логики из Mashbot (`bot/recognition/kindwise.py`): тем же ключом
 * `KINDWISE_API_KEY` дёргаем `https://mushroom.kindwise.com/api/v1/identification`
 * и разбираем ранжированный список видов с вероятностями.
 *
 * ВАЖНО (безопасность): ключ читается ТОЛЬКО из серверного окружения и
 * никогда не должен попадать в клиент (`NEXT_PUBLIC_*`).
 */

/** Пороги отображения — совпадают с ботом (`bot/config.py`). */
export const MIN_PROBABILITY = 0.02;
export const MAX_SUGGESTIONS = 5;
export const LOW_CONFIDENCE_THRESHOLD = 0.3;

export interface SpeciesSuggestion {
  /** Реальный биномиал — для фото/ссылок и справочников. */
  scientific_name: string;
  /** 0..1 */
  probability: number;
  common_names: string[];
  url: string | null;
  similar_image_urls: string[];
}

export interface RecognitionResult {
  suggestions: SpeciesSuggestion[];
  /** Считает ли модель, что на фото есть гриб/организм. */
  is_organism: boolean;
  raw?: unknown;
}

interface KindwiseSuggestionRaw {
  name?: string;
  probability?: number;
  details?: {
    common_names?: string[] | null;
    url?: string | null;
  } | null;
  similar_images?: Array<{ url?: string | null }> | null;
}

interface KindwiseDataRaw {
  result?: {
    is_mushroom?: { binary?: boolean } | boolean | null;
    is_organism?: { binary?: boolean } | boolean | null;
    classification?: {
      suggestions?: KindwiseSuggestionRaw[] | null;
    } | null;
  } | null;
}

/**
 * Разбор ответа Kindwise в нейтральный `RecognitionResult`.
 * Порт `KindwiseRecognizer._parse` из Mashbot.
 */
export function parseKindwise(data: unknown): RecognitionResult {
  const d = (data ?? {}) as KindwiseDataRaw;
  const result = d.result ?? {};

  let isOrganism = true;
  const organism = result.is_mushroom ?? result.is_organism;
  if (organism && typeof organism === "object") {
    isOrganism = Boolean((organism as { binary?: boolean }).binary ?? true);
  }

  const rawSuggestions = result.classification?.suggestions ?? [];

  const suggestions: SpeciesSuggestion[] = [];
  for (const item of rawSuggestions) {
    const details = item.details ?? {};
    const similar = (item.similar_images ?? [])
      .map((img) => img?.url)
      .filter((u): u is string => Boolean(u));

    suggestions.push({
      scientific_name: (item.name ?? "").trim(),
      probability: Number(item.probability ?? 0) || 0,
      common_names: [...(details.common_names ?? [])].filter(Boolean),
      url: details.url ?? null,
      similar_image_urls: similar,
    });
  }

  return { suggestions, is_organism: isOrganism, raw: data };
}

/**
 * Отфильтрованные и обрезанные подсказки, которые реально показываем.
 * Порт `visible_suggestions` из `bot/formatting/render.py`.
 */
export function visibleSuggestions(result: RecognitionResult): SpeciesSuggestion[] {
  if (!result.is_organism || result.suggestions.length === 0) return [];
  return result.suggestions
    .filter((s) => s.probability >= MIN_PROBABILITY)
    .slice(0, MAX_SUGGESTIONS);
}

export interface KindwiseOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  /** ISO-код языка для language-зависимых полей (common_names, url). По умолчанию английский. */
  language?: string;
}

const DEFAULT_BASE_URL = "https://mushroom.kindwise.com/api/v1";

/**
 * Отправляет изображение в Kindwise и возвращает разобранный результат.
 * Порт `KindwiseRecognizer.identify`.
 */
export async function identifyMushroom(
  imageBytes: Uint8Array,
  options: KindwiseOptions,
): Promise<RecognitionResult> {
  const apiKey = options.apiKey;
  if (!apiKey) throw new Error("KINDWISE_API_KEY is not set");

  const baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const encoded = Buffer.from(imageBytes).toString("base64");

  const query = new URLSearchParams({ details: "common_names,url" });
  if (options.language) query.set("language", options.language);
  const url = `${baseUrl}/identification?${query.toString()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": apiKey,
    },
    body: JSON.stringify({ images: [encoded], similar_images: true }),
    signal: AbortSignal.timeout(options.timeoutMs ?? 30000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Kindwise error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return parseKindwise(data);
}
