/**
 * Цены, записанные в репозитории, — прочитанные из тех самых файлов, по которым
 * их видит приложение.
 *
 * Иначе не имеет смысла: цена, переписанная в скрипт руками, — это копия, а
 * копия расходится с оригиналом молча. Так и вышло с прежним
 * `fastlane/play-subs-create.mjs`: годовой Mushroom Checker остался в нём за
 * 14.99 USD, когда в консоли давно стояло 39.99, и прогон ради соседнего
 * приложения откатил бы цену по всем регионам.
 *
 * Поэтому здесь ничего не объявляется — только читается:
 *
 *  - тарифы Checker и WayBack берутся из `subscriptionPlan` их конфигов
 *    (`src/flavors/<id>/config.ts`). Оттуда же их берут пейволл и серверная
 *    квота, так что число в Play и число на экране физически одно;
 *  - цены SkyForest и снятого с продажи месячного Checker берутся из
 *    `fallbackPrice` каталога `src/lib/native/iapProducts.ts` — другого
 *    места, где репозиторий помнит их цену, нет.
 */
import { readFileSync } from "node:fs";

const SRC = new URL("../../src/", import.meta.url);

/**
 * `subscriptionPlan` приложения из его настоящего конфига.
 *
 * Конфиг — литерал объекта с типовой аннотацией и одним импортом, поэтому его
 * можно выполнить как обычный JS, сняв три чисто типовых конструкции. Своего
 * парсера тут нет намеренно: он разошёлся бы с тем, что собирает Next.
 */
export function flavorPlan(id) {
  const source = readFileSync(new URL(`flavors/${id}/config.ts`, SRC), "utf8");
  const js = source
    .replace(/^import[^;]*;$/gm, "")
    .replace(/:\s*FlavorConfig\b/g, "")
    .replace(/\bas const\b/g, "")
    .replace(/^export const \w+ = /m, "module.exports.flavor = ");
  const mod = { exports: {} };
  try {
    // COMMON_ALLOWED_PATHS раскрывается спредом внутри массива путей: пустого
    // списка достаточно, тарифов он не касается.
    new Function("module", "exports", "COMMON_ALLOWED_PATHS", js)(mod, mod.exports, []);
  } catch (error) {
    throw new Error(`не разобрал src/flavors/${id}/config.ts: ${error.message}`);
  }
  const plan = mod.exports.flavor?.subscriptionPlan;
  if (!plan) throw new Error(`в src/flavors/${id}/config.ts нет subscriptionPlan`);
  return plan;
}

/**
 * Цены-заглушки из каталога товаров: `productId → сумма в USD`.
 *
 * Берутся только записанные строкой (`fallbackPrice: "$35.99"`). У Checker и
 * WayBack там стоит вызов `usd(PLAN…)` — их цена живёт в конфиге флейвора, и
 * дублировать её здесь было бы ровно той ошибкой, от которой этот модуль.
 */
export function catalogFallbackPrices() {
  const source = readFileSync(new URL("lib/native/iapProducts.ts", SRC), "utf8");
  const from = source.indexOf("export const SUBSCRIPTION_PRODUCTS");
  const to = source.indexOf("\n];", from);
  if (from < 0 || to < 0) throw new Error("не нашёл SUBSCRIPTION_PRODUCTS в src/lib/native/iapProducts.ts");
  const body = source.slice(from, to);

  const prices = new Map();
  // Запись товара — плоский литерал без вложенных фигурных скобок, поэтому
  // «от productId до ближайшей закрывающей скобки» — это ровно одна запись, и
  // цена соседней сюда попасть не может.
  for (const match of body.matchAll(/productId:\s*"([^"]+)"/g)) {
    const entry = body.slice(match.index, body.indexOf("}", match.index));
    const price = entry.match(/fallbackPrice:\s*"\$([\d.]+)"/);
    if (price) prices.set(match[1], Number(price[1]));
  }
  if (!prices.size) throw new Error("в SUBSCRIPTION_PRODUCTS не нашлось ни одной цены строкой");
  return prices;
}

/** Цена товара из каталога; отсутствие — ошибка, а не молчаливый `undefined`. */
export function catalogPrice(prices, productId) {
  const usd = prices.get(productId);
  if (usd == null) throw new Error(`в src/lib/native/iapProducts.ts нет цены строкой для ${productId}`);
  return usd;
}
