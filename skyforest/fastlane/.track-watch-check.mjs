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
import { watchMessage } from "../src/lib/track/watchMessage.ts";
import { recordingStatusView } from "../src/lib/track/recordingStatusView.ts";
import { confirmServiceStart } from "../src/lib/track/serviceStartup.ts";

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
  // Повторяем, но только когда приложение на переднем плане: из фона службу
  // переднего плана Android поднять не даст. Здесь это два события из трёх.
  check("фон пробовали поднять снова, а не сдались после первого отказа", log.bgStarts, 2);
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

/**
 * Что приложение говорит человеку. Ошиблись мы именно здесь: с погашенным
 * экраном и неподнявшимся фоном показывали «путь не записывается» и совет
 * проверить включённую геолокацию.
 */
async function scenarioMessages() {
  console.log("\n— что сказано человеку —");
  const say = (patch) =>
    watchMessage({
      hasTrack: true,
      appForeground: true,
      plain: true,
      background: true,
      backgroundIssue: null,
      ...patch,
    });

  check("похода нет — молчим", say({ hasTrack: false }), "silent");
  check("пишут оба источника — молчим", say({}), "silent");
  check(
    "фон не поднялся, приложение открыто — спокойное «пока открыто»",
    say({ background: false, backgroundIssue: "preciseLocation" }),
    "foregroundOnly",
  );
  check(
    "экран погас, фона нет — молчим, а не пугаем",
    say({ appForeground: false, plain: false, background: false, backgroundIssue: "preciseLocation" }),
    "silent",
  );
  check(
    "не пишет никто при открытом приложении — тревога",
    say({ plain: false, background: false, backgroundIssue: "failed" }),
    "notRecording",
  );
  check(
    "уведомления запрещены — об этом говорит отдельный тост",
    say({ background: false, backgroundIssue: "notificationsBlocked" }),
    "silent",
  );
  check(
    "старая оболочка без фона — спокойное «обновите»",
    say({ background: false, backgroundIssue: "unsupported" }),
    "foregroundOnly",
  );
}

/**
 * Правило службы переднего плана: идёт поход — служба и уведомление живут;
 * поход завершён — служба снята. Уведомление здесь не украшение: без видимой
 * службы Android забирает геолокацию, поэтому «уведомление висит» и «запись
 * идёт» — одно и то же утверждение.
 *
 * Заглушка повторяет договор нативной части (TrackService.java): start
 * идемпотентен и второй службы не создаёт, stop гасит уведомление, а
 * перезагрузка страницы теряет слушателя, но не службу.
 */
function fakeNativeService() {
  const svc = { running: false, notification: null, starts: 0, stops: 0, listener: null };
  return {
    svc,
    /** Стартер слота background: то же, что делает backgroundWatch.ts. */
    starter: async (notice = "Recording your way back") => {
      svc.starts += 1;
      svc.listener = "page";
      svc.running = true;
      svc.notification = notice;
      return () => {
        svc.stops += 1;
        svc.running = false;
        svc.notification = null;
        svc.listener = null;
      };
    },
  };
}

async function scenarioForegroundService() {
  console.log("\n— служба переднего плана и её уведомление —");
  const { svc, starter } = fakeNativeService();
  const c = createWatchController({ plain: async () => () => {}, background: starter });

  c.update({ hasTrack: false, appForeground: true, backgroundAllowed: true });
  await c.settled();
  check("похода нет — уведомления нет", svc.notification, null);

  c.update({ hasTrack: true });
  await c.settled();
  check("поход начат — служба поднята", svc.running, true);
  check("и уведомление висит", svc.notification, "Recording your way back");

  c.update({ appForeground: false });
  await c.settled();
  check("экран погас — служба и уведомление на месте", [svc.running, !!svc.notification], [true, true]);

  // Перезагрузка страницы посреди похода: JS-контекст новый, служба прежняя.
  svc.listener = null;
  c.stopAll();
  const restored = createWatchController({ plain: async () => () => {}, background: starter });
  restored.update({ hasTrack: true, appForeground: true, backgroundAllowed: true });
  await restored.settled();
  check("после перезагрузки страницы слушатель снова на месте", svc.listener, "page");
  check("а служба всё та же, второй не появилось", svc.running, true);

  restored.stopAll();
  check("поход завершён — служба снята", svc.running, false);
  check("и уведомление убрано", svc.notification, null);
}

/**
 * Три окружения, в которых живёт один и тот же веб. Проверять надо все три:
 * прежние проверки гоняли только то, где нативная часть есть и работает, — а
 * ломалось ровно там, где её нет. Строка состояния в сборке из Play навсегда
 * застревала на «включаем запись…» и горела красным при работающей записи.
 *
 * Слот и строка состояния проверяются вместе: человек видит именно строку.
 */
