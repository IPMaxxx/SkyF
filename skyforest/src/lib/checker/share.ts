/**
 * Mushroom Checker — ссылки «поделиться» на свою публичную карточку.
 *
 * Что мы шарим: находку (вид + дата), закрытый уровень квестов или общий счёт.
 * Ссылка ведёт на нашу страницу `/s/<токен>`, а не на Википедию или GBIF:
 * пересланное сообщение должно рекламировать приложение, а не справочник.
 *
 * БАЗЫ ДАННЫХ ЗДЕСЬ НЕТ. Содержимое карточки целиком лежит в самом адресе:
 * компактный JSON → base64url, к нему через `~` дописывается усечённый
 * HMAC-SHA256. Поэтому ссылка живёт вечно, не требует таблицы, не протухает
 * при чистке базы и не даёт получателю ничего, кроме того, что видно в URL.
 * В полезной нагрузке только ключ вида, дата и счётчики — ни идентификатора
 * пользователя, ни ссылки на снимок (снимки лежат в приватном бакете).
 *
 * ПОЧЕМУ `~`, А НЕ ТОЧКА. Middleware не запускается для путей с точкой
 * (matcher исключает `.*\..*` — так отсеивается статика), а без middleware
 * поддомен checker.* не подменит путь на внутренний сегмент `/ck/*` и адрес
 * отдаст 404. `~` — незарезервированный символ URI (RFC 3986) и не входит в
 * алфавит base64url, поэтому однозначно отделяет подпись от данных.
 *
 * Подпись ставит сервер (`/api/ck/share`): секрет `CHECKER_SHARE_SECRET`
 * на клиент не попадает. Если секрета нет, ссылка уходит без подписи и
 * страница её принимает — фича работает сразу после деплоя, а подпись только
 * закрывает подделку красивых чисел («нашёл 15 из 15»).
 */

import { routing } from "@/i18n/routing";
import { isNativeApp } from "@/lib/native/capacitor";
import { plainApi } from "@/lib/native/plainApi";

export type SharePayload =
  | { kind: "find"; speciesKey: string; date: string }
  | { kind: "level"; levelId: number; found: number; total: number }
  | { kind: "rank"; found: number; total: number };

/** Публичный сегмент карточки: `/s/<токен>` (см. internalRewrites Checker). */
export const SHARE_SEGMENT = "/s";

/** Разделитель данных и подписи внутри токена. */
const SIG_SEPARATOR = "~";

/**
 * Длина подписи в символах base64url. 16 символов — 96 бит: подобрать такую
 * подпись к своему тексту нереально, а адрес остаётся коротким (важно: он
 * едет в СМС и в подписи к посту).
 */
const SIG_LENGTH = 16;

/** Ключ вида: только то, что мы сами кладём в квесты. */
const SPECIES_KEY_RE = /^[A-Za-z0-9_-]{1,64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Разумный потолок счётчиков: защищает и разметку, и картинку OG. */
const MAX_COUNT = 999;

function isCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_COUNT
  );
}

/**
 * Проверка формы полезной нагрузки. Одна на всех: и роут подписи (что пришло
 * от клиента), и страница (что приехало в адресе) должны считать допустимым
 * ровно одно и то же, иначе появится ссылка, которую мы выдаём, но не умеем
 * открыть.
 */
export function isSharePayload(value: unknown): value is SharePayload {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  if (p.kind === "find") {
    return (
      typeof p.speciesKey === "string" &&
      SPECIES_KEY_RE.test(p.speciesKey) &&
      typeof p.date === "string" &&
      DATE_RE.test(p.date)
    );
  }
  if (p.kind === "level") {
    return (
      typeof p.levelId === "number" &&
      Number.isInteger(p.levelId) &&
      p.levelId >= 1 &&
      p.levelId <= 99 &&
      isCount(p.found) &&
      isCount(p.total) &&
      p.found <= p.total
    );
  }
  if (p.kind === "rank") {
    return isCount(p.found) && isCount(p.total) && p.found <= p.total;
  }
  return false;
}

/**
 * Канонический JSON: ключи в фиксированном порядке. Подпись считается от
 * строки, поэтому `{"kind":"rank","found":8}` и `{"found":8,"kind":"rank"}`
 * не должны получаться из одной и той же нагрузки.
 */
