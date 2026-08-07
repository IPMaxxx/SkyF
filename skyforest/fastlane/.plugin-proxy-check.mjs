#!/usr/bin/env node
/**
 * Прокси плагина Capacitor, притворяющийся обещанием, — по всему проекту.
 *
 * `registerPlugin` возвращает Proxy, который на обращение к ЛЮБОМУ свойству
 * отвечает вызовом нативного метода с этим именем (в ядре исключения сделаны
 * только для `$$typeof` и `toJSON`). Свойство `then` спрашивает не
 * программист, а сам движок: и `return api` из async-функции, и `resolve(api)`,
 * и `await api` обязаны проверить, не thenable ли значение. Прокси уходит на
 * мост, получает «X.then() is not implemented», а переданные движком
 * продолжения не зовёт никто. Обещание не разрешается и не отклоняется
 * никогда: ни исключения, ни отказа, ни таймаута — тихое вечное зависание,
 * которое снаружи выглядит как «кнопка не работает».
 *
 * В браузере этого не видно: плагинов там нет, и весь код идёт запасным путём.
 * Значит поймать такое можно только здесь.
 *
 * Проверка гоняет настоящие модули проекта (алиасы `@/` и пакеты Capacitor
 * подменяются хуками из .plugin-stub-hooks.mjs), а не их копию: копия
 * разошлась бы с кодом на первой же правке. Плюс отдельным проходом весь
 * `src/**` просматривается глазами регулярного выражения — чтобы новое место
 * этого класса нельзя было завести молча.
 *
 * Запуск из каталога skyforest/:
 *   node fastlane/.plugin-proxy-check.mjs
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

let failures = 0;

function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `\n     ${detail}`}`);
}

/* ------------------------------------------------------------------ */
/* Заглушка моста                                                      */
/* ------------------------------------------------------------------ */

const calls = [];
/** Плагины, которых нет в этой оболочке: мост отвечает UNIMPLEMENTED. */
const missing = new Set();
/** Что отвечает нативная сторона: «Плагин.метод» либо «*.метод» на все плагины. */
const answers = new Map([
  ["*.addListener", () => ({ remove: async () => {} })],
  ["WayBackTrack.status", () => ({ running: true, precise: true, location: true, notifications: true })],
  ["WayBackTrack.start", () => ({ running: true, precise: true, location: true, notifications: true })],
  ["BackgroundGeolocation.getPluginVersion", () => ({ version: "1.0.0" })],
  ["BackgroundGeolocation.checkPermissions", () => ({ notification: "granted" })],
  ["Preferences.get", () => ({ value: null })],
  ["App.getInfo", () => ({ version: "1.2.3", build: "42" })],
  ["Geolocation.getCurrentPosition", () => ({ coords: { latitude: 53.9, longitude: 27.5 } })],
  ["Camera.getPhoto", () => ({ base64String: btoa("photo"), format: "jpeg" })],
  ["BiometricAuthNative.checkBiometry", () => ({ isAvailable: true })],
  ["Share.share", () => ({ activityType: "test" })],
]);

const plugins = new Map();

/**
 * Прокси ровно такой, какой отдаёт `registerPlugin`. Важен здесь только один
 * его ответ — на `then`: мост считает `then` таким же неизвестным методом, как
 * любой другой, а движок, получив функцию, ждёт, что она позовёт его
 * продолжения. Она их не зовёт.
 */
function plugin(name) {
  const hit = plugins.get(name);
  if (hit) return hit;
  const proxy = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "$$typeof" || prop === "toJSON") return undefined;
        const key = `${name}.${String(prop)}`;
        return (...args) => {
          calls.push(key);
          if (prop === "then") {
            const refused = Promise.reject(new Error(`${key}() is not implemented`));
            // В браузере этот отказ всплывает как «Uncaught (in promise)» — по
            // нему дефект однажды и нашёлся. Здесь он только мешает.
            refused.catch(() => {});
            return refused;
          }
          if (missing.has(name)) {
            return Promise.reject({
              code: "UNIMPLEMENTED",
              message: `${key} is not implemented on android`,
            });
          }
          const answer = answers.get(key) ?? answers.get(`*.${String(prop)}`);
          return Promise.resolve(answer ? answer(...args) : {});
        };
      },
    },
  );
  plugins.set(name, proxy);
  return proxy;
}

