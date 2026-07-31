#!/usr/bin/env node
/**
 * Скорость переключения нижних вкладок Mushroom Checker.
 *
 * Меряет для каждого перехода (Распознать → История → Квесты → Аккаунт →
 * Распознать) три величины от момента клика:
 *   active   — вкладка в меню подсветилась как текущая;
 *   frame    — на экране появился каркас нового раздела (скелетон loading.tsx
 *              или сразу контент), то есть старый экран уже ушёл;
 *   content  — виден настоящий контент раздела.
 *
 * Замеры снимаются в браузере по requestAnimationFrame, поэтому цифры совпадают
 * с тем, что видит глаз (кадр, а не сетевое событие).
 *
 * ВАЖНО: цифры сняты на `next dev`. В dev нет prefetch и каждый маршрут
 * компилируется по требованию, поэтому абсолютные значения завышены; сравнивать
 * имеет смысл «до» и «после» на одном и том же сервере.
 *
 * Локально нет SUPABASE_SERVICE_ROLE_KEY, поэтому `/api/subscription` и чтение
 * истории (PostgREST) подменяются — иначе экраны показывали бы ошибку.
 *
 * Запуск: node scripts/measure-checker-tabs.mjs [origin] [rounds]
 * Без скачанных браузеров playwright сгодится системный Chrome:
 * PW_CHANNEL=chrome node scripts/measure-checker-tabs.mjs
 */
import { chromium } from "playwright";

const ORIGIN = process.argv[2] || "http://checker.localhost:3400";
const ROUNDS = Number(process.argv[3] || 5);
const EMAIL = process.env.UI_FLOWS_EMAIL || "appreview@skyforest.ai";
const PASSWORD =
  process.env.UI_FLOWS_PASSWORD || "Sky#WswlragbAJk9OxYoofcR6kU9";

