#!/usr/bin/env node
/**
 * Слои адаптивной иконки Android.
 *
 * @capacitor/assets кладёт в оба слоя одну и ту же картинку, а `ic_launcher.xml`
 * вписывает каждый слой в 16.7% поля. Для прежней тёмной плитки это сходило с
 * рук, но иконка с рисунком до края превращается в маленький квадрат внутри
 * круглой маски: фон не доходит до краёв, и вокруг остаётся пустое кольцо.
 *
 * Здесь фон перерисовывается во всю ширину холста — вертикальный градиент по
 * цвету верхнего и нижнего края самой иконки, — а инсет фона снимается в
 * разметке. Логотип остаётся в переднем слое внутри безопасной зоны
 * (66.6% ≈ 72dp из 108dp), поэтому маска любой формы его не режет, и по краю
 * растушёван, чтобы квадрат не читался швом на подложке.
 *
 * Запуск после `npm run icons`: node make-adaptive-icon.mjs
 */
import { readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const RES = join(HERE, "android/app/src/main/res");

const require = createRequire(resolve(HERE, "../../package.json"));
const sharp = require("sharp");

const icon = join(HERE, "resources/icon.png");

const densities = readdirSync(RES).filter(
  (d) => d.startsWith("mipmap-") && !d.endsWith("-v26"),
);

/**
 * Средний цвет полосы вдоль края иконки — по нему строится подложка.
 * Замер идёт по отдельному буферу: `stats()` в sharp считает по исходной
 * картинке и обрезку в том же конвейере не видит.
 */
async function edgeColor(top) {
  const { width, height } = await sharp(icon).metadata();
  const band = Math.round(height * 0.04);
  const strip = await sharp(icon)
    .extract({ left: 0, top: top ? 0 : height - band, width, height: band })
    .toBuffer();
  const stats = await sharp(strip).stats();
  const [r, g, b] = stats.channels.map((c) => Math.round(c.mean));
  return `rgb(${r},${g},${b})`;
}

const topColor = await edgeColor(true);
const bottomColor = await edgeColor(false);
console.log(`подложка: ${topColor} → ${bottomColor}`);

for (const density of densities) {
  const file = join(RES, density, "ic_launcher_background.png");
  const { width } = await sharp(file).metadata();
  const gradient = Buffer.from(
    `<svg width="${width}" height="${width}">
       <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stop-color="${topColor}"/>
         <stop offset="1" stop-color="${bottomColor}"/>
       </linearGradient></defs>
       <rect width="${width}" height="${width}" fill="url(#g)"/>
     </svg>`,
  );
  await sharp(gradient).png().toFile(file);
  console.log(`${density}/ic_launcher_background.png — ${width}px`);

  // Передний слой: плитка логотипа со скруглением из общей маски — тот же
  // силуэт, что у splash и что был у прежней иконки.
  const fgFile = join(RES, density, "ic_launcher_foreground.png");
  const { width: fgWidth } = await sharp(fgFile).metadata();
  const mask = await sharp(join(HERE, "resources/tile-mask.png"))
    .resize(fgWidth, fgWidth)
    .greyscale()
    .raw()
    .toBuffer();
  const art = await sharp(icon)
    .resize(fgWidth, fgWidth, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer();
  for (let p = 0; p < fgWidth * fgWidth; p++) art[p * 4 + 3] = mask[p];
  await sharp(art, { raw: { width: fgWidth, height: fgWidth, channels: 4 } })
    .png()
    .toFile(fgFile);
}

const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="16.7%" />
    </foreground>
</adaptive-icon>
`;

for (const name of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
  writeFileSync(join(RES, "mipmap-anydpi-v26", name), xml);
  console.log(`mipmap-anydpi-v26/${name}`);
}
