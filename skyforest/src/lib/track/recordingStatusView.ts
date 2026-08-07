/**
 * Строка состояния записи: что показать человеку при каждом раскладе.
 *
 * Вынесено из компонента отдельным модулем без импортов ровно затем, чтобы это
 * проверялось в Node без телефона. Ошиблись мы именно здесь: в сборке без
 * нативной службы строка навсегда застревала на «включаем запись…» и горела
 * красным, хотя путь при этом писался. Красный означает «путь теряется», и
 * ничего другого он означать не должен.
 *
 * Правило одно: тон описывает ИТОГ записи, а не состояние отдельного источника.
 */

export interface RecordingStatusInput {
  hasTrack: boolean;
  /** Пишет хоть кто-то (обычный watch или служба). */
  recording: boolean;
  /** Служба переднего плана: пишет и с погашенным экраном. */
  background: boolean;
  /** Прямо сейчас идёт попытка поднять службу. */
  backgroundStarting: boolean;
  backgroundIssue: string | null;
}

export type RecordingTone =
  /** Всё как задумано: пишем и с погашенным экраном. */
  | "on"
  /** Пишем, но не везде или не видно. Спокойный тон. */
  | "calm"
  /** Не пишет никто — единственный повод для красного. */
  | "alarm";

export type RecordingTitle = "on" | "foregroundOnly" | "off";

export interface RecordingStatusView {
  tone: RecordingTone;
  title: RecordingTitle;
  /** Ключ пояснения в словаре WayBack (wayback.active.recordingStatus). */
  body: string;
}

export function recordingStatusView(state: RecordingStatusInput): RecordingStatusView | null {
  if (!state.hasTrack) return null;

  const notificationHidden = state.backgroundIssue === "notificationsBlocked";
  if (state.background) {
    return {
      tone: notificationHidden ? "calm" : "on",
      title: "on",
      body: notificationHidden ? "bodyNoNotice" : "bodyOn",
    };
  }

  const tone: RecordingTone = state.recording ? "calm" : "alarm";
  const title: RecordingTitle = state.recording ? "foregroundOnly" : "off";
  return { tone, title, body: bodyKey(state) };
}

function bodyKey(state: RecordingStatusInput): string {
  // «Включаем…» — только пока попытка действительно идёт. Иначе это состояние
  // висит вечно там, где попытки не было вовсе.
  if (state.backgroundStarting && state.backgroundIssue == null) return "bodyStarting";
  switch (state.backgroundIssue) {
    case "unsupported":
      return "bodyUnsupported";
    case "locationDenied":
      return "bodyLocationDenied";
    case "preciseLocation":
      return "bodyPrecise";
    case "locationOff":
      return "bodyLocationOff";
    case "failed":
      return "bodyFailed";
    default:
      return state.recording ? "bodyForegroundOnly" : "bodyNothing";
  }
}
