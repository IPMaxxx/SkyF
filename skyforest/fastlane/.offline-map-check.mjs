#!/usr/bin/env node
/**
 * Офлайн-карта WayBack: скачанное видно, точка «вы здесь» есть всегда.
 *
 * Проверка гоняет настоящую страницу офлайн-ядра (apps/wayback/shell/offline-track.js)
 * в поддельном браузере с поддельным мостом Capacitor — как соседние проверки,
 * без настоящего браузера и без устройства. Сеть в песочнице отключена намертво:
 * любой `fetch` и любая картинка с http-адресом считаются сетевым обращением и
 * ломают проверку. Это и есть условие задачи — в лесу сети нет.
 *
 * Три положения, и каждое отвечает на свой отчёт из поля:
 *
 *  1. Сети нет, тайлы в Filesystem ЕСТЬ. Карта обязана показать именно локальные
 *     тайлы (`_capacitor_file_`), маркер обязан быть.
 *  2. Сети нет, тайлов НЕТ. Обязана быть схематичная подложка (сетка координат
 *     на canvas) и маркер. Пустой экран здесь — тот самый отчёт «фон пустой».
 *  3. Сети нет, GPS ещё молчит, но последняя известная позиция есть. Маркер
 *     обязан появиться сразу, не дожидаясь спутников.
 *
 * Отдельно — совпадение схемы путей: пути, по которым тайлы пишет сайт
 * (src/lib/offline/tileStore.ts), сверяются с путями, по которым их читает
 * офлайн-страница. Утверждением в коде, а не на глаз: расхождение в каталоге,
 * префиксе, разделителях или расширении даёт ровно симптом «скачали, а офлайн
 * не находит», и заметить его чтением двух файлов подряд не получается.
 *
 * Проверка обязана падать на версии страницы ДО правки — правило, которое
 * ничего не ловит, хуже отсутствующего. Прежняя версия берётся не из `HEAD`
 * (после коммита правки там уже лежит исправленный файл, и такая проверка
 * начинает хвалить себя), а поиском по истории самого файла: берём ближайшую
 * версию, в которой ещё нет отдельной отрисовки точки «вы здесь».
 *
 * Запуск из каталога skyforest:
 *   node fastlane/.offline-map-check.mjs
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const REPO = new URL("../../", import.meta.url).pathname;
/** Путь страницы от корня репозитория — им же его знает git. */
const SHELL_REL = "skyforest/apps/wayback/shell/offline-track.js";
const SHELL = new URL("../apps/wayback/shell/offline-track.js", import.meta.url);
const TILE_STORE = new URL("../src/lib/offline/tileStore.ts", import.meta.url);
/** Признак правки: точка «вы здесь» рисуется отдельно от похода. */
const FIX_MARKER = "function renderPosition";
/** Сколько ждём, пока страница построит первый кадр. Больше срока моста (5 с). */
const BUDGET_MS = 9000;

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `\n     ${detail}`}`);
};

/* ------------------------------------------------------------------ */
/* Схема путей: чем пишет сайт и что читает офлайн-страница            */
/* ------------------------------------------------------------------ */

/**
 * Путь тайла по версии сайта — снимается с самого tileStore.ts, а не
 * переписывается сюда руками: списанная копия разошлась бы с источником молча.
 */
function writerTilePath(sourceId, z, x, y) {
  const source = readFileSync(TILE_STORE, "utf8");
  const dir = source.match(/const TILE_DIR = "([^"]+)"/);
  const body = source.match(/function tilePath\([^)]*\)[^{]*\{\s*return `([^`]+)`/);
  if (!dir || !body) {
    throw new Error(
      "не нашёл TILE_DIR/tilePath в src/lib/offline/tileStore.ts — запись тайлов переехала, перечитайте проверку",
    );
  }
  const template = body[1]
    .replace("${TILE_DIR}", dir[1])
    .replace("${sourceId}", sourceId)
    .replace("${coord.z}", String(z))
    .replace("${coord.x}", String(x))
    .replace("${coord.y}", String(y));
  if (template.includes("${")) throw new Error(`шаблон пути разобран не весь: ${template}`);
  return template;
}

