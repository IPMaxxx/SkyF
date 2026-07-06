/**
 * Захват фото для фичи «Определение гриба по фото».
 *
 *  - native (iOS/Android через Capacitor) — открывает камеру устройства
 *    (`@capacitor/camera`, `Camera.getPhoto`, quality 85). Результат берём как
 *    Base64 и собираем File напрямую: вариант с `CameraResultType.Uri` +
 *    `fetch(webPath)` не работает, когда WebView загружен с удалённого
 *    `server.url` (skyforest.ai) — fetch на `capacitor://localhost/...`
 *    блокируется как кросс-origin, и фото молча терялось;
 *  - web / PWA — фолбэк на `<input type="file" accept="image/*" capture>`.
 *
 * Возвращает `File` (удобно для превью через `URL.createObjectURL` и для
 * отправки в `FormData`) либо `null`, если пользователь отменил съёмку/выбор.
 * При реальной ошибке (нет доступа к камере, сбой плагина) бросает Error —
 * вызывающая сторона показывает пользователю сообщение.
 */

import { isNativeApp } from "@/lib/native/capacitor";

const JPEG_QUALITY = 85;

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
  const msg = err instanceof Error ? err.message : String(err);
  return /cancel/i.test(msg);
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
    });
    if (!photo.base64String) return null;
    return base64ToFile(photo.base64String, photo.format);
  } catch (err) {
    if (isUserCancel(err)) return null;
    // Нет разрешения на камеру/галерею или сбой плагина.
    throw err instanceof Error ? err : new Error("capture_failed");
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