const VIEWPORT = { width: 393, height: 852 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SUBSCRIPTION = {
  subscription: {
    period: "yearly",
    is_trial: false,
    identify_limit: null,
    identify_used: 3,
    current_period_end: "2035-01-01T00:00:00.000Z",
  },
};

/** Порядок обхода: замкнутый круг, чтобы раунды повторялись без перезагрузок. */
const STEPS = [
  { key: "history", href: "/dashboard/history" },
  { key: "quests", href: "/dashboard/quests" },
  { key: "account", href: "/account" },
  { key: "identify", href: "/dashboard/identify" },
];

const median = (values) => {
  const sorted = [...values].filter((v) => v != null).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

/**
 * Ставит в страницу секундомер: `__t0` пишется перехватом клика в фазе
 * захвата, дальше каждый кадр проверяются признаки экранов.
 */
async function installProbe(page) {
  await page.evaluate(() => {
    const text = (h1) => (h1.textContent || "").trim();
    const hasHeading = (value) =>
      [...document.querySelectorAll("#main-content h1")].some(
        (h1) => text(h1) === value,
      );

    window.__screens = {
      identify: () => Boolean(document.querySelector(".ck-home-title")),
      history: () => hasHeading("History"),
      quests: () => hasHeading("Quests"),
      account: () => hasHeading("My account"),
    };

    window.__t0 = null;
    document.addEventListener(
      "click",
      () => {
        window.__t0 = performance.now();
      },
      true,
    );

    window.__watch = ({ from, to, href, timeout }) =>
      new Promise((resolve) => {
        const marks = { active: null, frame: null, skeleton: null, content: null };
        const deadline = performance.now() + timeout;
        const activeSelector = `nav a[href$="${href}"][aria-current="page"]`;
        const step = () => {
          const now = performance.now();
          if (marks.frame === null && !window.__screens[from]()) {
            marks.frame = now;
          }
          if (
            marks.skeleton === null &&
            document.querySelector("[data-ck-skeleton]")
          ) {
            marks.skeleton = now;
          }
          if (marks.active === null && document.querySelector(activeSelector)) {
            marks.active = now;
          }
          if (marks.content === null && window.__screens[to]()) {
            marks.content = now;
            if (marks.frame === null) marks.frame = now;
          }
          const done = marks.content !== null && marks.active !== null;
          if (done || now > deadline) {
            const t0 = window.__t0;
            const since = (mark) => (mark === null ? null : Math.round(mark - t0));
            resolve({
              active: since(marks.active),
              frame: since(marks.frame),
              skeleton: since(marks.skeleton),
              content: since(marks.content),
            });
            return;
          }
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
  });
}

/** Один переход: запускаем наблюдение, кликаем вкладку, забираем отметки. */
async function measureStep(page, from, step) {
  await page.evaluate(
    (args) => {
      window.__t0 = null;
      window.__result = window.__watch(args);
    },
    { from, to: step.key, href: step.href, timeout: 20000 },
  );

  await page.locator(`nav a[href$="${step.href}"]`).click();
  const marks = await page.evaluate(() => window.__result);
  // Данные экранов подтягиваются с клиента; ждём тишины перед следующим шагом.
  await sleep(900);
  return marks;
}

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL });
const ctx = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 2,
  locale: "en-GB",
});
const page = await ctx.newPage();

await page.route("**/api/subscription", (r) => r.fulfill({ json: SUBSCRIPTION }));
await page.route("**/rest/v1/mushroom_identifications*", (r) =>
  r.fulfill({
    status: 200,
    headers: { "content-type": "application/json" },
    body: "[]",
  }),
);

await page.goto(`${ORIGIN}/en/login`, { waitUntil: "domcontentloaded" });
await sleep(2000);
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[form="ck-login"]');
await page.waitForURL(/dashboard/, { timeout: 60000 }).catch(() => {});
await page.goto(`${ORIGIN}/en/dashboard/identify`, {
  waitUntil: "domcontentloaded",
});
await page.waitForSelector(".ck-home-title", { timeout: 60000 });
// Значок next dev висит в левом нижнем углу поверх меню и перехватывает клики.
await page.addStyleTag({ content: "nextjs-portal { display: none !important }" });
await sleep(1500);

await installProbe(page);

const results = new Map(STEPS.map((step) => [step.key, []]));

// Прогревочный круг: в dev первый заход в маршрут компилирует его на лету,
// такие секунды в медиану пускать нельзя.
let current = "identify";
for (const step of STEPS) {
  await measureStep(page, current, step);
  current = step.key;
}
console.log("warm-up done");

for (let round = 1; round <= ROUNDS; round += 1) {
  for (const step of STEPS) {
    const marks = await measureStep(page, current, step);
    current = step.key;
    results.get(step.key).push(marks);
    console.log(
      `round ${round} → ${step.key.padEnd(9)} active ${String(marks.active).padStart(5)}ms  frame ${String(marks.frame).padStart(5)}ms  content ${String(marks.content).padStart(5)}ms${marks.skeleton === null ? "" : `  (skeleton at ${marks.skeleton}ms)`}`,
    );
  }
}

console.log(`\nmedians of ${ROUNDS} rounds (next dev, ${ORIGIN})`);
console.log("tab        active   frame  content");
for (const step of STEPS) {
  const rows = results.get(step.key);
  const cell = (name) => String(median(rows.map((r) => r[name]))).padStart(6);
  console.log(
    `${step.key.padEnd(9)} ${cell("active")}  ${cell("frame")}  ${cell("content")}`,
  );
}
console.log(
  "\nfyi: next dev не делает prefetch, поэтому каркас из loading.tsx здесь\n" +
    "появляется только там, где сервер отвечает не сразу; в проде вкладки\n" +
    "префетчатся и каркас рисуется в первом же кадре.",
);

/**
 * Чем именно вкладка будет префетчиться в проде: запрос с заголовком
 * `Next-Router-Prefetch` возвращает дерево до границы Suspense, то есть каркас.
 * Если в ответе есть `data-ck-skeleton` — в проде он и нарисуется по тапу, ещё
 * до похода за данными.
 */
const prefetch = await page.evaluate(async (steps) => {
  const out = {};
  for (const step of steps) {
    const res = await fetch(`/en${step.href}`, {
      headers: { RSC: "1", "Next-Router-Prefetch": "1" },
    });
    const body = await res.text();
    out[step.key] = `${res.status} ${body.includes("data-ck-skeleton") ? "каркас в ответе" : "каркаса нет"}`;
  }
  return out;
}, STEPS);
console.log("\nprefetch-ответ маршрута:");
for (const [key, value] of Object.entries(prefetch)) {
  console.log(`${key.padEnd(9)} ${value}`);
}

await ctx.close();
await browser.close();