/* ------------------------------------------------------------------ */
/* Прежняя версия страницы                                             */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Песочница                                                           */
/* ------------------------------------------------------------------ */

/**
 * @param {object} opts
 * @param {Set<string>} opts.tiles пути тайлов, лежащие в Filesystem
 * @param {object|null} opts.lastPosition последняя известная позиция
 * @param {object|null} opts.gps позиция, которую отдаёт watchPosition
 * @param {object|null} opts.track активный поход
 * @param {Array} opts.regions индекс скачанных областей
 */
function sandbox(opts) {
  const state = {
    mapCreated: false,
    /** Всё, что страница попросила у сети: обращений быть не должно ни одного. */
    network: [],
    /** Картинки тайлов по видам. */
    tileSrc: [],
    /** Нарисованные схематичные подложки (canvas-тайлы сетки). */
    graticule: 0,
    markers: [],
    calls: [],
    hint: "",
    layers: [],
  };

  const element = (id) => ({
    id,
    textContent: "",
    style: {},
    disabled: false,
    classList: { add() {}, remove() {}, contains: () => false },
    setAttribute() {},
    addEventListener() {},
  });
  const elements = new Map();
  const byId = (id) => {
    if (!elements.has(id)) elements.set(id, element(id));
    return elements.get(id);
  };

  /** Картинка: сеть запрещена, локальные адреса и data: грузятся мгновенно. */
  class FakeImage {
    constructor() {
      this._src = "";
      this.onload = null;
      this.onerror = null;
      this.naturalWidth = 0;
      this.width = 256;
    }
    set src(value) {
      this._src = value;
      state.tileSrc.push(value);
      const remote = /^https?:\/\//.test(value) && !value.includes("_capacitor_file_");
      if (remote) state.network.push(value);
      setTimeout(() => {
        if (remote) {
          if (this.onerror) this.onerror();
        } else {
          this.naturalWidth = 256;
          if (this.onload) this.onload();
        }
      }, 0);
    }
    get src() {
      return this._src;
    }
    setAttribute() {}
  }

  const canvasCtx = () => ({
    fillRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fillText() {
      state.graticule += 1;
    },
    drawImage() {},
    set fillStyle(v) {},
    set strokeStyle(v) {},
    set lineWidth(v) {},
    set font(v) {},
    set textBaseline(v) {},
    set imageSmoothingEnabled(v) {},
  });

  const createElement = (tag) => {
    if (tag === "img") return new FakeImage();
    return {
      tagName: tag,
      width: 256,
      height: 256,
      style: {},
      setAttribute() {},
      getContext: () => canvasCtx(),
      toDataURL: () => "data:image/png;base64,AA",
    };
  };

  /* --- Мост Capacitor: androidBridge, как на errorPath-странице Android --- */

  const prefs = new Map();
  if (opts.track) prefs.set("sf_active_track", JSON.stringify(opts.track));
  if (opts.lastPosition) prefs.set("sf_last_position", JSON.stringify(opts.lastPosition));
  if (opts.regions?.length) prefs.set("sf_tile_regions", JSON.stringify(opts.regions));

  const answer = (plugin, method, options) => {
    if (plugin === "Preferences" && method === "get") {
      return { value: prefs.has(options.key) ? prefs.get(options.key) : null };
    }
    if (plugin === "Preferences") return {};
    if (plugin === "SplashScreen") return {};
    if (plugin === "Filesystem" && (method === "stat" || method === "getUri")) {
      if (!opts.tiles.has(options.path)) {
        throw { message: `'${method}' failed: ${options.path} does not exist`, code: "OS-PLUG-FILE-0008" };
      }
      // Тот же ответ, что у настоящего плагина на Android.
      return method === "stat"
        ? { type: "file", size: 1024 }
        : { uri: `file:///data/user/0/ai.skyforest.wayback/files/${options.path}` };
    }
    // Своей службы и фонового плагина в этой оболочке «нет».
    throw { message: `${plugin}.${method} is not implemented` };
  };

  const watchers = [];
  const win = {
    addEventListener() {},
    removeEventListener() {},
    location: { origin: "https://localhost", href: "" },
    androidBridge: {
      postMessage(raw) {
        const call = JSON.parse(raw);
        state.calls.push(`${call.pluginId}.${call.methodName}`);
        if (call.pluginId === "Geolocation" && call.methodName === "watchPosition") {
          watchers.push(call.callbackId);
          if (opts.gps) {
            setTimeout(() => {
              win.androidBridge.onmessage?.({
                data: JSON.stringify({
                  callbackId: call.callbackId,
                  success: true,
                  save: true,
                  data: { coords: { latitude: opts.gps.lat, longitude: opts.gps.lng, accuracy: 12 } },
                }),
              });
            }, 30);
          }
          return;
        }
        setTimeout(() => {
          let payload;
          try {
            payload = { callbackId: call.callbackId, success: true, data: answer(call.pluginId, call.methodName, call.options) };
          } catch (error) {
            payload = { callbackId: call.callbackId, success: false, error };
          }
          win.androidBridge.onmessage?.({ data: JSON.stringify(payload) });
        }, 0);
      },
    },
    DeviceOrientationEvent: undefined,
  };

  /* --- Leaflet: ровно то, что трогает страница --- */

  let currentZoom = 2;
  const map = {
    setView(center, zoom) {
      if (typeof zoom === "number") currentZoom = zoom;
      return map;
    },
    getZoom: () => currentZoom,
    getBounds: () => ({
      pad: () => ({ contains: () => true }),
      contains: () => true,
    }),
    panTo() {},
    on() {
      return map;
    },
    addLayer() {},
    removeLayer() {},
    invalidateSize() {},
    fitBounds() {},
  };

  /** Слой Leaflet: сразу просим у него несколько тайлов вокруг центра. */
  const layerFactory = (proto, kind) => {
    function Layer(a, b) {
      this.options = (typeof a === "object" && a !== null ? a : b) || {};
      state.layers.push({ kind, options: this.options });
      this.getTileSize = () => ({ x: 256, y: 256 });
    }
    Layer.prototype = {
      ...proto,
      addTo() {
        // Тайлы вокруг Минска на z13 — там же, где лежит скачанная область.
        const coords = [
          { z: 13, x: 4776, y: 2621 },
          { z: 13, x: 4777, y: 2621 },
          { z: 13, x: 4776, y: 2622 },
        ];
        for (const c of coords) {
          try {
            const tile = this.createTile(c, () => {});
            if (tile && tile.tagName === "canvas") state.graticule += 1;
          } catch {
            /* слой может не уметь тайлы — тогда он их и не рисует */
          }
        }
        return this;
      },
    };
    return Layer;
  };

  const context = {
    window: win,
    navigator: { language: "ru-RU", onLine: false, geolocation: undefined },
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
    document: {
      readyState: "complete",
      documentElement: {},
      getElementById: byId,
      createElement,
      addEventListener() {},
      querySelector: () => null,
    },
    L: {
      TileLayer: { extend: (proto) => layerFactory(proto, "tile") },
      GridLayer: { extend: (proto) => layerFactory(proto, "grid") },
      latLng: (v) => v,
      control: { scale: () => ({ addTo() {} }) },
      map: () => {
        state.mapCreated = true;
        return map;
      },
      marker: (at, o) => {
        const m = {
          at,
          icon: o?.icon,
          addTo() {
            state.markers.push(m);
            return m;
          },
          setLatLng(v) {
            m.at = v;
          },
          setIcon(v) {
            m.icon = v;
          },
        };
        return m;
      },
      circle: () => ({ addTo() { return this; }, setLatLng() {}, setRadius() {} }),
      polyline: () => ({ addTo() { return this; }, setLatLngs() {} }),
      divIcon: (o) => ({ kind: /border:3px solid #3b82f6/.test(o.html) ? "stale" : /#3b82f6/.test(o.html) ? "current" : "anchor" }),
    },
    setTimeout,
    clearTimeout,
    setInterval: () => 0,
    clearInterval,
    Promise,
    AbortController,
    // Сеть отключена: любой fetch — это ошибка проверки, а не путь исполнения.
    fetch: (url) => {
      state.network.push(String(url));
      return Promise.reject(new Error("offline"));
    },
    Image: FakeImage,
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
    Infinity,
  };
  context.window.setTimeout = setTimeout;
  context.window.clearTimeout = clearTimeout;
  return { context, state };
}

async function run(source, opts) {
  const { context, state } = sandbox(opts);
  vm.createContext(context);
  vm.runInContext(source, context);
  const began = Date.now();
  // Ждём и карту, и первый маркер: маркер приходит позже, чем строится карта.
  while (Date.now() - began < BUDGET_MS) {
    if (state.mapCreated && state.markers.length > 0) break;
    await new Promise((done) => setTimeout(done, 50));
  }
  // Ещё немного — тайлы и маркер по GPS доезжают через микрозадачи моста.
  await new Promise((done) => setTimeout(done, 400));
  return { state, elapsed: Date.now() - began };
}

/* ------------------------------------------------------------------ */
/* Положения                                                           */
/* ------------------------------------------------------------------ */

const HERE = { lat: 53.9, lng: 27.55 };
/** Тот самый тайл, который просит песочница, — по схеме записи сайта. */
const PRESENT = new Set([
  writerTilePath("outdoor", 13, 4776, 2621),
  writerTilePath("outdoor", 13, 4777, 2621),
  writerTilePath("outdoor", 13, 4776, 2622),
]);

const REGIONS = [
  {
    id: "r1",
    name: "Лес",
    sourceId: "outdoor",
    sourceIds: ["outdoor", "satellite"],
    bbox: { west: 27.4, south: 53.8, east: 27.7, north: 54.0 },
    minZoom: 9,
    maxZoom: 16,
    tileCount: 100,
    sizeBytes: 1000,
    createdAt: Date.now(),
    center: HERE,
  },
];

/** Отказ, который проверка обязана увидеть на версии страницы до правки. */
const noMarker = (state) => !hasMarker(state, "current") && !hasMarker(state, "stale");

const CASES = [
  {
    id: "тайлы есть",
    title: "сети нет, тайлы в Filesystem есть",
    opts: { tiles: PRESENT, lastPosition: null, gps: HERE, track: null, regions: REGIONS },
    regression: noMarker,
    verify(state) {
      const local = state.tileSrc.filter((s) => s.includes("_capacitor_file_"));
      check(
        `${this.id}: карта показала локальные тайлы (${local.length} шт.)`,
        local.length > 0,
        `виды тайлов: ${[...new Set(state.tileSrc.map(kindOf))].join(", ")}`,
      );
      check(`${this.id}: ни одного сетевого обращения`, state.network.length === 0, state.network.slice(0, 3).join(", "));
      check(`${this.id}: маркер «вы здесь» есть`, hasMarker(state, "current"), markerReport(state));
    },
  },
  {
    id: "тайлов нет",
    title: "сети нет, тайлов нет",
    opts: { tiles: new Set(), lastPosition: null, gps: HERE, track: null, regions: [] },
    regression: (state) =>
      noMarker(state) || !(state.graticule > 0 && state.layers.some((l) => l.kind === "grid")),
    verify(state) {
      check(`${this.id}: схематичная подложка нарисована (${state.graticule} эл.)`, state.graticule > 0);
      check(
        `${this.id}: слой сетки есть в карте`,
        state.layers.some((l) => l.kind === "grid"),
        `слои: ${state.layers.map((l) => l.kind).join(", ")}`,
      );
      check(`${this.id}: ни одного сетевого обращения`, state.network.length === 0, state.network.slice(0, 3).join(", "));
      check(`${this.id}: маркер «вы здесь» есть`, hasMarker(state, "current"), markerReport(state));
    },
  },
  {
    id: "GPS молчит",
    title: "сети нет, фикса ещё нет, но есть последняя известная позиция",
    opts: {
      tiles: PRESENT,
      lastPosition: { ...HERE, t: Date.now() - 60_000 },
      gps: null,
      track: null,
      regions: REGIONS,
    },
    regression: noMarker,
    verify(state) {
      check(`${this.id}: маркер появился сразу, не дожидаясь спутников`, hasMarker(state, "stale"), markerReport(state));
      check(`${this.id}: ни одного сетевого обращения`, state.network.length === 0, state.network.slice(0, 3).join(", "));
    },
  },
];

function kindOf(src) {
  if (src.includes("_capacitor_file_")) return "local-file";
  if (src.startsWith("data:image/png")) return "upscaled";
  if (src.startsWith("data:image/gif")) return "blank";
  if (src.includes("basemap")) return "basemap";
  if (/^https?:/.test(src)) return "network";
  return "other";
}

function hasMarker(state, kind) {
  return state.markers.some((m) => m.icon?.kind === kind);
}

function markerReport(state) {
  return `маркеров: ${state.markers.length} (${state.markers.map((m) => m.icon?.kind ?? "?").join(", ") || "нет"})`;
}

/* ------------------------------------------------------------------ */

console.log("— схема путей: чем пишет сайт, то и читает офлайн-страница —");
{
  const shell = readFileSync(SHELL, "utf8");
  const dir = shell.match(/var TILE_DIR = "([^"]+)"/);
  const reader = shell.match(/var path = TILE_DIR \+ "\/" \+ source\.id \+ "\/" \+ coords\.z \+ "\/" \+ coords\.x \+ "\/" \+ coords\.y \+ "\.png";/);
  check(
    "каталог тайлов совпадает",
    dir?.[1] === "sf-tiles" && writerTilePath("outdoor", 1, 2, 3).startsWith(`${dir[1]}/`),
    `у страницы «${dir?.[1]}», у сайта «${writerTilePath("outdoor", 1, 2, 3)}»`,
  );
  check("шаблон пути у страницы тот же, что у сайта", Boolean(reader));
  const expected = writerTilePath("outdoor", 13, 4776, 2621);
  check(
    `путь тайла совпадает до символа: ${expected}`,
    expected === "sf-tiles/outdoor/13/4776/2621.png",
  );
  check(
    "каталог Filesystem совпадает (DATA у страницы, Directory.Data у сайта)",
    /directory: "DATA"/.test(shell) &&
      /directory: Directory\.Data/.test(readFileSync(TILE_STORE, "utf8")),
  );
}

const source = readFileSync(SHELL, "utf8");
console.log("\n— как есть сейчас —");
for (const c of CASES) {
  console.log(`  · ${c.title}`);
  const { state } = await run(source, c.opts);
  c.verify(state);
}

const before = sourceBeforeFix();
console.log(`\n— как было до правки (${before.rev.slice(0, 7)}, обязана падать) —`);
let regressions = 0;
for (const c of CASES) {
  const { state } = await run(before.text, c.opts);
  const broken = c.regression(state);
  if (broken) regressions += 1;
  const local = state.tileSrc.filter((s) => s.includes("_capacitor_file_")).length;
  console.log(
    `  ${broken ? "ok  " : "FAIL"} ${c.id}: до правки ${
      broken ? "отказ воспроизводится" : "проверка ничего не ловит"
    } — карта ${state.mapCreated ? "построена" : "НЕ построена"}, ${markerReport(state)}, подложка ${
      state.graticule
    } эл., локальных тайлов ${local}`,
  );
}
check(
  `до правки отказ воспроизводится во всех трёх положениях (${regressions}/${CASES.length})`,
  regressions === CASES.length,
);

console.log(failures === 0 ? "\nвсе проверки прошли" : `\nпровалено проверок: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