async function scenarioEnvironments() {
  console.log("\n— три окружения, что видит человек в каждом —");

  /** Прогоняет поход в заданном окружении и возвращает итоговую строку. */
  const walk = async (env) => {
    let starting = false;
    let issue = null;
    const c = createWatchController({
      plain: async () => () => {},
      background: async () => {
        starting = true;
        issue = null;
        try {
          if (env.support === "none") {
            issue = "unsupported";
            return null;
          }
          if (env.support === "refuses") {
            issue = env.issue;
            return null;
          }
          return () => {};
        } finally {
          starting = false;
        }
      },
    });
    c.update({ hasTrack: true, appForeground: true, backgroundAllowed: true });
    await c.settled();
    const state = {
      hasTrack: true,
      recording: c.running("plain") || c.running("background"),
      background: c.running("background"),
      backgroundStarting: starting,
      backgroundIssue: issue,
    };
    return { view: recordingStatusView(state), state, controller: c };
  };

  // 1. Сборка 1.0 из Play: нативной части нет ни своей, ни плагинной.
  const play = await walk({ support: "none" });
  check("1.0 из Play: запись на переднем плане идёт", play.state.recording, true);
  check("1.0 из Play: тон спокойный, а не тревожный", play.view.tone, "calm");
  check("1.0 из Play: не застряли на «включаем…»", play.view.body, "bodyUnsupported");

  // 2. Сборка со службой, служба поднимается.
  const ok = await walk({ support: "works" });
  check("служба поднялась: тон «всё как задумано»", ok.view.tone, "on");
  check("служба поднялась: текст про погашенный экран", ok.view.body, "bodyOn");
  ok.controller.stopAll();
  check("поход завершён — строки нет", recordingStatusView({ ...ok.state, hasTrack: false }), null);

  // 3. Сборка со службой, но система не дала её поднять.
  const refused = await walk({ support: "refuses", issue: "failed" });
  check("служба отказала: запись всё равно идёт", refused.state.recording, true);
  check("служба отказала: тон спокойный", refused.view.tone, "calm");
  check("служба отказала: названа причина, а не «включаем…»", refused.view.body, "bodyFailed");

  // Красный — только когда не пишет никто.
  const dead = recordingStatusView({
    hasTrack: true,
    recording: false,
    background: false,
    backgroundStarting: false,
    backgroundIssue: "failed",
  });
  check("не пишет никто — вот теперь красный", dead.tone, "alarm");
  check("и заголовок тревожный", dead.title, "off");

  // Служба работает, но уведомление запрещено: это не поломка записи.
  const hidden = recordingStatusView({
    hasTrack: true,
    recording: true,
    background: true,
    backgroundStarting: false,
    backgroundIssue: "notificationsBlocked",
  });
  check("уведомление скрыто — запись названа работающей", hidden.title, "on");
  check("и тон спокойный, а не красный", hidden.tone, "calm");
}

/**
 * Момент запуска службы относительно жизненного цикла приложения.
 *
 * С Android 12 поднять службу переднего плана из фона нельзя — система бросает
 * ForegroundServiceStartNotAllowedException. А сверка слотов запускается в том
 * числе по уходу в фон, поэтому неудачная первая попытка тянула за собой
 * вторую ровно там, где отказ гарантирован. В Node этот класс дефекта раньше
 * не ловился: жизненный цикл в проверке не моделировался вовсе.
 */
async function scenarioStartMoment() {
  console.log("\n— когда именно поднимается служба —");

  const attempts = [];
  let allow = true;
  let live = false;
  const make = () =>
    createWatchController({
      plain: async () => () => {},
      background: async () => {
        attempts.push(foregroundNow);
        if (!allow) return null;
        live = true;
        return () => {
          live = false;
        };
      },
    });

  let foregroundNow = true;
  const c = make();

  // Поход начинается, пока человек смотрит на экран — единственный момент,
  // когда систему устраивает запуск службы.
  c.update({ hasTrack: true, appForeground: true, backgroundAllowed: true });
  await c.settled();
  check("поход начат при активном приложении — попытка была", attempts.length, 1);
  check("и именно на переднем плане", attempts[0], true);
  check("служба работает", live, true);

  // Дальше — сворачивание и гашение экрана. Запускать уже нечего.
  foregroundNow = false;
  c.update({ appForeground: false });
  await c.settled();
  check("свернули приложение — новой попытки нет", attempts.length, 1);
  check("служба продолжает работать", c.running("background"), true);
  check("а обычный watch снят, он в фоне бесполезен", c.running("plain"), false);

  foregroundNow = true;
  c.update({ appForeground: true });
  await c.settled();
  check("вернулись — службу не поднимают заново", attempts.length, 1);

  c.stopAll();
  check("поход завершён — служба снята", live, false);

  // Первая попытка не удалась: повтор должен ждать возвращения в приложение.
  attempts.length = 0;
  allow = false;
  foregroundNow = true;
  const failed = make();
  failed.update({ hasTrack: true, appForeground: true, backgroundAllowed: true });
  await failed.settled();
  check("отказ на переднем плане — попытка была одна", attempts.length, 1);

  foregroundNow = false;
  failed.update({ appForeground: false });
  await failed.settled();
  check("ушли в фон — из фона поднимать не пробуем", attempts.length, 1);

  allow = true;
  foregroundNow = true;
  failed.update({ appForeground: true });
  await failed.settled();
  check("вернулись — вот теперь повтор", attempts.length, 2);
  check("и на этот раз служба встала", failed.running("background"), true);
  failed.stopAll();
}

