#!/usr/bin/env node
/**
 * Сроки в офлайн-ядре WayBack: страница обязана открыться даже когда мост
 * молчит.
 *
 * Мост подделан самым злым способом из возможных — androidBridge, который
 * принимает вызовы и не отвечает ни на один. Ровно так ведёт себя нативная
 * сторона, когда плагина в оболочке нет, служба умерла или мост ещё не
 * поднялся: ответ по callbackId не приходит, и промис не отклоняется никогда.
 * Первым в этом ожидании стоит `Preferences.get` в loadTrack, а за ним — всё
 * построение карты: без срока `start()` не доходит до неё вовсе, и снаружи это
 * выглядит пустым экраном без единой ошибки.
 *
 * Чтобы проверка не превратилась в самоуспокоение, тот же сценарий гоняется по
 * версии файла ДО правки: она обязана зависнуть. Правило, которое ничего не
 * ловит, хуже отсутствующего. Прежняя версия берётся не из `HEAD` (после
 * коммита правки там уже лежит исправленный файл, и такая проверка начинает
 * хвалить себя), а поиском по истории самого файла: берём ближайшую версию, в
 * которой у ожиданий ещё нет срока.
 *
 * Запуск из каталога skyforest:
 *   node fastlane/.offline-shell-deadline-check.mjs
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const REPO = new URL("../../", import.meta.url).pathname;
/** Путь страницы от корня репозитория — им же его знает git. */
const SHELL_REL = "skyforest/apps/wayback/shell/offline-track.js";
const SHELL = new URL("../apps/wayback/shell/offline-track.js", import.meta.url);
/** Признак правки: у каждого ожидания на этой странице есть срок. */
const FIX_MARKER = "function withDeadline";
/** Сколько ждём построения карты: заведомо больше срока моста (5 с) и меньше вечности. */
const BUDGET_MS = 9000;

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `\n     ${detail}`}`);
};

/**
 * Ближайшая версия страницы, в которой дефект ещё есть. Идём по истории самого
 * файла от `HEAD` вниз и берём первую, где нет признака правки: привязка к
 * `HEAD` работала бы ровно до коммита самой правки, а дальше сравнивала бы файл
 * сам с собой.
 */
function sourceBeforeFix() {
  const revs = execFileSync("git", ["rev-list", "HEAD", "--", SHELL_REL], {
    encoding: "utf8",
    cwd: REPO,
  })
    .trim()
    .split("\n")
    .filter(Boolean);
  for (const rev of revs) {
    const text = execFileSync("git", ["show", `${rev}:${SHELL_REL}`], {
      encoding: "utf8",
      cwd: REPO,
    });
    if (!text.includes(FIX_MARKER)) return { rev, text };
  }
  throw new Error(`в истории ${SHELL_REL} нет версии без «${FIX_MARKER}» — сверьте признак правки`);
}

/** Заглушки браузера ровно на то, что трогает офлайн-страница. */
function sandbox() {
  const state = { mapCreated: false, calls: [], startPaneShown: false };

  const element = (id) => ({
    id,
    textContent: "",
    style: {},
    disabled: false,
    classList: {
      add(name) {
        if (id === "startPane" && name === "hidden") state.startPaneShown = false;
      },
      remove(name) {
        if (id === "startPane" && name === "hidden") state.startPaneShown = true;
      },
      contains: () => false,
    },
    setAttribute() {},
    addEventListener() {},
  });

  const elements = new Map();
  const byId = (id) => {
    if (!elements.has(id)) elements.set(id, element(id));
    return elements.get(id);
  };

  const layer = (proto) => {
    function Layer(url, options) {
      this.options = options || {};
    }
    Layer.prototype = { ...proto, addTo() { return this; } };
    return Layer;
  };

  const map = {
    setView() { return map; },
    on() { return map; },
    addLayer() {},
    removeLayer() {},
    invalidateSize() {},
    fitBounds() {},
  };

  const store = new Map();
  const win = {
    addEventListener() {},
    removeEventListener() {},
    location: { origin: "http://localhost", href: "" },
    // Моста Capacitor с низкоуровневыми методами здесь нет — как на errorPath
    // странице Android; остаётся androidBridge, и он молчит.
    androidBridge: {
      postMessage(raw) {
        state.calls.push(JSON.parse(raw));
      },
    },
    DeviceOrientationEvent: undefined,
  };

  const context = {
    window: win,
    navigator: { language: "en-US", onLine: true, geolocation: undefined },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    document: {
      readyState: "complete",
      documentElement: {},
      getElementById: byId,
      createElement: () => ({ setAttribute() {}, getContext: () => ({ drawImage() {} }), toDataURL: () => "data:," }),
      addEventListener() {},
    },
    L: {
      TileLayer: { extend: layer },
      // Схематичная подложка (сетка координат) — слой на canvas, а он строится
      // от GridLayer: у TileLayer вся логика заточена под <img>.
      GridLayer: { extend: layer },
      latLng: (v) => v,
      circle: () => ({ addTo() { return this; }, setLatLng() {}, setRadius() {} }),
      control: { scale: () => ({ addTo() {} }) },
      map: () => {
        state.mapCreated = true;
        return map;
      },
      marker: () => ({ addTo() { return this; }, setLatLng() {} }),
      polyline: () => ({ addTo() { return this; }, setLatLngs() {} }),
      divIcon: () => ({}),
    },
    setTimeout,
    clearTimeout,
    setInterval: () => 0,
    clearInterval,
    Promise,
    AbortController,
    fetch: () => new Promise(() => {}),
    Image: class {},
    FileReader: class {},
    alert() {},
    console,
    Date,
    Math,
    JSON,
    isNaN,
    String,
    Number,
    Array,
    Object,
    Error,
  };
  context.window.setTimeout = setTimeout;
  context.window.clearTimeout = clearTimeout;
  return { context, state };
}

async function run(name, source, expectMap) {
  const { context, state } = sandbox();
  vm.createContext(context);
  vm.runInContext(source, context);

  const began = Date.now();
  while (!state.mapCreated && Date.now() - began < BUDGET_MS) {
    await new Promise((done) => setTimeout(done, 100));
  }
  const elapsed = Date.now() - began;
  const called = [...new Set(state.calls.map((c) => `${c.pluginId}.${c.methodName}`))];

  if (expectMap) {
    check(`${name}: карта построена за ${elapsed} мс, хотя мост молчит`, state.mapCreated);
    check(`${name}: экран старта показан`, state.startPaneShown);
  } else {
    // Негативное плечо: цифры обязательны. Молчаливое «прошло» здесь ничем не
    // отличалось бы от прогона по исправленному файлу.
    check(
      `${name}: без срока ожидание не кончается — карт построено ${
        state.mapCreated ? 1 : 0
      }, экран старта показан ${state.startPaneShown ? 1 : 0} раз, ждали ${elapsed} мс`,
      !state.mapCreated && !state.startPaneShown,
    );
  }
  check(`${name}: вызовы на мост уходили (${state.calls.length} шт., видов ${called.length})`, called.length > 0, called.join(", "));
  console.log(`     на мост ушло: ${called.join(", ") || "(ничего)"}`);
}

console.log("— как есть сейчас —");
await run("со сроками", readFileSync(SHELL, "utf8"), true);

const before = sourceBeforeFix();
console.log(`\n— как было до правки (${before.rev.slice(0, 7)}, обязана зависать) —`);
await run("без сроков", before.text, false);

console.log(failures === 0 ? "\nвсе проверки прошли" : `\nпровалено проверок: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
