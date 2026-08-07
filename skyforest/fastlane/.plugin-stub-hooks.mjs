/**
 * Хуки загрузки модулей для fastlane/.plugin-proxy-check.mjs.
 *
 * Нужны, чтобы проверка гоняла НАСТОЯЩИЕ модули проекта, а не их пересказ.
 * Копия загрузчика в проверке разошлась бы с кодом на первой же правке — а
 * дефект, ради которого всё это написано, ровно такой, что глазами его в коде
 * не видно.
 *
 * Хуков два:
 *  - `@/...` — алиас Next на `src/`, без него ни один модуль проекта в Node не
 *    загрузится;
 *  - `@capacitor/*`, `@capgo/*`, `@aparajita/*` — подменяются заглушкой,
 *    которая ведёт себя как настоящий мост: `registerPlugin` и именованные
 *    экспорты отдают Proxy, отвечающий вызовом нативного метода на ЛЮБОЕ
 *    свойство, включая `then`.
 *
 * Поведением заглушки управляет проверка через globalThis.__capacitorStub.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const STUB = "capacitor-stub:";
const NATIVE_PACKAGES = ["@capacitor/", "@capgo/", "@aparajita/"];

/** `@/lib/native/plugins` → файл в src, с перебором расширений. */
function resolveAlias(specifier) {
  const rel = specifier.slice(2);
  for (const suffix of ["", ".ts", ".tsx", "/index.ts"]) {
    const candidate = path.join(SRC, rel + suffix);
    if (suffix !== "" && existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  const asIs = path.join(SRC, rel);
  return existsSync(asIs) ? pathToFileURL(asIs).href : null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const url = resolveAlias(specifier);
    if (url) return { url, shortCircuit: true };
  }
  if (NATIVE_PACKAGES.some((prefix) => specifier.startsWith(prefix))) {
    return { url: STUB + specifier, shortCircuit: true };
  }
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    // Внутри проекта расширения не пишут («./brand-locale»): так принято в
    // Next, а Node без подсказки такой путь не находит.
    const guess = await guessExtension(specifier, context, nextResolve);
    if (guess) return guess;
    throw error;
  }
}

async function guessExtension(specifier, context, nextResolve) {
  if (!specifier.startsWith(".")) return null;
  for (const suffix of [".ts", ".tsx", "/index.ts"]) {
    try {
      return await nextResolve(specifier + suffix, context);
    } catch {
      /* следующее расширение */
    }
  }
  return null;
}

/**
 * Один и тот же текст на все нативные пакеты: лишние экспорты никому не мешают,
 * а список того, что мы у Capacitor берём, в проверке дублировать не хочется.
 *
 * Перечисления (`Directory`, `Style`, …) — обычные объекты: их значения код
 * передаёт нативной стороне, и прокси на их месте только запутал бы отчёт.
 */
const STUB_SOURCE = `
const stub = globalThis.__capacitorStub;

export const registerPlugin = (name) => stub.plugin(name);
export const Capacitor = globalThis.window.Capacitor;

export const App = stub.plugin("App");
export const BackgroundGeolocation = stub.plugin("BackgroundGeolocation");
export const BiometricAuth = stub.plugin("BiometricAuthNative");
export const Browser = stub.plugin("Browser");
export const Camera = stub.plugin("Camera");
export const Filesystem = stub.plugin("Filesystem");
export const Geolocation = stub.plugin("Geolocation");
export const Preferences = stub.plugin("Preferences");
export const PushNotifications = stub.plugin("PushNotifications");
export const SocialLogin = stub.plugin("SocialLogin");
export const SplashScreen = stub.plugin("SplashScreen");
export const StatusBar = stub.plugin("StatusBar");

export const Directory = { Data: "DATA", Cache: "CACHE", Documents: "DOCUMENTS" };
export const Style = { Dark: "DARK", Light: "LIGHT", Default: "DEFAULT" };
export const CameraResultType = { Base64: "base64", Uri: "uri", DataUrl: "dataUrl" };
export const CameraSource = { Camera: "CAMERA", Photos: "PHOTOS", Prompt: "PROMPT" };
`;

export async function load(url, context, nextLoad) {
  if (url.startsWith(STUB)) {
    return { format: "module", shortCircuit: true, source: STUB_SOURCE };
  }
  return nextLoad(url, context);
}