/**
 * Заморозка страницы. При погашенном экране WebView не исполняет JS: таймеры
 * стоят, разрешение промиса ждёт в очереди. Ответ на запуск службы, пришедший
 * в этот момент, для нас всё равно что потерян — а служба при этом работает.
 * Значит после пробуждения истина у службы, а не у наших переменных.
 */
async function scenarioFrozenPage() {
  console.log("\n— страница была заморожена, ответ потерян —");

  let serviceLive = false;
  const c = createWatchController({
    plain: async () => () => {},
    // Ответа нет: обещание запуска зависло вместе с замороженной страницей.
    background: () =>
      new Promise(() => {
        serviceLive = true;
      }),
  });

  c.update({ hasTrack: true, appForeground: true, backgroundAllowed: true });
  // settled() тут не годится: очередь фонового слота ждёт ответа, которого нет,
  // — ровно то состояние, в котором приложение и зависало.
  await new Promise((resolve) => setTimeout(resolve, 0));
  check("служба в системе поднялась", serviceLive, true);
  check("а контроллер об этом не знает", c.running("background"), false);

  // Возвращение в приложение: спросили службу, она ответила «работаю».
  c.adopt("background", () => {
    serviceLive = false;
  });
  check("после возвращения запись признана идущей", c.running("background"), true);

  c.stopAll();
  check("и завершение похода её снимает", serviceLive, false);

  // Принимать нечего, если похода уже нет: службу надо глушить, а не считать
  // своей, иначе она переживёт поход.
  const done = createWatchController({ plain: async () => () => {}, background: async () => null });
  let orphan = true;
  done.adopt("background", () => {
    orphan = false;
  });
  check("похода нет — принятая служба сразу остановлена", orphan, false);
  check("и работающей не считается", done.running("background"), false);
}

/**
 * Ответ на запуск потерян по дороге — самый дорогой из известных нам отказов.
 *
 * На телефоне человека нативный start не ответил вовсе: сторож сработал через
 * двадцать секунд, и всё это время экран показывал «включаем запись…». Причина
 * системная — Capacitor вызывает метод плагина внутри try/catch, который на
 * исключении промис не отклоняет. Значит ответа может не быть на любом вызове,
 * и строить на нём вывод «идёт запись или нет» нельзя.
 *
 * Теперь вывод строится на опросе самой службы: у каждого вопроса свой срок,
 * число вопросов конечно, поэтому исход есть всегда — «работает» или «не
 * поднялась, вот причина», но никогда не «ждём».
 */
async function scenarioLostAnswer() {
  console.log("\n— ответа на запуск нет, спрашиваем саму службу —");

  const wait = async () => {};

  // Служба встаёт не мгновенно: первые ответы отрицательные, и это норма.
  let asked = 0;
  const slow = await confirmServiceStart({ running: false }, async () => {
    asked += 1;
    return { running: asked >= 3 };
  }, wait);
  check("служба поднялась с третьего вопроса — признана работающей", slow.running, true);
  check("и спрашивали ровно до ответа", asked, 3);

  // Служба не встала и назвала причину — ждать дальше нечего.
  const failed = await confirmServiceStart({ running: false }, async () => ({
    running: false,
    failure: "startForeground: ForegroundServiceStartNotAllowedException",
  }), wait);
  check("служба назвала причину — она и есть исход", failed.failure?.includes("NotAllowed"), true);
  check("и работающей не считается", failed.running, false);

  // Мост молчит на каждый вопрос. Раньше это и было вечное «включаем…».
  let tries = 0;
  const silent = await confirmServiceStart({ running: false }, async () => {
    tries += 1;
    return null;
  }, wait);
  check("мост молчит — исход всё равно есть", silent.running, false);
  check("и число вопросов конечно", tries, 12);

  // Служба ответила «работаю» сразу — лишних вопросов не задаём.
  let extra = 0;
  const instant = await confirmServiceStart({ running: true }, async () => {
    extra += 1;
    return { running: true };
  }, wait);
  check("ответила сразу — переспрашивать не о чем", extra, 0);
  check("и запись признана идущей", instant.running, true);
}

await scenarioLostAnswer();
await scenarioOldLogic();
await scenarioMessages();
await scenarioEnvironments();
await scenarioStartMoment();
await scenarioFrozenPage();
await scenarioForegroundService();
await scenarioHappyPath();
await scenarioBackgroundFails();
await scenarioNoBackgroundSupport();
await scenarioRace();

console.log(failures === 0 ? "\nвсе проверки прошли" : `\nпровалено проверок: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
