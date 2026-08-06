#!/usr/bin/env node
/**
 * Путь покупки подписки: экран оплаты обязан кончаться исходом.
 *
 * 6 августа 2026 App Review отклонил WayBack по 2.1(a) с описанием «after we
 * successfully purchased the subscription, the app was still stuck on the
 * payment screen». Разобрать такое чтением кода нельзя: события приходят из
 * StoreKit, и на машине сборки его нет. Поэтому проверка гоняет путь покупки
 * целиком на поддельном сторе и поддельном Apple — без браузера и без телефона,
 * как соседние проверки.
 *
 * Настоящего кода в проверке два куска, и оба взяты, а не переписаны:
 *
 *  - src/lib/native/purchaseFlow.ts — цикл транзакции: кто ждёт покупку, что
 *    делать с одобренной транзакцией, когда её закрывать и с каким исходом
 *    ответить нажавшему кнопку;
 *  - src/lib/iap-store.ts — опрос App Store Server API, то есть решение
 *    «принять чек или отвергнуть».
 *
 * Всё остальное — модель: поддельный стор (события плагина), поддельный Apple
 * (транзакция лежит либо в продакшене, либо в песочнице), поддельный роут
 * проверки чека и поддельный гейт. Модель привязана к источникам утверждениями
 * в разделе «швы»: товары и тиры вычитываются из каталога, а не списаны сюда, и
 * расхождение ломает проверку, а не проходит молча.
 *
 * Положения — по одному на каждый отчёт, который надо закрыть:
 *
 *  1. Покупка одобрена, чек — из песочницы (так покупает App Review). Право
 *     обязано появиться, экран оплаты — сняться без перезапуска, транзакция —
 *     закрыться через finish().
 *  2. Транзакция приезжает уже одобренной при инициализации: гейт свою проверку
 *     к тому времени закончил. Экран обязан сняться всё равно.
 *  3. Проверка чека отвечает ошибкой. Человек обязан получить сообщение с
 *     причиной и возможность повторить; ожидание — кончиться.
 *  4. Стор молчит. Сторож обязан ответить, а не крутить спиннер вечно.
 *  5. Восстановление покупки возвращает право — в том числе когда сервер
 *     отвечает медленнее прежней фиксированной паузы.
 *  6. Восстанавливать нечего: об этом надо сказать прямо.
 *  7. Изоляция: право Mushroom Checker не открывает WayBack.
 *
 * Оба плеча обязательны: правило, которое ничего не ловит, хуже отсутствующего.
 * Прежние версии берутся не из `HEAD`, а поиском по истории самого файла — как
 * в .offline-map-skyforest-check.mjs. Плеч два, по файлу на причину:
 *   A) прежний src/lib/iap-store.ts — песочница по списку адресов;
 *   B) прежний src/lib/native/purchaseFlow.ts — цикл без сигнала о праве.
 *
 * Запуск из каталога skyforest:
 *   node fastlane/.iap-purchase-check.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const REPO = new URL("../../", import.meta.url).pathname;
const SRC = new URL("../src/", import.meta.url);

/** Пути от корня репозитория — ими же их знает git. */
const FLOW_REL = "skyforest/src/lib/native/purchaseFlow.ts";
const STORE_REL = "skyforest/src/lib/iap-store.ts";

/** Признаки правки: по ним ищется прежняя версия каждого файла. */
const FLOW_FIX = "function announceEntitlement";
const STORE_FIX = "function appleHosts";

