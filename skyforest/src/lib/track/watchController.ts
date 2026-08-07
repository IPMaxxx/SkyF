/**
 * Что из источников записи трека должно работать прямо сейчас.
 *
 * Источников два, и они независимы:
 *  - «plain» — обычный watchPosition, нужен, пока идёт поход и приложение на
 *    переднем плане (в фоне WebView координат не получает);
 *  - «background» — служба переднего плана Android / фоновый режим iOS, нужна
 *    всё время похода.
 *
 * Независимость здесь — не архитектурная роскошь, а урок: пока это был один
 * слот с выбором «фон ИЛИ обычный», любая осечка при поднятии фона оставляла
 * поход вообще без записи. Осечку легко не заметить: плагин фоновой геолокации
 * сообщает об отказе не отклонённым промисом, а вызовом колбэка с ошибкой, и
 * «start вернул управление» вовсе не значит «служба поднялась». Теперь обычный
 * watch на переднем плане стоит всегда и ни от чего не зависит, а фоновая
 * служба к нему добавляется. Хуже, чем до фоновой записи, стать не может.
 *
 * Модуль намеренно без единого импорта: источники передаются снаружи, поэтому
 * весь сценарий («похода нет → старт → фон → возврат → финиш») проверяется в
 * Node без телефона и без сборки — см. fastlane/.track-watch-check.mjs.
 */

export type WatchSlot = "plain" | "background";

/** Поднимает источник. Возвращает остановку либо null, если поднять не вышло. */
export type WatchStarter = () => Promise<(() => void) | null>;

export interface WatchInputs {
  hasTrack: boolean;
  appForeground: boolean;
  /** Можно ли пытаться поднять фон: у приложения есть текст уведомления. */
  backgroundAllowed: boolean;
}

export interface WatchController {
  /** Меняет условия и сверяет оба источника с ними. */
  update(patch: Partial<WatchInputs>): void;
  /** Источник сам сообщил, что перестал работать (ошибка плагина). */
  markStopped(slot: WatchSlot): void;
  /**
   * Источник уже работает, хотя контроллер его не поднимал. Так бывает с
   * фоновой службой: она живёт в системе, а не в JS, и переживает и заморозку
   * страницы, и её перезагрузку.
   */
  adopt(slot: WatchSlot, stop: () => void): void;
  /** Снимает всё: поход завершён или страница уходит. */
  stopAll(): void;
  running(slot: WatchSlot): boolean;
  /** Дожидается конца всех сверок. Нужно проверкам, в приложении не вызывается. */
  settled(): Promise<void>;
}

export function createWatchController(
  starters: Record<WatchSlot, WatchStarter>,
  onChange?: () => void,
): WatchController {
  const inputs: WatchInputs = {
    hasTrack: false,
    appForeground: true,
    backgroundAllowed: false,
  };
  const stops: Record<WatchSlot, (() => void) | null> = {
    plain: null,
    background: null,
  };
  const queues: Record<WatchSlot, Promise<void>> = {
    plain: Promise.resolve(),
    background: Promise.resolve(),
  };

  const wanted = (slot: WatchSlot): boolean =>
    slot === "plain"
      ? inputs.hasTrack && inputs.appForeground
      : inputs.hasTrack && inputs.backgroundAllowed;

  /**
   * Можно ли поднимать источник ПРЯМО СЕЙЧАС. Не то же самое, что «нужен»:
   * фоновая служба нужна весь поход, но поднять её можно только пока
   * приложение на переднем плане.
   *
   * С Android 12 запуск службы переднего плана из фона запрещён и падает с
   * ForegroundServiceStartNotAllowedException. А сверка слотов запускается в
   * том числе по уходу в фон и гашению экрана — то есть если первая попытка
   * почему-то не удалась, все следующие приходились ровно на тот момент,
   * когда система гарантированно откажет. Служба поднимается в момент «ухожу
   * в поход», пока человек смотрит на экран; гашение экрана после этого не
   * запускает ничего — служба уже работает.
   */
  const canStart = (slot: WatchSlot): boolean =>
    slot === "plain" ? true : inputs.appForeground;

  function stopSlot(slot: WatchSlot): void {
    const stop = stops[slot];
    if (!stop) return;
    stops[slot] = null;
    stop();
    onChange?.();
  }

  async function reconcile(slot: WatchSlot): Promise<void> {
    if (!wanted(slot)) {
      stopSlot(slot);
      return;
    }
    if (stops[slot]) return;
    // Не «отказ», а «не сейчас»: попытку повторит возвращение в приложение.
    if (!canStart(slot)) return;
    const stop = await starters[slot]();
    // Не поднялся — следующее событие попробует снова. Молчаливого «навсегда
    // без записи» здесь быть не должно.
    if (!stop) return;
    if (!wanted(slot)) {
      stop();
      return;
    }
    stops[slot] = stop;
    onChange?.();
  }

  /**
   * Сверки одного слота идут по очереди: события старта похода, видимости и
   * появления текста уведомления приходят пачками, а внутри есть await — без
   * очереди два прохода успевают поднять по watch каждый.
   */
  function schedule(slot: WatchSlot): void {
    queues[slot] = queues[slot].then(() => reconcile(slot)).catch(() => {
      /* сверку повторит следующее событие */
    });
  }

  return {
    update(patch) {
      Object.assign(inputs, patch);
      schedule("plain");
      schedule("background");
    },
    markStopped(slot) {
      if (!stops[slot]) return;
      stops[slot] = null;
      onChange?.();
    },
    adopt(slot, stop) {
      if (stops[slot] || !wanted(slot)) {
        stop();
        return;
      }
      stops[slot] = stop;
      onChange?.();
    },
    stopAll() {
      inputs.hasTrack = false;
      stopSlot("plain");
      stopSlot("background");
    },
    running(slot) {
      return stops[slot] != null;
    },
    async settled() {
      for (let i = 0; i < 8; i += 1) {
        const before: [Promise<void>, Promise<void>] = [queues.plain, queues.background];
        await Promise.all(before);
        if (queues.plain === before[0] && queues.background === before[1]) return;
      }
    },
  };
}
