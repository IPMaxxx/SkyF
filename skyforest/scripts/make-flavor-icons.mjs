#!/usr/bin/env node
/**
 * Генерирует иконки-заглушки для флейворов Mushroom Checker и WayBack
 * (простые SVG-глифы на брендовом тёмно-зелёном фоне, растеризация sharp).
 *
 * Выход:
 *   public/icons/checker-{192,512}.png, wayback-{192,512}.png  — веб/манифест
 *   apps/mushroom-checker/resources/{icon.png,splash.png,splash-dark.png}
 *   apps/wayback/resources/{icon.png,splash.png,splash-dark.png}
 *   (icon 1024×1024, splash 2732×2732 — вход для @capacitor/assets)
 *
 * Запуск: node scripts/make-flavor-icons.mjs
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Гриб (Checker): шляпка + ножка + точки, в круге. */
const mushroomGlyph = `
  <circle cx="512" cy="512" r="380" fill="none" stroke="#8fd18f" stroke-width="34" opacity="0.35"/>
  <path d="M512 300c-140 0-232 92-232 190 0 26 20 44 48 44h368c28 0 48-18 48-44 0-98-92-190-232-190z"
        fill="#8fd18f"/>
  <path d="M448 550h128l-16 150c-2 26-22 44-48 44s-46-18-48-44l-16-150z" fill="#e8f0ea"/>
  <circle cx="440" cy="410" r="26" fill="#0f1a12" opacity="0.55"/>
  <circle cx="560" cy="380" r="20" fill="#0f1a12" opacity="0.55"/>
  <circle cx="600" cy="450" r="16" fill="#0f1a12" opacity="0.55"/>
`;

/** Компас (WayBack): круг + стрелка-иголка на северо-восток + точка центра. */
const compassGlyph = `
  <circle cx="512" cy="512" r="360" fill="none" stroke="#8fd18f" stroke-width="40"/>
  <path d="M672 352 L560 560 L464 464 Z" fill="#10b981"/>
  <path d="M464 464 L560 560 L352 672 Z" fill="#e8f0ea"/>
  <circle cx="512" cy="512" r="34" fill="#0f1a12" stroke="#8fd18f" stroke-width="14"/>
`;

function iconSvg(glyph, bg) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
    <rect width="1024" height="1024" rx="0" fill="${bg}"/>
    <radialGradient id="g" cx="50%" cy="35%" r="75%">
      <stop offset="0%" stop-color="#1c3524"/><stop offset="100%" stop-color="${bg}"/>
    </radialGradient>
    <rect width="1024" height="1024" fill="url(#g)"/>
    ${glyph}
  </svg>`);
}

function splashSvg(glyph, bg, label) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732">
    <rect width="2732" height="2732" fill="${bg}"/>
    <g transform="translate(1024, 900) scale(0.66)">${glyph}</g>
    <text x="1366" y="1780" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
          font-size="140" font-weight="700" fill="#e8f0ea">${label}</text>
  </svg>`);
}

async function build(name, glyph, label) {
  const bg = "#0f1a12";
  mkdirSync(join(root, "public/icons"), { recursive: true });
  for (const size of [192, 512]) {
    await sharp(iconSvg(glyph, bg))
      .resize(size, size)
      .png()
      .toFile(join(root, `public/icons/${name}-${size}.png`));
  }
  const resDir = join(root, `apps/${name === "checker" ? "mushroom-checker" : "wayback"}/resources`);
  mkdirSync(resDir, { recursive: true });
  await sharp(iconSvg(glyph, bg)).resize(1024, 1024).png().toFile(join(resDir, "icon.png"));
  const splash = await sharp(splashSvg(glyph, bg, label)).resize(2732, 2732).png().toBuffer();
  await sharp(splash).toFile(join(resDir, "splash.png"));
  await sharp(splash).toFile(join(resDir, "splash-dark.png"));
  console.log(`✓ ${name}`);
}

await build("checker", mushroomGlyph, "Mushroom Checker");
await build("wayback", compassGlyph, "WayBack");
