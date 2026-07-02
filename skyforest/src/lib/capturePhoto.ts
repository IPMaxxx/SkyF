/**
 * Захват фото для фичи «Определение гриба по фото».
 *
 *  - native (iOS/Android через Capacitor) — открывает камеру устройства
 *    (`@capacitor/camera`, `Camera.getPhoto`, source Camera, quality 85);
 *  - web / PWA — фолбэк на `<input type="file" accept="image/*" capture>`.
 *
 * Возвращает `File` (удобно для превью через `URL.createObjectURL` и для
 * отправки в `FormData`) либо `null`, если пользователь отменил съёмку.
 */

import { isNativeApp } from "@/lib/native/capacitor";

const JPEG_QUALITY = 85;

export async function capturePhoto(): Promise<File | null> {
  if (isNativeApp()) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const photo = await Camera.getPhoto({
        quality: JPEG_QUALITY,
        source: CameraSource.Camera,
        resultType: CameraResultType.Uri,
        allowEditing: false,
        correctOrientation: true,
      });
      if (!photo.webPath) return null;
      const res = await fetch(photo.webPath);
      const blob = await res.blob();
      const type = blob.type || "image/jpeg";
      const ext = photo.format || (type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg");
      return new File([blob], `mushroom-${Date.now()}.${ext}`, { type });
    } catch {
      // Пользователь отменил съёмку или доступ к камере не выдан.
      return null;
    }
  }

  // Web-фолбэк: программный input с запросом задней камеры.
  return new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.style.display = "none";
    input.addEventListener(
      "change",
      () => {
        const f = input.files?.[0] ?? null;
        input.remove();
        resolve(f);
      },
      { once: true },
    );
    document.body.appendChild(input);
    input.click();
  });
}

/** Выбор фото из галереи (без принудительной камеры) — общий web/native путь. */
export async function pickPhotoFromGallery(): Promise<File | null> {
  if (isNativeApp()) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const photo = await Camera.getPhoto({
        quality: JPEG_QUALITY,
        source: CameraSource.Photos,
        resultType: CameraResultType.Uri,
        allowEditing: false,
        correctOrientation: true,
      });
      if (!photo.webPath) return null;
      const res = await fetch(photo.webPath);
      const blob = await res.blob();
      const type = blob.type || "image/jpeg";
      const ext = photo.format || (type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg");
      return new File([blob], `mushroom-${Date.now()}.${ext}`, { type });
    } catch {
      return null;
    }
  }

  return new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    input.addEventListener(
      "change",
      () => {
        const f = input.files?.[0] ?? null;
        input.remove();
        resolve(f);
      },
      { once: true },
    );
    document.body.appendChild(input);
    input.click();
  });
}
