/**
 * Срок на всё, что на офлайн-пути может не ответить.
 *
 * Смысл WayBack — работать там, где связи нет: человек уходит в лес, и
 * приложение обязано писать путь и вести назад к точке входа. Значит любое
 * ожидание в этом коде должно иметь исход. Не «удачный», а хоть какой-то:
 * «не дождались» — это ответ, на который можно откатиться, а вечное ожидание
 * ответом не является.
 *
 * Три источника вечного ожидания, из-за которых модуль и появился:
 *
 *  1. Динамический `import()`. Оболочка грузит веб с сайта (`server.url` в
 *     capacitor.config), поэтому уже открытая страница живёт, а вот кусок
 *     бандла, который ещё не скачан, приезжает по сети в момент использования.
 *     Без связи такой запрос не отваливается с ошибкой — он просто никогда не
 *     завершается, и весь код после `await` не исполняется. Ни исключения, ни
 *     лога: молчаливое зависание. Именно так «включаем запись…» однажды висело
 *     весь поход.
 *  2. `fetch` без AbortController. На мёртвой сети (сигнал есть, данных нет —
 *     обычное дело в лесу) запрос ждёт таймаута TCP, а он у операционной
 *     системы измеряется минутами.
 *  3. Нативный вызов через мост Capacitor: метод плагина зовётся внутри
 *     try/catch, который на исключении только пишет в лог и промис не
 *     отклоняет. Подробнее — в track/foregroundService.
 *
 * Модуль намеренно ни от чего не зависит: он загружается напрямую в Node
 * проверкой fastlane/.track-watch-check.mjs, где алиасов `@/` нет.
 */

/**
 * Сколько ждём кусок бандла. Пять секунд — это «сеть либо есть, либо её нет»:
 * на живой связи чанк весом в десяток килобайт приезжает за доли секунды, а
 * ждать дольше значит держать человека перед спиннером там, где давно пора
 * работать по запасному пути.
 *
 * Отказ по сроку не окончателен: сам запрос продолжает жить (см. loadChunk),
 * и повторная попытка ответит мгновенно, если кусок всё-таки доехал.
 */
export const CHUNK_TIMEOUT_MS = 5_000;

/** Сколько ждём тайл карты: он идёт по той же связи, но весит больше кода. */
export const TILE_FETCH_TIMEOUT_MS = 20_000;

/**
 * Сколько ждём Supabase на пути похода. Восемь секунд — столько же, сколько
 * ждёт проверку подписки гейт: дольше человек в лесу ждать не должен ничего.
 */
export const SUPABASE_TIMEOUT_MS = 8_000;

export interface NativeCallFailure {
  code: string;
  message: string;
}

/**
 * Ограничивает ожидание. Отказ по времени выглядит как обычный отказ, поэтому
 * вызывающей стороне не нужен отдельный путь — у неё уже есть catch.
 *
 * Исходное обещание не отменяется: отменить его в общем случае нельзя, а
 * попытка сделать вид, что можно, приводит к «отменённым» операциям, которые
 * на самом деле идут. Мы перестаём ждать — и только.
 *
 * PromiseLike, а не Promise: запросы Supabase — построители, а не обещания, и
 * ждать их приходится ровно так же.
 */
export function withTimeout<T>(work: PromiseLike<T>, ms: number, what: string): Promise<T> {
  const step = beginStep(what);
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      endStep(step);
      const failure: NativeCallFailure = {
        code: "TIMEOUT",
        message: `${what} did not answer in ${ms} ms`,
      };
      reject(failure);
    }, ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        endStep(step);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        endStep(step);
        reject(error);
      },
    );
  });
}

/**
 * Что мы ждём прямо сейчас.
 *
 * Появилось после отчёта, в котором приложение сообщило «ответа нет за 20 002
 * мс» — и это всё, что мы узнали. Такое сообщение не называет ни шага, ни
 * причины, а без них следующий шаг отладки приходится угадывать. Теперь любое
 * ожидание со сроком отмечается здесь, и тот, кто подводит итог, называет шаг.
 */
interface Step {
  what: string;
  since: number;
}

const inFlight = new Set<Step>();

function beginStep(what: string): Step {
  const step: Step = { what, since: Date.now() };
  inFlight.add(step);
  return step;
}

function endStep(step: Step): void {
  inFlight.delete(step);
}

/** Самое давнее незавершённое ожидание — обычно оно и есть виновник. */
export function waitingOn(): string | null {
  let oldest: Step | null = null;
  for (const step of inFlight) {
    if (!oldest || step.since < oldest.since) oldest = step;
  }
  return oldest ? `${oldest.what} (${Date.now() - oldest.since} ms)` : null;
}

/** Приехавшие куски бандла: модуль остаётся модулем, перезагружать его незачем. */
const arrived = new Map<string, unknown>();
/** Запросы в пути: второй такой же заводить не надо, но и бросать первый — тоже. */
const onTheWay = new Map<string, Promise<unknown>>();

/**
 * Загружает кусок бандла со сроком.
 *
 * Отказ не запоминается, а сам запрос не бросается: он остаётся в пути и,
 * если связь вернётся, наполнит кеш. Поэтому повтор — не «ещё пять секунд
 * впустую», а мгновенный ответ для того, кто дождался. Запомненный навсегда
 * отказ означал бы поход без карты до перезапуска приложения, а перезапуск в
 * лесу невозможен: приложение грузится с сайта.
 */
export function loadChunk<T>(
  what: string,
  load: () => Promise<T>,
  ms: number = CHUNK_TIMEOUT_MS,
): Promise<T> {
  const hit = arrived.get(what);
  if (hit !== undefined) return Promise.resolve(hit as T);

  let work = onTheWay.get(what) as Promise<T> | undefined;
  if (!work) {
    work = load().then(
      (mod) => {
        arrived.set(what, mod);
        onTheWay.delete(what);
        return mod;
      },
      (error) => {
        onTheWay.delete(what);
        throw error;
      },
    );
    // Тот, кто ушёл по сроку, свой catch уже потратил. Без этой строки поздний
    // отказ всплывёт как unhandled rejection и уронит сеанс в консоль.
    work.catch(() => {});
    onTheWay.set(what, work);
  }
  return withTimeout(work, ms, `import ${what}`);
}

/** Кусок уже на устройстве — обращение к нему точно не уйдёт в сеть. */
export function chunkArrived(what: string): boolean {
  return arrived.has(what);
}

/**
 * Тянет кусок заранее, пока связь ещё есть. Ничего не ждёт и не бросает:
 * предзагрузка — это подготовка, а не действие человека.
 */
export function preloadChunk<T>(what: string, load: () => Promise<T>): void {
  void loadChunk(what, load).catch(() => {});
}

/**
 * Скачивает ответ целиком со сроком. Срок покрывает и чтение тела: соединение
 * рвётся посреди картинки не реже, чем в начале, и тогда висит уже `blob()`.
 */
export async function fetchBlobWithDeadline(
  url: string,
  ms: number = TILE_FETCH_TIMEOUT_MS,
): Promise<Blob> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) throw new Error(`http ${resp.status}`);
    return await resp.blob();
  } finally {
    clearTimeout(timer);
  }
}

/** Только для проверок: забыть всё, что приехало. */
export function forgetChunks(): void {
  arrived.clear();
  onTheWay.clear();
}
