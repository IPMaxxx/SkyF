#!/usr/bin/env node
/**
 * Самопроверка правила `skyforest/no-plugin-proxy-in-promise`.
 *
 * Правило, которое ничего не ловит, хуже отсутствующего: оно создаёт
 * уверенность. Поэтому образцы здесь двух видов — те, на которых правило
 * обязано срабатывать, и те, где оно обязано молчать. Вторых не меньше, чем
 * первых: ложное срабатывание на законном коде заставит выключить правило
 * целиком, и класс дефекта вернётся.
 *
 * Образцы взяты с настоящих мест: загрузчик своей службы WayBack, «Поделиться»
 * в Mushroom Checker, обёртки плагинов в lib/native/plugins.
 *
 * Запуск из каталога skyforest:
 *   node scripts/verify-plugin-proxy-rule.mjs
 */
import { Linter } from "eslint";
import tsParser from "@typescript-eslint/parser";
import skyforest from "../eslint-rules/index.mjs";

const linter = new Linter();
const RULE = "skyforest/no-plugin-proxy-in-promise";

const config = {
  files: ["**/*.ts"],
  plugins: { skyforest },
  languageOptions: { parser: tsParser, ecmaVersion: 2022, sourceType: "module" },
  rules: { [RULE]: "error" },
};

/** Обязан ловить. */
const CAUGHT = [
  [
    "прокси возвращён из async-функции",
    `import { registerPlugin } from "@capacitor/core";
     export async function load() {
       const api = registerPlugin<Api>("WayBackTrack");
       return api;
     }`,
  ],
  [
    "прокси проброшен через несколько имён",
    `import { registerPlugin } from "@capacitor/core";
     export async function load() {
       const api = registerPlugin<Api>("WayBackTrack");
       const first = api;
       const second = first;
       return second;
     }`,
  ],
  [
    "прокси в Promise.all",
    `import { registerPlugin } from "@capacitor/core";
     export async function both() {
       const api = registerPlugin<Api>("WayBackTrack");
       return Promise.all([api, api.status()]);
     }`,
  ],
  [
    "прокси в Promise.resolve",
    `import { registerPlugin } from "@capacitor/core";
     export function ready() {
       const api = registerPlugin<Api>("WayBackTrack");
       return Promise.resolve(api);
     }`,
  ],
  [
    "прокси в resolve() у new Promise",
    `import { registerPlugin } from "@capacitor/core";
     export function ready() {
       return new Promise((resolve) => {
         const api = registerPlugin<Api>("WayBackTrack");
         resolve(api);
       });
     }`,
  ],
  [
    "await на самом прокси",
    `import { registerPlugin } from "@capacitor/core";
     export async function ping() {
       const api = registerPlugin<Api>("WayBackTrack");
       await api;
     }`,
  ],
  [
    "прокси как результат .then()",
    `import { registerPlugin } from "@capacitor/core";
     export function later(work: Promise<void>) {
       const api = registerPlugin<Api>("WayBackTrack");
       return work.then(() => api);
     }`,
  ],
  [
    "прокси из статического импорта пакета",
    `import { Share } from "@capacitor/share";
     export async function sheet() {
       return Share;
     }`,
  ],
  [
    "прокси из разобранного динамического импорта",
    `export async function watcher() {
       const { BackgroundGeolocation } = await import("@capgo/background-geolocation");
       return BackgroundGeolocation;
     }`,
  ],
  [
    "прокси из обёртки над импортом (loadChunk)",
    `import { loadChunk } from "@/lib/offline/deadline";
     export async function watcher() {
       const { BackgroundGeolocation } = await loadChunk("bg", () => import("@capgo/background-geolocation"));
       return BackgroundGeolocation;
     }`,
  ],
  [
    "прокси в короткое тело async-стрелки",
    `import { registerPlugin } from "@capacitor/core";
     const api = registerPlugin<Api>("WayBackTrack");
     export const load = async () => api;`,
  ],
  [
    "прокси в состоянии, отданном через промис",
    `import { registerPlugin } from "@capacitor/core";
     export async function pick(flag: boolean) {
       const api = registerPlugin<Api>("WayBackTrack");
       const chosen = flag ? api : api;
       return chosen;
     }`,
  ],
];