globalThis.__capacitorStub = { plugin };

/* ------------------------------------------------------------------ */
/* Окружение нативной оболочки                                         */
/* ------------------------------------------------------------------ */

const store = new Map();
const listeners = new Map();

globalThis.window = {
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => "android",
    convertFileSrc: (uri) => uri,
    // Список реально собранных в оболочку плагинов: по нему код решает,
    // безопасно ли вообще трогать прокси.
    PluginHeaders: [{ name: "Share" }, { name: "BiometricAuthNative" }],
  },
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  },
  location: { origin: "https://checker.skyforest.ai" },
  addEventListener: (type, fn) => listeners.set(type, fn),
  removeEventListener: (type) => listeners.delete(type),
  dispatchEvent: () => true,
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
  open: () => null,
};
globalThis.localStorage = globalThis.window.localStorage;
// navigator в Node только для чтения, а коду он нужен свой: системного листа
// «поделиться» здесь нет, и путь обязан уйти к нативному плагину.
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { language: "ru-RU", clipboard: { writeText: async () => {} } },
});
globalThis.document = { querySelector: () => null };
globalThis.fetch = async () => {
  throw new Error("сеть в проверке недоступна");
};

register("./.plugin-stub-hooks.mjs", import.meta.url);

/* ------------------------------------------------------------------ */
/* Инструменты проверки                                                */
/* ------------------------------------------------------------------ */

/** Срок, за который любой загрузчик на мгновенно отвечающем мосте обязан кончиться. */
const DEADLINE_MS = 500;

const HUNG = Symbol("hung");

/**
 * Главное утверждение проверки: у ожидания есть исход. «Исход» — это и
 * значение, и отказ; зависание исходом не является.
 */
async function settles(name, work) {
  let timer;
  const outcome = await Promise.race([
    Promise.resolve(work).then(
      (value) => ({ value }),
      (error) => ({ error }),
    ),
    new Promise((done) => {
      timer = setTimeout(() => done(HUNG), DEADLINE_MS);
    }),
  ]);
  clearTimeout(timer);
  if (outcome === HUNG) {
    check(name, false, `ответа нет за ${DEADLINE_MS} мс — прокси притворился обещанием`);
    return null;
  }
  check(name, true);
  return outcome;
}

/** Отданное наружу значение не должно выглядеть обещанием. */
function notThenable(name, value) {
  const thenable =
    Boolean(value) &&
    (typeof value === "object" || typeof value === "function") &&
    typeof value.then === "function";
  check(name, !thenable, "у значения есть then — движок будет ждать его вечно");
}

/* ------------------------------------------------------------------ */
/* Сам дефект — чтобы было предъявимо, а не рассказано                 */
/* ------------------------------------------------------------------ */

async function scenarioTheDefect() {
  console.log("\n— чем опасен прокси, отданный наружу —");
  const proxy = plugin("Demo");

  notThenable("прокси плагина выглядит обещанием (так и должно быть в этой проверке)", {});
  check(
    "и `then` у него — обычный вызов на мост",
    typeof proxy.then === "function",
    "прокси перестал вести себя как настоящий",
  );

  const hung = await Promise.race([
    (async () => proxy)().then(() => "ответ"),
    new Promise((done) => setTimeout(() => done("зависло"), 100)),
  ]);
  check("`return proxy` из async-функции не возвращается никогда", hung === "зависло");

  const { plainApi } = await import("../src/lib/native/plainApi.ts");
  const plain = plainApi(proxy, ["status"]);
  notThenable("а обычный объект от plainApi обещанием не пахнет", plain);
  const answered = await Promise.race([
    (async () => plain)().then(() => "ответ"),
    new Promise((done) => setTimeout(() => done("зависло"), 100)),
  ]);
  check("и отдаётся сразу", answered === "ответ");
}

/* ------------------------------------------------------------------ */
/* Настоящие загрузчики проекта                                        */
/* ------------------------------------------------------------------ */

/**
 * Обёртки над кусками бандла. Они отдают наружу пространство имён модуля, а не
 * прокси, — и это должно оставаться правдой: положи сюда кто-нибудь сам
 * плагин, и любой вызывающий встанет намертво.
 */
