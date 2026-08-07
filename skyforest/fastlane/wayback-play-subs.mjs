#!/usr/bin/env node
/**
 * Подписки WayBack в Google Play: неделя и год, у обоих триал 3 дня.
 *
 * Скрипт умеет ровно одно приложение. Раньше товары WayBack заводились из
 * общего `fastlane/play-subs-create.mjs` вместе с Mushroom Checker, и цены в
 * том списке успели устареть: годовой WayBack стоял за 3.99 USD вместо 19.99,
 * а годовой Checker — за 14.99 вместо 39.99. Прогон ради любого из двух
 * приложений откатывал бы цены соседнего — молча и по всем 173 регионам.
 * Теперь у каждого приложения свой файл, как и у всего остального в этом
 * репозитории (см. `.cursor/rules/flavors.mdc`), и дотянуться до чужого пакета
 * отсюда нечем: имя пакета приезжает из `play-subs/wayback.mjs` и другого в
 * этом процессе не загружено.
 *
 * Цены не записаны и здесь, и в объявлении — они читаются из
 * `src/flavors/wayback/config.ts`, того же конфига, по которому пейволл рисует
 * «$1.99 в неделю». Цена в Play и цена на экране — одно число.
 *
 * Запуск из каталога skyforest:
 *   node fastlane/wayback-play-subs.mjs             показать различия
 *   node fastlane/wayback-play-subs.mjs --apply     завести/поправить
 *   node fastlane/wayback-play-subs.mjs --apply --price   ещё и сменить цену
 *
 * Смена цены достаётся только НОВЫМ подписчикам: действующие остаются на
 * своей, пока их не мигрируют вручную в консоли (это отдельная операция с
 * согласием подписчика). Именно поэтому годовой удалось поднять с 3.99 до
 * 19.99, никого не задев.
 */
import { WAYBACK_PLAY } from "./play-subs/wayback.mjs";
import { syncPackage } from "./play-subs/engine.mjs";

const result = await syncPackage({
  plan: WAYBACK_PLAY,
  apply: process.argv.includes("--apply"),
  allowPriceChange: process.argv.includes("--price"),
});

process.exit(result.failures ? 1 : 0);
