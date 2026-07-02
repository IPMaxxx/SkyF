/**
 * Server-side удаление метаданных EXIF (в т.ч. GPS) из JPEG перед отправкой в
 * сторонний сервис — приватность пользователя.
 *
 * Реализация без внешних зависимостей: проходим по сегментам JPEG и выбрасываем
 * APP1 (Exif/XMP, где хранятся GPS-координаты). Данные пикселей не трогаем.
 * Для не-JPEG (PNG/WebP) возвращаем как есть — телефоны снимают в JPEG, а GPS в
 * PNG/WebP встречается крайне редко.
 */

const SOI = 0xd8; // Start Of Image
const SOS = 0xda; // Start Of Scan (дальше — сжатые данные)
const EOI = 0xd9; // End Of Image
const APP1 = 0xe1; // Exif / XMP

export function stripJpegExif(input: Buffer): Buffer {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== SOI) {
    return input; // не JPEG — не трогаем
  }

  const parts: Buffer[] = [input.subarray(0, 2)]; // SOI
  let i = 2;

  while (i + 1 < input.length) {
    if (input[i] !== 0xff) {
      // Неожиданный байт — копируем остаток и выходим.
      parts.push(input.subarray(i));
      return Buffer.concat(parts);
    }

    const marker = input[i + 1];

    if (marker === SOS || marker === EOI) {
      // Со сканирования начинаются сжатые данные — копируем всё до конца.
      parts.push(input.subarray(i));
      return Buffer.concat(parts);
    }

    // Маркеры-заполнители (0xFF FF) — пропускаем один байт.
    if (marker === 0xff) {
      parts.push(input.subarray(i, i + 1));
      i += 1;
      continue;
    }

    if (i + 3 >= input.length) {
      parts.push(input.subarray(i));
      return Buffer.concat(parts);
    }

    const len = input.readUInt16BE(i + 2);
    const segEnd = i + 2 + len;
    if (len < 2 || segEnd > input.length) {
      // Повреждённая длина — безопасно копируем остаток.
      parts.push(input.subarray(i));
      return Buffer.concat(parts);
    }

    // Выбрасываем APP1 (Exif/XMP → GPS). Остальные сегменты сохраняем.
    if (marker !== APP1) {
      parts.push(input.subarray(i, segEnd));
    }
    i = segEnd;
  }

  return Buffer.concat(parts);
}
