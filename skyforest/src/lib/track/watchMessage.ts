/**
 * Что сказать человеку о записи пути — по итогу, а не по отдельному источнику.
 *
 * Правило одно и оно важное: тревожное сообщение говорится, только когда не
 * работает ни один источник. Если обычный watch пишет, а фоновая служба не
 * поднялась — это не поломка, а «запись идёт, пока приложение открыто», и тон
 * должен быть спокойный. Первая версия этой логики смотрела на отказ фонового
 * слота и с погашенным экраном пугала человека «путь не записывается», отправляя
 * его чинить включённую геолокацию.
 *
 * С погашенным экраном не судим вовсе: снятый обычный watch там — задуманное
 * поведение, а не новость, да и читать тост в этот момент некому.
 *
 * Модуль без импортов — сопоставление состояния и слов проверяется в Node,
 * см. fastlane/.track-watch-check.mjs.
 */

export interface WatchMessageInput {
  hasTrack: boolean;
  appForeground: boolean;
  plain: boolean;
  background: boolean;
  /** Почему нет фона; null — вопросов нет либо он ещё не пробовал стартовать. */
  backgroundIssue: string | null;
}

export type WatchMessage =
  /** Всё хорошо либо судить рано — молчим. */
  | "silent"
  /** Не пишет никто. */
  | "notRecording"
  /** Пишем, но только пока приложение открыто. */
  | "foregroundOnly";

export function watchMessage(state: WatchMessageInput): WatchMessage {
  if (!state.hasTrack || !state.appForeground) return "silent";
  if (!state.plain && !state.background) return "notRecording";
  if (state.background || state.backgroundIssue == null) return "silent";
  // Про запрет уведомлений говорит отдельный тост со ссылкой в настройки:
  // запись при этом идёт в фоне как надо, просто её не видно.
  if (state.backgroundIssue === "notificationsBlocked") return "silent";
  return "foregroundOnly";
}
