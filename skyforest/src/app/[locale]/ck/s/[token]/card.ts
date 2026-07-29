/**
 * Разбор токена публичной карточки и поиск того, о чём она рассказывает.
 *
 * Файл общий для страницы и картинки OG: обе получают один и тот же токен и
 * должны понимать его одинаково. Всё, что нужно знать снаружи, — что «битый
 * токен» это `null`, а не исключение: по ссылке из мессенджера обязана
 * открыться карточка, пусть и нейтральная, а не страница ошибки.
 */

import {
  parseShareToken,
  type SharePayload,
} from "@/lib/checker/share";
import {
  QUEST_LEVELS,
  type QuestLevel,
  type QuestSpecies,
} from "@/lib/checker/quests";

/**
 * Mushroom Checker в сторах. Ссылки в `lib/checker/externalLinks.ts` ведут на
 * другое приложение (SkyForest), поэтому переиспользовать их нельзя.
 */
export const CHECKER_APP_STORE = "https://apps.apple.com/app/id6795201197";
export const CHECKER_GOOGLE_PLAY =
  "https://play.google.com/store/apps/details?id=ai.skyforest.mushroomchecker";

/** Секрет подписи. Его отсутствие — не ошибка: см. lib/checker/share.ts. */
const SECRET = process.env.CHECKER_SHARE_SECRET;

export async function readShareToken(
  token: string,
): Promise<SharePayload | null> {
  const parsed = await parseShareToken(decodeURIComponent(token), SECRET);
  return parsed?.payload ?? null;
}

export function findQuestSpecies(key: string): QuestSpecies | undefined {
  for (const level of QUEST_LEVELS) {
    const species = level.species.find((item) => item.key === key);
    if (species) return species;
  }
  return undefined;
}

export function findQuestLevel(id: number): QuestLevel | undefined {
  return QUEST_LEVELS.find((level) => level.id === id);
}