function canonicalJson(payload: SharePayload): string {
  if (payload.kind === "find") {
    return JSON.stringify({
      kind: "find",
      speciesKey: payload.speciesKey,
      date: payload.date,
    });
  }
  if (payload.kind === "level") {
    return JSON.stringify({
      kind: "level",
      levelId: payload.levelId,
      found: payload.found,
      total: payload.total,
    });
  }
  return JSON.stringify({
    kind: "rank",
    found: payload.found,
    total: payload.total,
  });
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Полезная нагрузка → base64url (без подписи). */
export function encodeSharePayload(payload: SharePayload): string {
  return bytesToBase64Url(new TextEncoder().encode(canonicalJson(payload)));
}

/** base64url → полезная нагрузка. Мусор на входе — это `null`, а не исключение. */
export function decodeSharePayload(encoded: string): SharePayload | null {
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(encoded));
    const parsed: unknown = JSON.parse(json);
    return isSharePayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Подпись данных токена. Секрет передаётся аргументом, а не читается из env:
 * модуль попадает и в клиентский бандл, и переменной здесь быть не должно.
 *
 * Web Crypto, а не `node:crypto`, — чтобы файл оставался изоморфным (страница,
 * роут и, при необходимости, edge-рантайм считают одну и ту же подпись).
 */
export async function signShareToken(
  encoded: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encoded),
  );
  return bytesToBase64Url(new Uint8Array(signature)).slice(0, SIG_LENGTH);
}

/** Сравнение подписей за постоянное время. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Собрать токен: данные плюс подпись, если секрет задан. */
export async function buildShareToken(
  payload: SharePayload,
  secret?: string,
): Promise<string> {
  const encoded = encodeSharePayload(payload);
  if (!secret) return encoded;
  return `${encoded}${SIG_SEPARATOR}${await signShareToken(encoded, secret)}`;
}

export type ParsedShareToken = {
  payload: SharePayload;
  /** Подпись есть и сошлась. Неподписанные ссылки мы тоже открываем. */
  verified: boolean;
};

/**
 * Разобрать токен из адреса.
 *
 * Неподписанная ссылка принимается всегда: пока `CHECKER_SHARE_SECRET` не
 * задан, других ссылок мы и не выдаём. Подписанная с неверной подписью —
 * отклоняется: раз подпись есть, она должна сходиться.
 */
export async function parseShareToken(
  token: string,
  secret?: string,
): Promise<ParsedShareToken | null> {
  const [encoded, signature, ...rest] = token.split(SIG_SEPARATOR);
  if (!encoded || rest.length > 0) return null;

  const payload = decodeSharePayload(encoded);
  if (!payload) return null;

  if (!signature) return { payload, verified: false };
  if (!secret) return { payload, verified: false };

  const expected = await signShareToken(encoded, secret);
  if (!timingSafeEqual(signature, expected)) return null;
  return { payload, verified: true };
}

/**
 * Публичный путь карточки.
 *
 * Префикс локали ставим по правилу `as-needed` самого next-intl: с префиксом
 * локали по умолчанию он бы ответил редиректом. На сборке доменов `.ai`
 * (её и обслуживает Checker) по умолчанию английский, поэтому русская
 * находка уезжает как `/ru/s/...` и у получателя откроется по-русски.
 */
export function shareUrlPath(token: string, locale: string): string {
  const known = routing.locales.find((loc) => loc === locale);
  const prefix = !known || known === routing.defaultLocale ? "" : `/${known}`;
  return `${prefix}${SHARE_SEGMENT}/${token}`;
}

/**
 * Ответы роута подписи за время сеанса. Повторное нажатие «поделиться» на той
 * же находке не должно ходить в сеть: системный лист обязан открыться сразу
 * по касанию, иначе Safari успевает потерять пользовательский жест.
 */
const urlCache = new Map<string, Promise<string>>();

async function requestShareUrl(
  payload: SharePayload,
  locale: string,
): Promise<string> {
  const response = await fetch("/api/ck/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload, locale }),
  });
  if (!response.ok) throw new Error(`share url: ${response.status}`);
  const data: unknown = await response.json();
  const path = (data as { path?: unknown })?.path;
  if (typeof path !== "string" || !path.startsWith("/")) {
    throw new Error("share url: bad response");
  }
  return new URL(path, window.location.origin).toString();
}