/** Обязан молчать. */
const CLEAN = [
  [
    "plainApi обезвредил прокси",
    `import { registerPlugin } from "@capacitor/core";
     import { plainApi } from "@/lib/native/plainApi";
     export async function load() {
       const api = registerPlugin<Api>("WayBackTrack");
       await api.status();
       return plainApi(api, ["status", "start"]);
     }`,
  ],
  [
    "значение от plainApi живёт под своим именем",
    `import { registerPlugin } from "@capacitor/core";
     import { plainApi } from "@/lib/native/plainApi";
     let cached: Api | null = null;
     export async function load() {
       const api = registerPlugin<Api>("WayBackTrack");
       cached = plainApi(api, ["status"]);
       return cached;
     }`,
  ],
  [
    "await на вызове метода плагина, а не на плагине",
    `export async function login() {
       const { SocialLogin } = await import("@capgo/capacitor-social-login");
       await SocialLogin.initialize({});
       const { result } = await SocialLogin.login({});
       return result;
     }`,
  ],
  [
    "наружу отдаётся пространство имён модуля, а не плагин",
    `import { loadChunk } from "@/lib/offline/deadline";
     export function geolocationPlugin() {
       return loadChunk("geo", () => import("@capacitor/geolocation"));
     }`,
  ],
  [
    "ядро и перечисления пакетов прокси не являются",
    `export async function platform() {
       const { Capacitor } = await import("@capacitor/core");
       const { Directory } = await import("@capacitor/filesystem");
       return { Capacitor, Directory };
     }`,
  ],
  [
    "методы плагина в Promise.all",
    `import { registerPlugin } from "@capacitor/core";
     export async function both() {
       const api = registerPlugin<Api>("WayBackTrack");
       return Promise.all([api.status(), api.stop()]);
     }`,
  ],
  [
    "обычные значения границу пересекать могут",
    `export async function load() {
       const value = { status: () => 1 };
       return value;
     }`,
  ],
  [
    "прокси остаётся внутри функции",
    `import { registerPlugin } from "@capacitor/core";
     export async function ping() {
       const api = registerPlugin<Api>("WayBackTrack");
       await api.status();
     }`,
  ],
  [
    "типовой импорт из пакета плагина",
    `import type { Position } from "@capacitor/geolocation";
     export async function last(p: Position) {
       return p;
     }`,
  ],
];

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `\n     ${detail}`}`);
}

function lint(code) {
  return linter.verify(code, config, "sample.ts");
}

console.log("— правило обязано ловить —");
for (const [name, code] of CAUGHT) {
  const found = lint(code).filter((m) => m.ruleId === RULE);
  check(name, found.length > 0, "правило промолчало");
}

console.log("\n— правило обязано молчать —");
for (const [name, code] of CLEAN) {
  const messages = lint(code);
  const found = messages.filter((m) => m.ruleId === RULE);
  const broken = messages.filter((m) => m.fatal);
  check(
    name,
    found.length === 0 && broken.length === 0,
    [...found, ...broken].map((m) => `строка ${m.line}: ${m.message}`).join("\n     "),
  );
}

console.log("\n— сообщение объясняет причину и подсказывает выход —");
const sample = lint(CAUGHT[0][1]).find((m) => m.ruleId === RULE);
check("в тексте назван then", Boolean(sample && /then/.test(sample.message)));
check("в тексте назван plainApi", Boolean(sample && /plainApi/.test(sample.message)));

console.log(failures === 0 ? "\nвсе проверки прошли" : `\nпровалено проверок: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
