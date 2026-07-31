#!/usr/bin/env node
/**
 * Панель «Ещё» Mushroom Checker: кадр целиком плюс увеличенные вырезки строк со
 * значками в цветных плитках — плитка без значка внутри читается как
 * недогрузившаяся картинка, и на кадре 393px это надо смотреть вблизи.
 *
 * Заодно печатает по каждой строке, что лежит в ведущем слоте (svg / img /
 * пусто) и какими цветами он нарисован: так «значок есть» проверяется не на
 * глаз, а по DOM.
 *
 * Подписку мокаем: локально нет SUPABASE_SERVICE_ROLE_KEY, а без ответа
 * /api/subscription строка тарифа рисуется в состоянии загрузки.
 *
 * Запуск: node scripts/capture-checker-more.mjs [origin]
 * Выход:  docs/checker-chrome/{dark,light}-{en,ru}-08-more.png
 *         /tmp/ck-more-zoom/*.png — вырезки для просмотра
 */
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/checker-chrome");
const ZOOM = "/tmp/ck-more-zoom";
const ORIGIN = process.argv[2] || "http://checker.localhost:3400";
const EMAIL = process.env.UI_FLOWS_EMAIL || "appreview@skyforest.ai";
const PASSWORD =
  process.env.UI_FLOWS_PASSWORD || "Sky#WswlragbAJk9OxYoofcR6kU9";

const VIEWPORT = { width: 393, height: 852 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HIDE_DEV_BADGE = "nextjs-portal { display: none !important }";

const SUBSCRIPTION = {
  subscription: {
    period: "yearly",
    is_trial: false,
    identify_limit: null,
    identify_used: 12,
    current_period_end: "2035-01-01T00:00:00.000Z",
  },
};

mkdirSync(OUT, { recursive: true });
mkdirSync(ZOOM, { recursive: true });

const browser = await chromium.launch();
const report = [];

for (const [theme, locale] of [
  ["dark", "en"],
  ["light", "en"],
  ["dark", "ru"],
]) {
  const tag = `${theme}-${locale}`;
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: locale === "ru" ? "ru-RU" : "en-GB",
  });
  await ctx.addCookies([{ name: "ck-theme", value: theme, url: ORIGIN }]);
  const page = await ctx.newPage();
  await page.route("**/api/subscription", (r) => r.fulfill({ json: SUBSCRIPTION }));
  await page.route("**/rest/v1/mushroom_identifications*", (r) =>
    r.fulfill({
      status: 200,
      headers: { "content-type": "application/json" },
      body: "[]",
    }),
  );

  await page.goto(`${ORIGIN}/${locale}/login`, { waitUntil: "domcontentloaded" });
  await sleep(2500);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[form="ck-login"]');
  await page.waitForURL(/dashboard/, { timeout: 30000 }).catch(() => {});
  await sleep(3500);

  await page.goto(`${ORIGIN}/${locale}/dashboard/history`, {
    waitUntil: "domcontentloaded",
  });
  await sleep(2500);
  await page.click("nav[aria-label] button");
  await sleep(900);
  await page.addStyleTag({ content: HIDE_DEV_BADGE }).catch(() => {});

  const file = `${tag}-08-more.png`;
  await page.screenshot({ path: join(OUT, file) });
  console.log(`✓ ${file}`);

  /** Что реально лежит в ведущем слоте каждой строки панели. */
  const rows = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return [];
    return [...dialog.querySelectorAll("a, button")]
      .filter((el) => el.querySelector("span span") || el.querySelector("img"))
      .map((el) => {
        const label = el.querySelector("span span")?.textContent?.trim() ?? "";
        const lead = el.firstElementChild;
        const box = lead?.getBoundingClientRect();
        const svg = lead?.querySelector("svg");
        const style = lead ? getComputedStyle(lead) : null;
        return {
          label,
          lead: svg ? "svg" : lead?.querySelector("img") ? "img" : "—",
          size: box ? `${Math.round(box.width)}×${Math.round(box.height)}` : "—",
          top: box ? Math.round(box.top) : null,
          bottom: box ? Math.round(box.bottom) : null,
          color: style?.color ?? "",
          background: style?.backgroundColor ?? "",
        };
      });
  });
  for (const r of rows) {
    report.push(
      `${tag} · «${r.label}» — слот: ${r.lead} ${r.size}, значок ${r.color} на ${r.background}`,
    );
  }

  /* Вырезка со всеми строками панели, увеличенная в три раза: видно, что в
     плитках именно рисунок, а не пустой квадрат. */
  const first = rows.find((r) => r.lead !== "—");
  const last = [...rows].reverse().find((r) => r.lead !== "—");
  if (first && last) {
    const pad = 26;
    const top = Math.max(0, first.top - pad);
    const height = Math.min(VIEWPORT.height - top, last.bottom + pad - top);
    await sharp(await page.screenshot())
      .extract({
        left: 0,
        top: top * 2,
        width: VIEWPORT.width * 2,
        height: height * 2,
      })
      .resize({ width: VIEWPORT.width * 3, kernel: "nearest" })
      .png()
      .toFile(join(ZOOM, `${tag}-rows.png`));
    console.log(`✓ zoom ${tag}-rows.png`);
  }

  await ctx.close();
}

await browser.close();
console.log("\n" + report.join("\n"));
