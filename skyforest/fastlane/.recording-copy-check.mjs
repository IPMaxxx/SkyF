#!/usr/bin/env node
/**
 * Обещание «запись идёт с погашенным экраном» — только там, где это правда.
 *
 * Веб приезжает в оболочку с сайта, поэтому один и тот же текст читают сразу
 * во всех установленных приложениях: и в свежей сборке со своей службой
 * переднего плана, и в той, что стоит у людей из Play, и в сборке на ревью у
 * Apple, и в браузере. Усиленная формулировка верна ровно в первой — в
 * остальных это ложь, причём первым её читает ревьюер магазина.
 *
 * Проверка предъявляет три случая целиком, от нативного ответа до ключа
 * словаря: службы нет — нейтральная строка; служба есть — сильная; ответа ещё
 * нет — нейтральная. Плюс сами тексты: нейтральный не имеет права обещать
 * погашенный экран, сильный обязан.
 *
 * Нативная часть не моделируется, а подменяется тем же мостом-заглушкой, что и
 * в .plugin-proxy-check.mjs: пересказ признака разошёлся бы с кодом на первой
 * же правке, а именно признак здесь и решает всё.
 *
 * Запуск из каталога skyforest/:
 *   node fastlane/.recording-copy-check.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

let failures = 0;

function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `\n     ${detail}`}`);
}

/* ------------------------------------------------------------------ */
/* Мост-заглушка и окружение нативной оболочки                         */
/* ------------------------------------------------------------------ */

/** Плагины, которых в этой оболочке нет: мост отвечает UNIMPLEMENTED. */
const missing = new Set();

const plugins = new Map();

function plugin(name) {
  const hit = plugins.get(name);
  if (hit) return hit;
  const proxy = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "$$typeof" || prop === "toJSON") return undefined;
        return (...args) => {
          if (missing.has(name)) {
            return Promise.reject({
              code: "UNIMPLEMENTED",
              message: `${name}.${String(prop)} is not implemented on android`,
            });
          }
          return Promise.resolve({
            running: false,
            precise: true,
            location: true,
            notifications: true,
            args,
          });
        };
      },
    },
  );
  plugins.set(name, proxy);
  return proxy;
}

globalThis.__capacitorStub = { plugin };

const store = new Map();
globalThis.window = {
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => "android",
    PluginHeaders: [],
  },
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  },
  location: { origin: "https://wayback.skyforest.ai" },
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
};
globalThis.localStorage = globalThis.window.localStorage;

register("./.plugin-stub-hooks.mjs", import.meta.url);

/* ------------------------------------------------------------------ */
/* Три случая, от ответа моста до ключа словаря                        */
/* ------------------------------------------------------------------ */

const src = (rel) => fileURLToPath(new URL(`../src/${rel}`, import.meta.url));
const read = (rel) => readFileSync(src(rel), "utf8");

const { recordingCopy, backgroundSupportFrom } = await import("../src/lib/wayback/recordingCopy.ts");
const { foregroundService } = await import("../src/lib/track/foregroundService.ts");

async function scenarioNoService() {
  console.log("\n— сборка без нативной службы (Play versionCode 6, iOS 1.0, браузер) —");
  // Порядок важен: удачную находку foregroundService кеширует, отказ — нет.
  missing.add("WayBackTrack");
  const service = await foregroundService();
  check("мост честно ответил «службы нет»", service === null);

  const support = backgroundSupportFrom(service);
  check("признак — «фона нет»", support === "absent", support);
  const copy = recordingCopy(support);
  check("шаг «как это работает» — нейтральный", copy.how2 === "how2", copy.how2);
  check("легенда пунктира — нейтральная", copy.gapHint === "gapHint", copy.gapHint);
}

async function scenarioServicePresent() {
  console.log("\n— сборка со своей службой переднего плана (WayBackTrack) —");
  missing.delete("WayBackTrack");
  const service = await foregroundService();
  check("служба найдена", Boolean(service));

  const support = backgroundSupportFrom(service);
  check("признак — «фон есть»", support === "present", support);
  const copy = recordingCopy(support);
  check("шаг «как это работает» — сильный", copy.how2 === "how2Background", copy.how2);
  check("легенда пунктира — сильная", copy.gapHint === "gapHintBackground", copy.gapHint);
}