/**
 * Подписанный абсолютный URL публичной карточки.
 *
 * Никогда не бросает: сорванная сеть не должна ломать кнопку «поделиться» —
 * в худшем случае человек отправит друзьям посадочную страницу приложения.
 */
export async function buildShareUrl(
  payload: SharePayload,
  locale: string,
): Promise<string> {
  const landing =
    typeof window === "undefined" ? "" : window.location.origin;
  try {
    const cacheKey = `${locale}:${canonicalJson(payload)}`;
    const cached = urlCache.get(cacheKey);
    if (cached) return await cached;

    const pending = requestShareUrl(payload, locale);
    urlCache.set(cacheKey, pending);
    try {
      return await pending;
    } catch (error) {
      urlCache.delete(cacheKey);
      throw error;
    }
  } catch {
    return landing;
  }
}

/** Имя, под которым нативный плагин «поделиться» регистрируется в Capacitor. */
const SHARE_PLUGIN = "Share";

type SharePlugin = {
  share(options: {
    title?: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
  }): Promise<{ activityType?: string }>;
};

let sharePlugin: SharePlugin | null = null;

/**
 * Собран ли плагин «поделиться» в текущую нативную оболочку.
 *
 * Проверять обязательно: без нативной части прокси плагина уходит в
 * бесконечную рекурсию и вешает главный поток WebView (так замирал экран
 * аккаунта Checker на биометрии, см. `lib/native/biometricLock.ts`).
 * Спрашиваем `PluginHeaders` — список реально собранных плагинов;
 * `Capacitor.isPluginAvailable()` отвечает «да» и на одну JS-регистрацию,
 * которая как раз и зацикливается.
 */
function hasNativeShare(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (
    window as unknown as {
      Capacitor?: { PluginHeaders?: Array<{ name: string }> };
    }
  ).Capacitor;
  return Boolean(cap?.PluginHeaders?.some((header) => header.name === SHARE_PLUGIN));
}

/**
 * Плагин берём через `registerPlugin` ядра, а не импортом `@capacitor/share`:
 * веб-часть пакета нам не нужна (её заменяет `navigator.share` ниже), а
 * нативная приезжает из оболочки `apps/mushroom-checker`. Так пакет не
 * приходится тянуть в зависимости сайта ради одного вызова.
 *
 * Наружу уходит не прокси, а обычный объект с его методами: прокси отвечает
 * вызовом нативного метода и на обращение к `then`, а его спрашивает движок у
 * каждого значения, которым разрешается промис. Подробно — в native/plainApi.
 */
async function nativeShare(): Promise<SharePlugin> {
  if (!sharePlugin) {
    const { registerPlugin } = await import("@capacitor/core");
    sharePlugin = plainApi(registerPlugin<SharePlugin>(SHARE_PLUGIN), ["share"]);
  }
  return sharePlugin;
}

/** Пользователь закрыл системный лист — это не ошибка и не повод копировать. */
function isShareCancelled(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | null;
  if (!e) return false;
  if (e.name === "AbortError") return true;
  const message = (e.message || "").toLowerCase();
  return message.includes("cancel") || message.includes("abort");
}

async function copyToClipboard(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Системный лист «поделиться».
 *
 * @returns false, если поделиться не удалось или пользователь отменил.
 *   Копирование в буфер — запасной путь там, где системного листа нет
 *   (десктопный браузер): ссылка всё равно оказывается у пользователя.
 */
export async function shareContent(input: {
  title: string;
  text: string;
  url: string;
}): Promise<boolean> {
  const { title, text, url } = input;

  if (isNativeApp() && hasNativeShare()) {
    try {
      const plugin = await nativeShare();
      await plugin.share({ title, text, url, dialogTitle: title });
      return true;
    } catch (error) {
      if (isShareCancelled(error)) return false;
      return copyToClipboard(url);
    }
  }

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (error) {
      if (isShareCancelled(error)) return false;
      return copyToClipboard(url);
    }
  }

  return copyToClipboard(url);
}