async function scenarioChunkLoaders() {
  console.log("\n— обёртки плагинов (lib/native/plugins) —");
  const mod = await import("../src/lib/native/plugins.ts");
  const loaders = [
    ["geolocationPlugin", mod.geolocationPlugin],
    ["preferencesPlugin", mod.preferencesPlugin],
    ["filesystemPlugin", mod.filesystemPlugin],
    ["appPlugin", mod.appPlugin],
    ["splashScreenPlugin", mod.splashScreenPlugin],
  ];
  for (const [name, load] of loaders) {
    const outcome = await settles(`${name}() отвечает`, load());
    if (outcome?.value) notThenable(`${name}() отдал не обещание`, outcome.value);
  }
}

/**
 * Своя служба переднего плана WayBack и плагин фоновой геолокации — те два
 * места, где дефект уже сработал. Проверяются оба пути: и когда нативной части
 * в оболочке нет, и когда она есть.
 */
async function scenarioTrackLoaders() {
  console.log("\n— загрузчики фоновой записи (WayBack) —");
  calls.length = 0;

  // Оболочка без своей службы — сборки из Play до versionCode 9, iOS, а также
  // SkyForest и Checker, которым тот же веб приезжает по воздуху.
  missing.add("WayBackTrack");
  const service = await import("../src/lib/track/foregroundService.ts");
  const absent = await settles("службы нет — foregroundService() отвечает", service.foregroundService());
  check("и отвечает честным null", absent?.value === null);

  const background = await import("../src/lib/track/backgroundWatch.ts");
  await settles("stopBackgroundWatch() доходит до плагина", background.stopBackgroundWatch());
  check(
    "и останавливает именно его",
    calls.includes("BackgroundGeolocation.stop"),
    `вызовы: ${calls.slice(-5).join(", ")}`,
  );
  check(
    "а `then` на мост не уходил ни разу",
    !calls.some((call) => call.endsWith(".then")),
    calls.filter((call) => call.endsWith(".then")).join(", "),
  );

  // Оболочка WayBack со своей службой.
  missing.delete("WayBackTrack");
  const found = await settles("служба есть — foregroundService() отвечает", service.foregroundService());
  notThenable("и отдаёт обычный объект", found?.value);
  const state = await settles("backgroundWatchState() отвечает", background.backgroundWatchState());
  check("и состояние прочитано у самой службы", state?.value?.running === true);
  await settles("openAppSettings() отвечает", background.openAppSettings());
}

/**
 * Нативное «Поделиться» в Mushroom Checker. Плагин здесь берётся не импортом
 * пакета, а `registerPlugin` — то есть тем самым способом, на котором дефект и
 * ловится. До правки эта кнопка молчала: ни листа, ни ошибки, ни копирования.
 */
async function scenarioCheckerShare() {
  console.log("\n— «Поделиться» в Mushroom Checker —");
  const share = await import("../src/lib/checker/share.ts");
  const outcome = await settles(
    "shareContent() доходит до системного листа",
    share.shareContent({ title: "t", text: "x", url: "https://checker.skyforest.ai/s/abc" }),
  );
  check("и сообщает об успехе", outcome?.value === true);
  check(
    "лист действительно открывали",
    calls.includes("Share.share"),
    `вызовы: ${calls.slice(-5).join(", ")}`,
  );
}

/** Остальные пути, где плагин проходит через промис. */
async function scenarioOtherLoaders() {
  console.log("\n— прочие нативные пути —");

  const lock = await import("../src/lib/native/biometricLock.ts");
  await settles("isLockEnabled() отвечает", lock.isLockEnabled());
  await settles("setLockEnabled() отвечает", lock.setLockEnabled(true));
  await settles("isBiometryAvailable() отвечает", lock.isBiometryAvailable());

  const build = await import("../src/lib/native/appBuild.ts");
  const info = await settles("nativeBuild() отвечает", build.nativeBuild());
  notThenable("и отдаёт не обещание", info?.value);

  const geo = await import("../src/lib/native/geolocation.ts");
  await settles("getCurrentPosition() отвечает", geo.getCurrentPosition());

  const photo = await import("../src/lib/capturePhoto.ts");
  await settles("capturePhoto() отвечает", photo.capturePhoto());

  const track = await import("../src/lib/trackState.ts");
  await settles("hydrateTrackFromNative() отвечает", track.hydrateTrackFromNative());
}

/* ------------------------------------------------------------------ */
/* Просмотр всего src: чтобы новое место нельзя было завести молча     */
/* ------------------------------------------------------------------ */