/**
 * Признак асинхронный: мост отвечает не в тот же кадр, что и отрисовка. Пока
 * ответа нет, сильную формулировку показывать нельзя — мигнуть обещанием и
 * забрать его назад хуже, чем сказать меньше.
 */
function scenarioBeforeTheAnswer() {
  console.log("\n— ответа нативной части ещё нет —");
  const copy = recordingCopy("unknown");
  check("шаг «как это работает» — нейтральный", copy.how2 === "how2", copy.how2);
  check("легенда пунктира — нейтральная", copy.gapHint === "gapHint", copy.gapHint);

  // Начальное состояние хука — то же «ещё не спросили», и это его свойство, а
  // не наше пожелание: с "present" в useState экран мигал бы обещанием.
  const hook = read("lib/wayback/useRecordingCopy.ts");
  check(
    "хук стартует с «ещё не спросили»",
    /useState<BackgroundSupport>\(\s*"unknown"\s*\)/.test(hook),
    "начальное значение в useRecordingCopy не «unknown»",
  );
}

/* ------------------------------------------------------------------ */
/* Сами тексты                                                         */
/* ------------------------------------------------------------------ */

/** Чем сильная формулировка отличается от нейтральной — в каждой локали. */
const PROMISE = {
  en: /screen off/i,
  ru: /погашенн?ым экраном/i,
};

async function scenarioTexts() {
  console.log("\n— тексты обеих локалей —");
  for (const locale of ["en", "ru"]) {
    const dict = (await import(`../src/i18n/messages/wayback.${locale}.ts`)).default;
    const strings = {
      how2: dict.home.how2,
      how2Background: dict.home.how2Background,
      gapHint: dict.active.gapHint,
      gapHintBackground: dict.active.gapHintBackground,
    };
    for (const [key, value] of Object.entries(strings)) {
      check(`${locale}: ${key} есть в словаре`, typeof value === "string" && value.length > 0);
    }
    const promises = PROMISE[locale];
    check(
      `${locale}: нейтральный шаг не обещает погашенный экран`,
      !promises.test(strings.how2 ?? ""),
      strings.how2,
    );
    check(
      `${locale}: сильный шаг обещает его прямо`,
      promises.test(strings.how2Background ?? ""),
      strings.how2Background,
    );
    check(
      `${locale}: нейтральная легенда не называет причину разрыва`,
      !/satellite|спутник/i.test(strings.gapHint ?? ""),
      strings.gapHint,
    );
    check(
      `${locale}: сильная легенда называет её`,
      /satellite|спутник/i.test(strings.gapHintBackground ?? ""),
      strings.gapHintBackground,
    );
  }
}

/* ------------------------------------------------------------------ */
/* Выбор действительно доходит до экрана                               */
/* ------------------------------------------------------------------ */

/**
 * Самое ценное утверждение проверки: ключ не просто вычисляется, а именно им
 * экран и пользуется. Захардкоженный `t("gapHint")` вернул бы нейтральную
 * строку во все сборки молча — то есть проверка прошла бы, а работа пропала.
 */
function scenarioWiring() {
  console.log("\n— выбранный ключ доходит до экрана —");
  const screen = read("components/wayback/WayBackTrackScreen.tsx");
  check("экран похода берёт легенду по выбранному ключу", screen.includes("t(copy.gapHint)"));
  check(
    "и не показывает нейтральную строку в обход выбора",
    !/\bt\(\s*"gapHint"\s*\)/.test(screen),
    'в WayBackTrackScreen остался t("gapHint")',
  );

  const menu = read("components/wayback/WayBackMenu.tsx");
  check("«как это работает» берёт шаг по выбранному ключу", menu.includes("tHow(copy.how2)"));
  check(
    "и не показывает нейтральную строку в обход выбора",
    !/\btHow\(\s*"how2"\s*\)/.test(menu),
    'в WayBackMenu остался tHow("how2")',
  );
}

await scenarioNoService();
await scenarioServicePresent();
scenarioBeforeTheAnswer();
await scenarioTexts();
scenarioWiring();

console.log(failures === 0 ? "\nвсе проверки прошли" : `\nпровалено проверок: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
