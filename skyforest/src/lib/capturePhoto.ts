/**
 * Захват фото для фичи «Определение гриба по фото».
 *
 *  - native (iOS/Android через Capacitor) — открывает камеру устройства
 *    (`@capacitor/camera`, `CameraResultType.Base64`): файл собирается прямо
 *    из строки, потому что вариант с `Uri` + `fetch(webPath)` не работает,
 *    когда WebView загружен с удалённого `server.url` (skyforest.ai) — fetch
 *    на `capacitor://localhost/...` блокируется как кросс-origin, и фото
 *    молча терялось;
 *  - web / PWA — фолбэк на `<input type="file" accept="image/*" capture>`.
 *
 * Снимок ужимается до MAX_EDGE_PX: полноразмерный кадр 12 Мп в base64 — это
 * несколько мегабайт через мост WebView и заметная задержка загрузки, а для
 * распознавания такое разрешение не нужно.
 *
 * Возвращает `File` (удобно для превью через `URL.createObjectURL` и для
 * отправки в `FormData`) либо `null`, если пользователь отменил съёмку/выбор.
 * При реальной ошибке бросает `CaptureError` с полем `reason`, чтобы экран
 * мог отличить закрытый доступ от сбоя плагина, а не показывать всё одним
 * текстом «не удалось получить фото».
 */

import { isNativeApp } from "@/lib/native/capacitor";

const JPEG_QUALITY = 85;
/** Длинная сторона снимка: хватает для распознавания, экономит мост и сеть. */
const MAX_EDGE_PX = 1600;

export type CaptureFailure =
  /** Пользователь запретил камеру в системных настройках. */
  | "camera_denied"
  /** Пользователь запретил доступ к галерее. */
  | "photos_denied"
  /** Плагин камеры недоступен или вернул ошибку. */
  | "plugin_error";

export class CaptureError extends Error {
  readonly reason: CaptureFailure;
  /** Текст от плагина — показываем мелким шрифтом для диагностики. */
  readonly detail: string;

  constructor(reason: CaptureFailure, detail: string) {
    super(`${reason}: ${detail}`);
    this.name = "CaptureError";
    this.reason = reason;
    this.detail = detail;
  }
}

function base64ToFile(base64: string, format?: string): File {
  const ext = format === "png" ? "png" : format === "webp" ? "webp" : "jpg";
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], `mushroom-${Date.now()}.${ext}`, { type });
}

/** Отмена пользователем (закрыл камеру/пикер) — не ошибка, просто null. */
function isUserCancel(err: unknown): boolean {
  const msg = errorMessage(err);
  return /cancel/i.test(msg) && !/denied/i.test(msg);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  const message = (err as { message?: unknown } | null)?.message;
  return typeof message === "string" ? message : String(err);
}

/**
 * Плагин iOS отвечает текстом («User denied access to camera», «You are
 * missing NSCameraUsageDescription…»), Android — тем же набором сообщений,
 * поэтому классифицируем по сообщению, а не по коду.
 */
function classify(err: unknown, source: NativeSource): CaptureFailure {
  const msg = errorMessage(err).toLowerCase();
  if (msg.includes("denied") || msg.includes("permission")) {
    return source === "camera" ? "camera_denied" : "photos_denied";
  }
  return "plugin_error";
}

type NativeSource = "camera" | "photos";

async function nativeGetPhoto(source: NativeSource): Promise<File | null> {
  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
  try {
    const photo = await Camera.getPhoto({
      quality: JPEG_QUALITY,
      source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
      resultType: CameraResultType.Base64,
      allowEditing: false,
      correctOrientation: true,
      // Ужимаем кадр: оба размера — максимумы, пропорции плагин сохраняет.
      width: MAX_EDGE_PX,
      height: MAX_EDGE_PX,
    });
    if (photo.base64String) return base64ToFile(photo.base64String, photo.format);
    // Плагин ответил успехом без данных: повторный вызов открыл бы камеру
    // заново, поэтому честно показываем ошибку с причиной.
    throw new CaptureError("plugin_error", "empty base64String from plugin");
  } catch (err) {
    if (isUserCancel(err)) return null;
    // Повторно камеру не открываем: пользователь уже снял кадр, второй
    // запуск выглядел бы как «приложение просит фото ещё раз».
    if (err instanceof CaptureError) throw err;
    throw new CaptureError(classify(err, source), errorMessage(err));
  }
}

/**
 * Web-фолбэк: программный input. Важно для iOS WebKit: input должен быть
 * в DOM на момент click(), при этом не `display:none` у некоторых старых
 * версий — используем визуальное скрытие. Отмена пикера ловится событием
 * `cancel` (Safari 16.4+ / Chrome 113+); там, где его нет, промис останется
 * висеть до выбора файла — состояние страницы при этом не ломается.
 */
function webPickFile(captureCamera: boolean): Promise<File | null> {
  return new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (captureCamera) input.setAttribute("capture", "environment");
    input.style.cssText =
      "position:fixed;top:-1000px;left:-1000px;width:1px;height:1px;opacity:0;";

    const cleanup = () => {
      input.removeEventListener("change", onChange);
      input.removeEventListener("cancel", onCancel);
      input.remove();
    };
    const onChange = () => {
      const f = input.files?.[0] ?? null;
      cleanup();
      resolve(f);
    };
    const onCancel = () => {
      cleanup();
      resolve(null);
    };

    input.addEventListener("change", onChange);
    input.addEventListener("cancel", onCancel);
    document.body.appendChild(input);
    input.click();
  });
}

export async function capturePhoto(): Promise<File | null> {
  if (isNativeApp()) return nativeGetPhoto("camera");
  return webPickFile(true);
}

/** Выбор фото из галереи (без принудительной камеры) — общий web/native путь. */
export async function pickPhotoFromGallery(): Promise<File | null> {
  if (isNativeApp()) return nativeGetPhoto("photos");
  return webPickFile(false);
}