const SRC = fileURLToPath(new URL("../src", import.meta.url));

function sourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Места, где значение уходит движку как результат обещания. */
const HANDOUT = /(?:\breturn\s+|\bresolve\(\s*|=>\s*)([A-Za-z_$][\w$]*)\s*[;,)]/g;

/** Слова языка, которые под правило имени попадают, а прокси не бывают. */
const NOT_A_VALUE = new Set(["null", "undefined", "true", "false", "this", "await", "new", "void"]);

/** Откуда значение взялось: прокси плагина приходит только отсюда. */
const FROM_PLUGIN =
  /registerPlugin|import\(\s*["'](?:@capacitor|@capgo|@aparajita)|await\s+\w+Plugin\(\)|loadChunk\(\s*["'](?:@capacitor|@capgo|@aparajita)/;

/**
 * Ближайшее выше по тексту место, где имя получило значение: объявление,
 * присваивание, деструктуризация или параметр функции. Именно оно отвечает на
 * вопрос, прокси там или уже обычный объект, — одного имени для этого мало:
 * `api` в загрузчике службы значит разное в двух соседних строках.
 */
function originOf(text, name, before) {
  const n = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sites = new RegExp(
    [
      `(?:const|let|var)\\s+${n}\\s*=`,
      `(?:const|let|var)\\s*\\{[^}]*\\b${n}\\b[^}]*\\}\\s*=`,
      `(?:^|[^.\\w$])${n}\\s*=[^=>]`,
      `[(,]\\s*${n}\\s*(?:[),]|=>)`,
    ].join("|"),
    "gm",
  );
  let origin = null;
  for (const match of text.matchAll(sites)) {
    if (match.index >= before) break;
    origin = match.index;
  }
  // Окно, а не строка: `const { X } = await loadChunk(` часто переносится.
  return origin === null ? null : text.slice(origin, origin + 240);
}

/** Файл на просвет: возвращает список подозрительных мест. */
function sweepSource(text) {
  const guilty = [];
  for (const match of text.matchAll(HANDOUT)) {
    const name = match[1];
    if (NOT_A_VALUE.has(name)) continue;
    const origin = originOf(text, name, match.index);
    if (!origin || !FROM_PLUGIN.test(origin)) continue;
    // Прошёл через plainApi — наружу уходит копия, а не прокси.
    if (origin.includes("plainApi(")) continue;
    guilty.push(name);
  }
  return guilty;
}

/**
 * Сначала проверяем сам просмотр: правило, которое ничего не ловит, хуже
 * отсутствующего — оно создаёт уверенность. Образцы — сокращённый `nativeShare`
 * до правки и после неё.
 */
function scenarioSweepItself() {
  console.log("\n— проверяем сам просмотр —");
  const broken = `
    let sharePlugin = null;
    async function nativeShare() {
      if (!sharePlugin) {
        const { registerPlugin } = await import("@capacitor/core");
        sharePlugin = registerPlugin("Share");
      }
      return sharePlugin;
    }`;
  const fixed = broken.replace('registerPlugin("Share")', 'plainApi(registerPlugin("Share"), ["share"])');
  check("прокси, отданный из async-функции, найден", sweepSource(broken).join() === "sharePlugin");
  check("а обёрнутый в plainApi — не помечен", sweepSource(fixed).length === 0, sweepSource(fixed).join());
}

function scenarioSourceSweep() {
  console.log("\n— весь src на просвет —");
  const guilty = [];
  let scanned = 0;
  for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, "utf8");
    if (!FROM_PLUGIN.test(text)) continue;
    scanned += 1;
    for (const name of sweepSource(text)) guilty.push(`${path.relative(SRC, file)}: ${name}`);
  }
  check(`просмотрено файлов с плагинами: ${scanned}`, scanned > 0);
  check(
    "прокси плагина наружу из обещания никто не отдаёт",
    guilty.length === 0,
    guilty.join("\n     "),
  );
}

await scenarioTheDefect();
await scenarioChunkLoaders();
await scenarioTrackLoaders();
await scenarioCheckerShare();
await scenarioOtherLoaders();
scenarioSweepItself();
scenarioSourceSweep();

console.log(failures === 0 ? "\nвсе проверки прошли" : `\nпровалено проверок: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