const APPLE_SANDBOX = "https://api.storekit-sandbox.itunes.apple.com";

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `\n     ${detail}`}`);
};

/* ================================================================== */
/* Швы: модель привязана к источникам, а не списана с них              */
/* ================================================================== */

const read = (rel) => readFileSync(new URL(rel, SRC), "utf8");

/**
 * Каталог подписок — из самого каталога. Списанная сюда копия разошлась бы с
 * источником молча, а расхождение в productId — это ровно тот отказ, который
 * проверка и стережёт.
 */
function subscriptionCatalogue() {
  const source = read("lib/native/iapProducts.ts");
  const products = [];
  const re =
    /\{\s*productId:\s*"([^"]+)",\s*tier:\s*"([^"]+)",\s*period:\s*"([^"]+)",[\s\S]*?bundleId:\s*(\w+),?\s*\}/g;
  const bundles = Object.fromEntries(
    [...source.matchAll(/export const (\w+_BUNDLE_ID) = "([^"]+)";/g)].map((m) => [m[1], m[2]]),
  );
  for (const m of source.matchAll(re)) {
    products.push({ productId: m[1], tier: m[2], period: m[3], bundleId: bundles[m[4]] });
  }
  if (products.length === 0) {
    throw new Error("не разобрал SUBSCRIPTION_PRODUCTS в lib/native/iapProducts.ts — каталог переехал");
  }
  return products;
}

/** Какие тиры действуют в приложении — из lib/subscription.ts (TIER_FLAVOR). */
function tierFlavors() {
  const source = read("lib/subscription.ts");
  const block = source.match(/const TIER_FLAVOR[^=]*=\s*\{([\s\S]*?)\};/);
  if (!block) throw new Error("не нашёл TIER_FLAVOR в lib/subscription.ts — изоляция прав переехала");
  return Object.fromEntries([...block[1].matchAll(/(\w+):\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]));
}

const CATALOGUE = subscriptionCatalogue();
const TIER_FLAVOR = tierFlavors();
const WAYBACK = CATALOGUE.find((p) => p.tier === "wayback");
const CHECKER = CATALOGUE.find((p) => p.tier === "checker" && p.period === "yearly");

const tiersForFlavor = (flavor) =>
  Object.keys(TIER_FLAVOR).filter((tier) => TIER_FLAVOR[tier] === flavor);

console.log("— швы: модель говорит о том же, о чём источники —");
check(
  `товар WayBack есть в каталоге: ${WAYBACK?.productId} (${WAYBACK?.bundleId})`,
  Boolean(WAYBACK) && WAYBACK.bundleId === "ai.skyforest.wayback" && WAYBACK.period === "yearly",
  `разобрано товаров: ${CATALOGUE.length}`,
);
check(
  `тир wayback действует только в WayBack: ${tiersForFlavor("wayback").join(", ")}`,
  tiersForFlavor("wayback").join(",") === "wayback" && TIER_FLAVOR.checker === "checker",
  JSON.stringify(TIER_FLAVOR),
);
{
  // Цикл транзакции подключён к плагину именно теми обработчиками, которые
  // гоняет проверка: иначе она проверяла бы модуль, не участвующий в покупке.
  const iap = read("lib/native/iap.ts");
  check(
    "iap.ts отдаёт события плагина в purchaseFlow (approved/finished)",
    /\.approved\(\((\w+): PurchaseTransaction\) => void flow\.approved\(\1\)\)/.test(iap) &&
      /\.finished\(\((\w+): PurchaseTransaction\) => flow\.finished\(\1\)\)/.test(iap),
  );
  check(
    "заказ товара идёт через flow.order с offer.order()",
    /flow\.order\(\{[\s\S]*?place: \(\) => offer\.order\(\)/.test(iap),
  );
  check(
    "восстановление ждёт подтверждения права, а не фиксированной паузы",
    /flow\.waitForEntitlement\(RESTORE_WAIT_MS\)/.test(iap) &&
      !/RESTORE_SETTLE_MS/.test(read("lib/wayback/useWaybackPurchase.ts")),
  );
  // Право обязано доходить до экрана без перезапуска: гейт и пейволл держат
  // подписку через useWaybackPurchase.
  const hook = read("lib/wayback/useWaybackPurchase.ts");
  check(
    "экраны WayBack подписаны на появление права (onIapEntitlement)",
    /onIapEntitlement\(\(\) =>/.test(hook) && /entitledRef\.current\(\)/.test(hook),
  );
  // Подпись кнопки больше не может оказаться текстом ошибки.
  check(
    "на месте причины отказа стоит сообщение об ошибке, а не подпись кнопки",
    /purchaseFailed/.test(read("components/wayback/WayBackStartGate.tsx")) &&
      /purchaseFailed/.test(read("components/wayback/WayBackPaywall.tsx")) &&
      !/useWaybackPurchase\([^)]*"cta"/.test(read("components/wayback/WayBackStartGate.tsx")),
  );
}
{
  // Роут проверки чека: модель отвечает 402 там же, где он.
  const route = read("app/api/native/iap/verify-subscription/route.ts");
  check(
    "роут проверки подписки спрашивает статус у getAppleSubscription",
    /await getAppleSubscription\(transactionId, productId, product\.bundleId\)/.test(route),
  );
  check(
    "не найденный у Apple чек роут отклоняет как 402",
    /!state \|\| state\.productId !== productId[\s\S]{0,400}status: 402/.test(route),
  );
  check(
    "списка адресов для песочницы в роутах больше нет",
    !/sandboxAllowed|REVIEW_SANDBOX_EMAILS|IAP_SANDBOX_ALLOWLIST/.test(route) &&
      !/sandboxAllowed/.test(read("app/api/native/iap/verify/route.ts")),
  );
}

/* ================================================================== */
/* Прежние версии файлов                                              */
/* ================================================================== */

const TEMP = mkdtempSync(join(tmpdir(), "iap-check-"));

/** Ближайшая версия файла по его истории, в которой ещё нет признака правки. */
function loadBeforeFix(rel, marker, name) {
  const revs = execFileSync("git", ["rev-list", "HEAD", "--", rel], { encoding: "utf8", cwd: REPO })
    .trim()
    .split("\n")
    .filter(Boolean);
  for (const rev of revs) {
    const text = execFileSync("git", ["show", `${rev}:${rel}`], { encoding: "utf8", cwd: REPO });
    if (!text.includes(marker)) {
      const file = join(TEMP, `${name}-${rev.slice(0, 7)}.ts`);
      writeFileSync(file, text);
      return { rev, file, text };
    }
  }
  throw new Error(`в истории ${rel} нет версии без «${marker}» — сверьте признак правки`);
}

/* ================================================================== */
/* Поддельный Apple + поддельный роут проверки чека                    */
/* ================================================================== */

const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
process.env.APPLE_IAP_KEY_ID = "TESTKEYID";
process.env.APPLE_IAP_ISSUER_ID = "test-issuer";
process.env.APPLE_IAP_PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
delete process.env.APPLE_IAP_ENV;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64");

/**
 * Apple, у которого транзакции живут в заданном окружении. Ревьюер покупает в
 * песочнице: продакшен-хост про такую транзакцию отвечает 404 — именно так
 * ведёт себя App Store Server API.
 */
function fakeApple({ environment = "sandbox", latencyMs = 0 } = {}) {
  const asked = [];
  const transactions = new Map();
  const api = {
    asked,
    /** Положить подписку в стор: она станет видна в своём окружении. */
    put(transactionId, { productId, bundleId, accountRef, expiresInMs = 3 * 86_400_000, trial = true }) {
      transactions.set(transactionId, {
        bundleId,
        productId,
        appAccountToken: accountRef,
        originalTransactionId: `otx-${transactionId}`,
        purchaseDate: Date.now(),
        expiresDate: Date.now() + expiresInMs,
        offerDiscountType: trial ? "FREE_TRIAL" : null,
      });
    },
    async fetch(url) {
      const { origin, pathname } = new URL(String(url));
      asked.push(origin === APPLE_SANDBOX ? "sandbox" : "production");
      if (latencyMs) await new Promise((done) => setTimeout(done, latencyMs));
      const id = decodeURIComponent(pathname.split("/").pop());
      const visible = origin === APPLE_SANDBOX ? environment === "sandbox" : environment === "production";
      const info = transactions.get(id);
      if (!visible || !info) return { status: 404, ok: false, json: async () => ({}) };
      return {
        status: 200,
        ok: true,
        json: async () => ({
          data: [{ lastTransactions: [{ status: 1, signedTransactionInfo: `header.${b64(info)}.sig` }] }],
        }),
      };
    },
  };
  return api;
}

/**
 * Наш сервер: роут /api/native/iap/verify-subscription плюс /api/subscription.
 * Решение «принять чек» принимает настоящий iap-store.ts, а не проверка.
 */
function fakeServer({ apple, getAppleSubscription, legacyStoreArgs = false, userId = "user-1", failWith = null }) {
  /** Таблица user_subscriptions: тир — единственная привязка права к продукту. */
  const rows = [];
  const server = {
    rows,
    calls: 0,
    /** Что вернёт /api/native/iap/verify-subscription. */
    async verifySubscription({ productId, transactionId }) {
      server.calls += 1;
      if (failWith) return { status: failWith, ok: false };
      const product = CATALOGUE.find((p) => p.productId === productId);
      if (!product) return { status: 400, ok: false };
      const previousFetch = globalThis.fetch;
      globalThis.fetch = apple.fetch;
      let state;
      try {
        // Прежняя подпись принимала признак «песочница разрешена». В продакшене
        // для учётной записи вне списка адресов он равнялся false — ровно это и
        // получил ревьюер.
        state = legacyStoreArgs
          ? await getAppleSubscription(transactionId, false, productId, product.bundleId)
          : await getAppleSubscription(transactionId, productId, product.bundleId);
      } finally {
        globalThis.fetch = previousFetch;
      }
      if (!state || state.productId !== productId) return { status: 402, ok: false };
      if (state.status === "expired" || !state.expiresMs || state.expiresMs <= Date.now()) {
        return { status: 402, ok: false };
      }
      const existing = rows.find((r) => r.product_id === productId && r.user_id === userId);
      const row = {
        user_id: userId,
        product_id: productId,
        tier: product.tier,
        status: state.status,
        current_period_end: new Date(state.expiresMs).toISOString(),
      };
      if (existing) Object.assign(existing, row);
      else rows.push(row);
      return { status: 200, ok: true };
    },
    /** Что вернёт GET /api/subscription на домене этого приложения. */
    subscription(flavor) {
      const allowed = tiersForFlavor(flavor);
      const found = rows.find(
        (r) =>
          r.user_id === userId &&
          allowed.includes(r.tier) &&
          new Date(r.current_period_end).getTime() > Date.now(),
      );
      return found ? { current_period_end: found.current_period_end } : null;
    },
    /** Право, выданное вручную (демо-аккаунт ревью или подписка другого приложения). */
    grant(tier) {
      rows.push({
        user_id: userId,
        product_id: `manual-${tier}`,
        tier,
        status: "active",
        current_period_end: new Date(Date.now() + 86_400_000).toISOString(),
      });
    },
  };
  return server;
}

/* ================================================================== */
/* Поддельный стор (cordova-plugin-purchase) и поддельный гейт          */
/* ================================================================== */

/**
 * Стор плагина ровно в той части, которой касается цикл покупки: подписка на
 * approved/finished, заказ товара, очередь транзакций при инициализации и
 * восстановление покупок.
 */
function fakeStore({ productId, orderTx = "tx-1", orderRejects = null, silent = false, queued = [], owned = [] }) {
  let onApproved = () => {};
  let onFinished = () => {};
  const state = { finished: [], approvedDelivered: 0 };

  const transaction = (id) => {
    const tx = {
      products: [{ id: productId }],
      transactionId: id,
      finish() {
        state.finished.push(id);
        // Плагин присылает finished вслед за finish() — иногда (на iOS 13.x
        // бывает, что не присылает; цикл на это событие не опирается).
        onFinished(tx);
      },
    };
    return tx;
  };

  const deliver = (id) => {
    state.approvedDelivered += 1;
    return onApproved(transaction(id));
  };

  return {
    state,
    when: (a, f) => {
      onApproved = a;
      onFinished = f;
    },
    /** Очередь StoreKit при старте: транзакции, о которых мы ещё не знали. */
    async initialize() {
      for (const id of queued) await deliver(id);
    },
    async order() {
      if (orderRejects) throw orderRejects;
      // Стор, который молчит: оплата ушла, событий нет (зависшая транзакция).
      if (silent) return;
      setTimeout(() => void deliver(orderTx), 5);
    },
    async restorePurchases() {
      for (const id of owned) setTimeout(() => void deliver(id), 5);
    },
  };
}

/**
 * Гейт WayBack, каким его видит человек: «подписки нет» → экран оплаты,
 * «право есть» → приложение. Решение — по current_period_end из
 * /api/subscription, как в lib/wayback/entitlement.ts.
 */
function fakeGate(server, flavor = "wayback") {
  const gate = {
    status: "resolving",
    rechecks: 0,
    async recheck() {
      gate.rechecks += 1;
      gate.status = server.subscription(flavor) ? "allowed" : "needSubscription";
    },
  };
  return gate;
}

/**
 * Приложение целиком: стор + цикл покупки + сервер + гейт, связанные так же,
 * как их связывают iap.ts и useWaybackPurchase.
 */
function app({ createPurchaseFlow, server, store, productId = WAYBACK.productId, flavor = "wayback" }) {
  const log = [];
  const flow = createPurchaseFlow({
    verify: async (id, tx) => {
      const res = await server.verifySubscription({ productId: id, transactionId: tx.transactionId });
      return { ok: res.status === 200 && res.ok === true, permanent: res.status === 402 || res.status === 403 };
    },
    log: (stage, details) => log.push({ stage, ...details }),
    tokensFor: () => null,
    isSubscription: (id) => CATALOGUE.some((p) => p.productId === id),
  });
  store.when(
    (tx) => flow.approved(tx),
    (tx) => flow.finished(tx),
  );

  const gate = fakeGate(server, flavor);
  const screen = { error: "", nothingRestored: false, purchasing: false };

  // Ровно то, что делает useWaybackPurchase: право, подтверждённое сервером,
  // перечитывает статус — от кнопки оно пришло или из очереди StoreKit.
  if (typeof flow.onEntitlement === "function") {
    flow.onEntitlement(() => {
      screen.error = "";
      screen.nothingRestored = false;
      void gate.recheck();
    });
  }

  const messages = {
    cancelled: "Покупка отменена",
    alreadyOwned: "Предыдущая покупка не проведена",
    storeTimeout: "Магазин не ответил",
    verifyRejected: "Оплата прошла, но магазин не подтвердил покупку",
    verifyRetry: "Оплата прошла, но подтвердить её не получилось — повторите",
  };
  /** Подпись кнопки: она НЕ должна оказаться текстом ошибки. */
  const CTA = "Начать 3 бесплатных дня";

  return {
    flow,
    gate,
    screen,
    log,
    messages,
    CTA,
    /** Нажатие «Начать пробный период». */
    async subscribe({ timeoutMs = 400 } = {}) {
      screen.purchasing = true;
      const outcome = await flow.order({
        productId,
        place: () => store.order(),
        timeoutMs,
        messages,
      });
      screen.purchasing = false;
      if (outcome.ok) await gate.recheck();
      else screen.error = outcome.error || CTA;
      return outcome;
    },
    /** Нажатие «Восстановить покупки», как его делает restorePurchases(). */
    async restore({ waitMs = 6000, legacySettleMs = null } = {}) {
      let found;
      if (legacySettleMs != null) {
        // Как было: слепая пауза, затем перечитывание статуса, а сам исход
        // восстановления коду неизвестен — плагин лишь не бросил исключение.
        await store.restorePurchases();
        await new Promise((done) => setTimeout(done, legacySettleMs));
        found = true;
      } else {
        const entitled = flow.waitForEntitlement(waitMs);
        await store.restorePurchases();
        found = await entitled;
      }
      await gate.recheck();
      screen.nothingRestored = !server.subscription(flavor);
      return found;
    },
  };
}

/* ================================================================== */
/* Положения                                                          */
/* ================================================================== */

/**
 * @param {object} deps
 * @param {Function} deps.createPurchaseFlow цикл транзакции (текущий или прежний)
 * @param {Function} deps.getAppleSubscription опрос Apple (текущий или прежний)
 * @param {boolean} deps.legacyStoreArgs у прежнего iap-store была подпись с allowSandbox
 * @param {boolean} deps.legacyRestore у прежнего цикла не было сигнала о праве
 */
const CASES = [
  {
    id: "покупка в песочнице",
    title: "ревьюер купил подписку сам (чек из песочницы) — право появилось без перезапуска",
    async run(deps) {
      const apple = fakeApple({ environment: "sandbox" });
      const server = fakeServer({ ...deps, apple });
      const store = fakeStore({ productId: WAYBACK.productId });
      const a = app({ ...deps, server, store });
      await a.gate.recheck();
      const before = a.gate.status;
      apple.put("tx-1", { productId: WAYBACK.productId, bundleId: WAYBACK.bundleId, accountRef: "user-1" });
      const outcome = await a.subscribe();
      return { a, outcome, before, apple, store, server };
    },
    verify({ a, outcome, before, apple, store }) {
      check(`${this.id}: до покупки экран оплаты («${before}»)`, before === "needSubscription");
      check(`${this.id}: покупка завершилась успехом`, outcome.ok === true, JSON.stringify(outcome));
      check(`${this.id}: экран оплаты снят без перезапуска («${a.gate.status}»)`, a.gate.status === "allowed");
      check(`${this.id}: транзакция закрыта через finish()`, store.state.finished.length === 1, `finish(): ${store.state.finished.join(", ") || "не вызван"}`);
      check(
        `${this.id}: Apple опрошен в порядке продакшен → песочница (${apple.asked.join(" → ")})`,
        apple.asked[0] === "production" && apple.asked.includes("sandbox"),
      );
      check(`${this.id}: право записано с тиром wayback`, a.gate.rechecks >= 1 && Boolean(a.screen.error === ""));
    },
    // Чек ревьюера отвергался серверной проверкой — причина в iap-store.ts.
    regressionIn: ["iap-store"],
    /** До правки: экран оплаты остался на месте. */
    broken: ({ a, outcome }) => a.gate.status !== "allowed" || outcome.ok !== true,
    report: ({ a, outcome }) =>
      `исход покупки ok=${outcome.ok}, гейт «${a.gate.status}», сообщение «${a.screen.error || "нет"}»`,
  },
  {
    id: "транзакция при старте",
    title: "транзакция приезжает уже одобренной при инициализации, гейт свою проверку закончил",
    async run(deps) {
      const apple = fakeApple({ environment: "sandbox" });
      const server = fakeServer({ ...deps, apple });
      apple.put("queued-1", { productId: WAYBACK.productId, bundleId: WAYBACK.bundleId, accountRef: "user-1" });
      const store = fakeStore({ productId: WAYBACK.productId, queued: ["queued-1"] });
      const a = app({ ...deps, server, store });
      // Порядок как в жизни: гейт решает раньше, чем StoreKit отдаёт очередь.
      await a.gate.recheck();
      const before = a.gate.status;
      await store.initialize();
      await new Promise((done) => setTimeout(done, 50));
      return { a, before, store };
    },
    verify({ a, before, store }) {
      check(`${this.id}: гейт успел решить «нет подписки» до очереди`, before === "needSubscription");
      check(`${this.id}: транзакция из очереди доставлена`, store.state.approvedDelivered === 1);
      check(
        `${this.id}: экран оплаты снят без перезапуска («${a.gate.status}»)`,
        a.gate.status === "allowed",
        `перечитываний статуса: ${a.gate.rechecks}`,
      );
      check(`${this.id}: транзакция закрыта через finish()`, store.state.finished.length === 1);
    },
    // Обе причины сходятся здесь: чек отвергался, а о принятом никто не узнавал.
    regressionIn: ["iap-store", "purchaseFlow"],
    broken: ({ a }) => a.gate.status !== "allowed",
    report: ({ a }) => `гейт «${a.gate.status}», перечитываний статуса ${a.gate.rechecks}`,
  },
  {
    id: "проверка чека упала",
    title: "серверная проверка отвечает ошибкой — сообщение и возможность повторить",
    async run(deps) {
      const apple = fakeApple({ environment: "sandbox" });
      apple.put("tx-1", { productId: WAYBACK.productId, bundleId: WAYBACK.bundleId, accountRef: "user-1" });
      // Первая попытка — 500 (сервер недоступен), вторая — как обычно.
      const server = fakeServer({ ...deps, apple, failWith: 500 });
      const store = fakeStore({ productId: WAYBACK.productId });
      const a = app({ ...deps, server, store });
      await a.gate.recheck();
      const began = Date.now();
      const first = await a.subscribe();
      const elapsed = Date.now() - began;
      const message = a.screen.error;
      // Повтор: сервер поднялся, кнопка снова активна.
      const healthy = fakeServer({ ...deps, apple });
      const retryStore = fakeStore({ productId: WAYBACK.productId });
      const b = app({ ...deps, server: healthy, store: retryStore });
      const second = await b.subscribe();
      return { a, b, first, second, elapsed, message };
    },
    verify({ a, b, first, second, elapsed, message }) {
      check(`${this.id}: покупка кончилась отказом, а не ожиданием (${elapsed} мс)`, first.ok === false && elapsed < 350);
      check(`${this.id}: спиннер погашен`, a.screen.purchasing === false);
      check(`${this.id}: причина названа («${message}»)`, Boolean(first.error) && message === a.messages.verifyRetry);
      check(`${this.id}: подпись кнопки не подставлена вместо причины`, message !== a.CTA, `на экране «${message}»`);
      check(`${this.id}: экран оплаты остался, тупика нет`, a.gate.status === "needSubscription");
      check(`${this.id}: повтор проходит и снимает экран («${b.gate.status}»)`, second.ok === true && b.gate.status === "allowed");
    },
    // Отказ без причины — свойство самого цикла.
    regressionIn: ["purchaseFlow"],
    broken: ({ first, message, a }) => !first.error || message === a.CTA,
    report: ({ first, message }) =>
      `исход ok=${first.ok}, error=${first.error === undefined ? "не задан" : `«${first.error}»`}, на экране «${message}»`,
  },
  {
    id: "стор молчит",
    title: "стор принял заказ и не присылает событий — сторож отвечает, а не крутит спиннер",
    async run(deps) {
      const apple = fakeApple({ environment: "sandbox" });
      const server = fakeServer({ ...deps, apple });
      const store = fakeStore({ productId: WAYBACK.productId, silent: true });
      const a = app({ ...deps, server, store });
      await a.gate.recheck();
      const began = Date.now();
      const outcome = await a.subscribe({ timeoutMs: 120 });
      return { a, outcome, elapsed: Date.now() - began };
    },
    verify({ a, outcome, elapsed }) {
      check(`${this.id}: ожидание кончилось (${elapsed} мс)`, elapsed < 1000);
      check(`${this.id}: исход назван`, outcome.ok === false && outcome.error === a.messages.storeTimeout, JSON.stringify(outcome));
      check(`${this.id}: спиннер погашен`, a.screen.purchasing === false);
    },
    // Сторож был и до правки: положение стережёт, чтобы правка его не сняла.
    regressionIn: [],
    report: ({ outcome, elapsed }) => `исход ${JSON.stringify(outcome)} за ${elapsed} мс`,
  },
  {
    id: "восстановление",
    title: "«Восстановить покупки» возвращает право, даже когда сервер отвечает медленно",
    async run(deps) {
      // Сервер медленнее прежней слепой паузы в 2.5 с (здесь — в масштабе
      // проверки: 120 мс против 60 мс), то есть ровно тот случай, в котором
      // угаданная пауза истекала до ответа.
      const apple = fakeApple({ environment: "sandbox", latencyMs: 120 });
      apple.put("owned-1", { productId: WAYBACK.productId, bundleId: WAYBACK.bundleId, accountRef: "user-1" });
      const server = fakeServer({ ...deps, apple });
      const store = fakeStore({ productId: WAYBACK.productId, owned: ["owned-1"] });
      const a = app({ ...deps, server, store });
      await a.gate.recheck();
      const before = a.gate.status;
      const found = deps.legacyRestore
        ? await a.restore({ legacySettleMs: 60 })
        : await a.restore({ waitMs: 3000 });
      return { a, found, before };
    },
    verify({ a, found, before }) {
      check(`${this.id}: до восстановления экран оплаты («${before}»)`, before === "needSubscription");
      check(`${this.id}: восстановление сообщило об успехе`, found === true);
      check(`${this.id}: право вернулось, экран снят («${a.gate.status}»)`, a.gate.status === "allowed");
      check(`${this.id}: «ничего не нашлось» не показано`, a.screen.nothingRestored === false);
    },
    // Чек отвергался (iap-store), а угаданная пауза истекала до ответа (цикл).
    regressionIn: ["iap-store", "purchaseFlow"],
    broken: ({ a, found }) => a.gate.status !== "allowed" || found !== true,
    report: ({ a, found }) =>
      `восстановление вернуло ${found}, гейт «${a.gate.status}», «ничего не нашлось» ${a.screen.nothingRestored}`,
  },
  {
    id: "нечего восстанавливать",
    title: "восстанавливать нечего — об этом сказано прямо",
    async run(deps) {
      const apple = fakeApple({ environment: "sandbox" });
      const server = fakeServer({ ...deps, apple });
      const store = fakeStore({ productId: WAYBACK.productId, owned: [] });
      const a = app({ ...deps, server, store });
      await a.gate.recheck();
      const found = deps.legacyRestore ? await a.restore({ legacySettleMs: 60 }) : await a.restore({ waitMs: 150 });
      return { a, found };
    },
    verify({ a, found }) {
      check(`${this.id}: восстановление ответило «не нашлось»`, found === false);
      check(`${this.id}: экран сказал об этом`, a.screen.nothingRestored === true);
      check(`${this.id}: экран оплаты на месте`, a.gate.status === "needSubscription");
    },
    // Прежний код отвечал «восстановили» всегда, когда плагин не бросил.
    regressionIn: ["purchaseFlow"],
    broken: ({ found }) => found !== false,
    report: ({ found, a }) => `восстановление вернуло ${found}, «ничего не нашлось» ${a.screen.nothingRestored}`,
  },
  {
    id: "изоляция",
    title: "право Mushroom Checker не открывает WayBack (и наоборот)",
    async run(deps) {
      const apple = fakeApple({ environment: "sandbox" });
      apple.put("ck-1", { productId: CHECKER.productId, bundleId: CHECKER.bundleId, accountRef: "user-1" });
      const server = fakeServer({ ...deps, apple });
      // Подписка куплена в Checker — той же учётной записью.
      const ckStore = fakeStore({ productId: CHECKER.productId, orderTx: "ck-1" });
      const ck = app({ ...deps, server, store: ckStore, productId: CHECKER.productId, flavor: "checker" });
      const bought = await ck.subscribe();
      // WayBack смотрит на ту же учётную запись.
      const wbStore = fakeStore({ productId: WAYBACK.productId });
      const wb = app({ ...deps, server, store: wbStore });
      await wb.gate.recheck();
      return { ck, wb, bought, server };
    },
    verify({ ck, wb, bought, server }) {
      check(`${this.id}: подписка Checker куплена и открыла Checker`, bought.ok === true && ck.gate.status === "allowed");
      check(
        `${this.id}: WayBack остался на экране оплаты («${wb.gate.status}»)`,
        wb.gate.status === "needSubscription",
        `тиры в таблице: ${server.rows.map((r) => r.tier).join(", ")}`,
      );
      check(
        `${this.id}: право WayBack тоже не открывает Checker`,
        (() => {
          server.rows.length = 0;
          server.grant("wayback");
          return server.subscription("checker") === null && server.subscription("wayback") !== null;
        })(),
      );
    },
    // Изоляция не была сломана — положение стережёт, чтобы правка её не сломала.
    regressionIn: [],
    report: ({ wb, server }) => `гейт WayBack «${wb.gate.status}», тиры ${server.rows.map((r) => r.tier).join(", ") || "нет"}`,
  },
];

/* ================================================================== */
/* Прогон                                                             */
/* ================================================================== */

const current = {
  createPurchaseFlow: (await import(new URL("lib/native/purchaseFlow.ts", SRC).href)).createPurchaseFlow,
  getAppleSubscription: (await import(new URL("lib/iap-store.ts", SRC).href)).getAppleSubscription,
  legacyStoreArgs: false,
  legacyRestore: false,
};

console.log("\n— как есть сейчас —");
for (const c of CASES) {
  console.log(`  · ${c.title}`);
  c.verify(await c.run(current));
}

/**
 * Плечо «до правки»: те же положения на прежней версии одного из файлов.
 *
 * Ждём отказа не во всех положениях, а ровно в тех, чью причину этот файл и
 * содержал (`regressionIn`). Иначе плечо пришлось бы мерить по слабейшему
 * положению, и правка одной причины замаскировала бы вторую.
 */
async function arm(name, rel, marker, deps) {
  const before = loadBeforeFix(rel, marker, name);
  const loaded = await import(pathToFileURL(before.file).href);
  console.log(`\n— плечо «${name}»: ${rel.replace("skyforest/", "")} @ ${before.rev.slice(0, 7)} —`);
  const withOld = { ...current, ...deps(loaded) };
  let caught = 0;
  let expected = 0;
  for (const c of CASES) {
    const mine = c.regressionIn.includes(name);
    let result;
    try {
      result = await c.run(withOld);
    } catch (e) {
      // Прежний код не умел того, что нужно новому экрану, — это тоже отказ.
      if (mine) {
        expected += 1;
        caught += 1;
      }
      console.log(`  ${mine ? "ok  " : "··  "} ${c.id}: до правки путь обрывается — ${e.message}`);
      continue;
    }
    if (!mine) {
      console.log(`  ··   ${c.id}: причина не в этом файле — ${c.report(result)}`);
      continue;
    }
    expected += 1;
    const broken = c.broken(result);
    if (broken) caught += 1;
    console.log(
      `  ${broken ? "ok  " : "FAIL"} ${c.id}: до правки ${broken ? "отказ воспроизводится" : "проверка ничего не ловит"} — ${c.report(result)}`,
    );
  }
  return { caught, expected, rev: before.rev };
}

// A) Прежний iap-store.ts: песочница разрешалась по списку адресов, поэтому чек
//    ревьюера отвергался с 402 — на нём валится всё, что требует покупки.
const armA = await arm("iap-store", STORE_REL, STORE_FIX, (loaded) => ({
  getAppleSubscription: loaded.getAppleSubscription,
  legacyStoreArgs: true,
}));
check(
  `песочница по списку адресов: отказ воспроизводится (${armA.caught}/${armA.expected})`,
  armA.caught === armA.expected,
);

// B) Прежний purchaseFlow.ts: цикл не сообщал о появлении права и отвечал
//    отказом без причины.
const armB = await arm("purchaseFlow", FLOW_REL, FLOW_FIX, (loaded) => ({
  createPurchaseFlow: loaded.createPurchaseFlow,
  legacyRestore: true,
}));
check(
  `цикл без сигнала о праве: отказ воспроизводится (${armB.caught}/${armB.expected})`,
  armB.caught === armB.expected,
);

console.log(failures === 0 ? "\nвсе проверки прошли" : `\nпровалено проверок: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
