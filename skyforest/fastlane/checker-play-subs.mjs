#!/usr/bin/env node
/**
 * Подписки Mushroom Checker в Google Play: неделя и год, у обоих триал 3 дня.
 *
 * Скрипт умеет ровно одно приложение. Раньше товары Checker заводились из
 * общего `fastlane/play-subs-create.mjs` вместе с WayBack, и цены в том списке
 * успели устареть: годовой Checker стоял в нём за 14.99 USD, когда в консоли
 * давно было 39.99. Прогон ради любого из двух приложений откатывал бы цены
 * соседнего — молча и по всем 173 регионам. Теперь у каждого приложения свой
 * файл, как и у всего остального в этом репозитории (см.
 * `.cursor/rules/flavors.mdc`), и дотянуться до чужого пакета отсюда нечем:
 * имя пакета приезжает из `play-subs/checker.mjs` и другого в этом процессе
 * не загружено.
 *
 * Цены не записаны и здесь, и в объявлении — они читаются из
 * `src/flavors/checker/config.ts`, того же конфига, по которому пейволл рисует
 * «$5 в неделю». Цена в Play и цена на экране — одно число.
 *
 * Запуск из каталога skyforest:
 *   node fastlane/checker-play-subs.mjs             показать различия
 *   node fastlane/checker-play-subs.mjs --apply     завести/поправить
 *   node fastlane/checker-play-subs.mjs --apply --price   ещё и сменить цену
 *
 * Смена цены достаётся только НОВЫМ подписчикам: действующие остаются на
 * своей, пока их не мигрируют вручную в консоли.
 */
import { CHECKER_PLAY } from "./play-subs/checker.mjs";
import { syncPackage } from "./play-subs/engine.mjs";

const result = await syncPackage({
  plan: CHECKER_PLAY,
  apply: process.argv.includes("--apply"),
  allowPriceChange: process.argv.includes("--price"),
});

process.exit(result.failures ? 1 : 0);
