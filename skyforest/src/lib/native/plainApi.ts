/**
 * Обычный объект вместо прокси плагина Capacitor.
 *
 * Появился из-за дефекта, который три дня выглядел как «фоновая запись не
 * включается на телефоне». `registerPlugin` возвращает Proxy, у которого
 * обращение к ЛЮБОМУ свойству превращается в вызов нативного метода — в самом
 * ядре исключения сделаны только для `$$typeof` и `toJSON`. А свойство `then`
 * спрашивает не программист, а движок: и `return api` из async-функции, и
 * `resolve(api)` обязаны проверить, не thenable ли значение. Найдя `then`,
 * движок вызывает его и ждёт, что позовут переданные им продолжения. Прокси
 * вместо этого уходит на мост, получает «X.then() is not implemented», а
 * продолжения не зовёт никто — ожидание не заканчивается никогда.
 *
 * Симптом ровно такой, каким его видел человек: в журнале «служба найдена за
 * 343 мс», следующей строки нет, и через минуту сторож сообщает, что ждать
 * было нечего. Ни исключения, ни отказа: значение, которым разрешён промис,
 * само себя не отдаёт.
 *
 * Поэтому наружу из загрузчиков плагинов уходит не прокси, а обычный объект с
 * нужными методами. У него нет `then`, и проверка движка на нём заканчивается
 * сразу.
 *
 * Модуль намеренно ни от чего не зависит: его проверяет
 * fastlane/.track-watch-check.mjs, где алиасов `@/` нет.
 */

/**
 * Копия объекта из перечисленных методов, привязанных к оригиналу.
 *
 * Методы именно перечисляются, а не перебираются: у прокси нет ключей, и
 * `Object.keys` на нём вернёт пустоту.
 */
export function plainApi<T extends object, K extends keyof T>(api: T, methods: readonly K[]): T {
  const plain = {} as Record<PropertyKey, unknown>;
  for (const name of methods) {
    const method = api[name];
    if (typeof method === "function") {
      plain[name as PropertyKey] = (...args: unknown[]) =>
        (method as (...a: unknown[]) => unknown).apply(api, args);
    }
  }
  return plain as T;
}

/** Не притворяется ли значение обещанием. Только для проверок. */
export function looksThenable(value: unknown): boolean {
  if (!value || (typeof value !== "object" && typeof value !== "function")) return false;
  return typeof (value as { then?: unknown }).then === "function";
}
