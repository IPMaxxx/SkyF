#!/usr/bin/env node
/**
 * Проверка управления источниками записи трека без телефона.
 *
 * Проходит сценарий похода целиком — «похода нет → старт → уход в фон →
 * возврат → финиш» — и на каждом шаге сверяет, что именно работает. Отдельно
 * проверяется случай, из-за которого запись однажды встала у всех: фоновая
 * служба не поднялась. Обычный watch на переднем плане обязан работать и тогда.
 *
 * Запуск: node --experimental-strip-types fastlane/.track-watch-check.mjs
 * (из каталога skyforest/; на Node 23+ флаг не нужен).
 */

import { createWatchController } from "../src/lib/track/watchController.ts";

let failures = 0;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `\n     ждали ${JSON.stringify(expected)}, получили ${JSON.stringify(actual)}`}`);
}

/** Источники-заглушки: считают запуски и остановки, ничего не делая. */
function fakeSources({ backgroundWorks = true, plainWorks = true } = {}) {
  const log = { plainStarts: 0, plainStops: 0, bgStarts: 0, bgStops: 0 };
  return {
    log,
    starters: {
      plain: async () => {
        log.plainStarts += 1;
        if (!plainWorks) return null;
        return () => {
          log.plainStops += 1;
        };
      },
      background: async () => {
        log.bgStarts += 1;
        if (!backgroundWorks) return null;
        return () => {
          log.bgStops += 1;
        };
      },
    },
  };
}

const state = (c) => ({ plain: c.running("plain"), background: c.running("background") });

async function scenarioHappyPath() {
  console.log("\n— поход в оболочке с фоновой записью —");
  const { starters, log } = fakeSources();
  const c = createWatchController(starters);

  c.update({ hasTrack: false, appForeground: true, backgroundAllowed: true });
  await c.settled();
  check("похода нет — ничего не работает", state(c), { plain: false, background: false });

  c.update({ hasTrack: true });
  await c.settled();
  check("старт похода — работают оба источника", state(c), { plain: true, background: true });

  c.update({ appForeground: false });
  await c.settled();
  check("экран погас — остался фон", state(c), { plain: false, background: true });

  c.update({ appForeground: true });
  await c.settled();
  check("вернулись в приложение — снова оба", state(c), { plain: true, background: true });

  c.stopAll();
  check("финиш — снято всё", state(c), { plain: false, background: false });
  check("фоновую службу остановили ровно раз", log.bgStops, 1);
}

async function scenarioBackgroundFails() {
  console.log("\n— фоновая служба не поднимается (тот самый регресс) —");
  const { starters, log } = fakeSources({ backgroundWorks: false });
  const c = createWatchController(starters);

  c.update({ hasTrack: true, appForeground: true, backgroundAllowed: true });
  await c.settled();
  check("запись на переднем плане идёт вопреки отказу фона", state(c), {
    plain: true,
    background: false,
  });

  c.update({ appForeground: false });
  await c.settled();
  check("в фоне писать нечем — честно ничего", state(c), { plain: false, background: false });

  c.update({ appForeground: true });
  await c.settled();
  check("вернулись — запись снова идёт", state(c), { plain: true, background: false });
  check("фон пробовали поднять на каждом событии, а не один раз", log.bgStarts >= 3, true);
}

async function scenarioNoBackgroundSupport() {
  console.log("\n— оболочка без фоновой записи (старая сборка, SkyForest) —");
  const { starters } = fakeSources({ backgroundWorks: false });
  const c = createWatchController(starters);

  c.update({ hasTrack: true, appForeground: true, backgroundAllowed: false });
  await c.settled();
  check("запись идёт как раньше", state(c), { plain: true, background: false });

  c.update({ appForeground: false });
  await c.settled();
  check("в фоне watch снят", state(c), { plain: false, background: false });
}

async function scenarioRace() {
  console.log("\n— гонка: поход завершили, пока watch поднимался —");
  const stops = [];
  let resolveStart;
  const c = createWatchController({
    plain: () =>
      new Promise((resolve) => {
        resolveStart = () => resolve(() => stops.push("plain"));
      }),
    background: async () => null,
  });

  c.update({ hasTrack: true, appForeground: true, backgroundAllowed: false });
  await Promise.resolve();
  c.update({ hasTrack: false });
  resolveStart();
  await c.settled();
  check("поднятый с опозданием watch тут же снят", state(c), {
    plain: false,
    background: false,
  });
  check("и снят ровно один раз", stops, ["plain"]);
}

/**
 * Тот же сценарий на логике до правки — чтобы регресс был предъявим, а не
 * рассказан. Алгоритм воспроизведён построчно по reconcileWatch из 10034aa:
 * один слот, «фон ИЛИ обычный», и startBackground, который отвечает «поднял»
 * по факту возврата из api.start. Плагин отвечает так всегда: start у него
 * колбэчный, отказ приезжает в колбэк, а промис резолвится идентификатором.
 */
async function scenarioOldLogic() {
  console.log("\n— как было до правки: api.start отвечает «ок», службы нет —");
  let stopWatch = null;
  let watchWanted = false;
  let watchIsBackground = false;
  let appForeground = true;
  let plainRunning = false;
  let backgroundRunning = false;
  let hasTrack = false;

  const startBackground = async () => {
    // Служба не поднялась, но старая обёртка об этом не знала.
    backgroundRunning = false;
    stopWatch = () => {
      backgroundRunning = false;
    };
    watchIsBackground = true;
    return true;
  };
  const startForegroundWatch = async () => {
    plainRunning = true;
    stopWatch = () => {
      plainRunning = false;
    };
  };
  const teardownWatch = () => {
    stopWatch?.();
    stopWatch = null;
    watchIsBackground = false;
  };
  const reconcile = async () => {
    const background = hasTrack;
    watchWanted = hasTrack && (appForeground || background);
    if (!watchWanted) return teardownWatch();
    if (stopWatch && watchIsBackground === background) return;
    teardownWatch();
    if (background && (await startBackground())) return;
    if (!appForeground) return;
    await startForegroundWatch();
  };

  hasTrack = true;
  await reconcile();
  check(
    "старт похода с открытым приложением — не пишет никто",
    { plain: plainRunning, background: backgroundRunning },
    { plain: false, background: false },
  );
  console.log("     ^ это и есть регресс: ожидали бы plain: true");
}

await scenarioOldLogic();
await scenarioHappyPath();
await scenarioBackgroundFails();
await scenarioNoBackgroundSupport();
await scenarioRace();

console.log(failures === 0 ? "\nвсе проверки прошли" : `\nпровалено проверок: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
