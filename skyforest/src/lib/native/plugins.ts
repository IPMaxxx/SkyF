/**
 * Плагины Capacitor, которые нужны в лесу.
 *
 * Каждый плагин живёт в отдельном куске бандла и приезжает по сети в момент
 * первого обращения — то есть ровно тогда, когда связи может уже не быть
 * (почему это вешает приложение намертво, объяснено в offline/deadline).
 * Поэтому здесь два правила на все офлайн-пути сразу:
 *
 *  - обращаться к плагину только через эти обёртки: у них есть срок, и
 *    неудача выглядит как обычный отказ плагина, на который у вызывающей
 *    стороны уже есть запасной путь (браузерный API, localStorage, пустой
 *    тайл);
 *  - звать `preloadOfflinePlugins()`, пока связь ещё есть. Куски весят
 *    килобайты, а поход длится часами: единственный дешёвый момент — запуск
 *    приложения, он же почти всегда происходит дома или у машины.
 *
 * В браузере предзагрузка не нужна и не делается: нативных плагинов там нет,
 * а сайт и так открыт в сети.
 */

import { isNativeApp } from "@/lib/native/capacitor";
import { loadChunk, preloadChunk } from "@/lib/offline/deadline";

const GEOLOCATION = "@capacitor/geolocation";
const PREFERENCES = "@capacitor/preferences";
const FILESYSTEM = "@capacitor/filesystem";
const APP = "@capacitor/app";
const SPLASH_SCREEN = "@capacitor/splash-screen";

export function geolocationPlugin() {
  return loadChunk(GEOLOCATION, () => import("@capacitor/geolocation"));
}

export function preferencesPlugin() {
  return loadChunk(PREFERENCES, () => import("@capacitor/preferences"));
}

export function filesystemPlugin() {
  return loadChunk(FILESYSTEM, () => import("@capacitor/filesystem"));
}

export function appPlugin() {
  return loadChunk(APP, () => import("@capacitor/app"));
}

export function splashScreenPlugin() {
  return loadChunk(SPLASH_SCREEN, () => import("@capacitor/splash-screen"));
}

/**
 * Тянет к себе всё, без чего поход без связи не состоится: замер координат,
 * зеркало трека для офлайн-экрана, файлы скачанных тайлов и жизненный цикл
 * приложения. Вызывается при монтировании рекордера — он есть на каждом
 * экране, поэтому момент самый ранний из возможных.
 */
export function preloadOfflinePlugins(): void {
  if (!isNativeApp()) return;
  preloadChunk(GEOLOCATION, () => import("@capacitor/geolocation"));
  preloadChunk(PREFERENCES, () => import("@capacitor/preferences"));
  preloadChunk(FILESYSTEM, () => import("@capacitor/filesystem"));
  preloadChunk(APP, () => import("@capacitor/app"));
}
