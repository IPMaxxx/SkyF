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
 * Положения 1–3, 5 и 6 проверяются дважды: у WayBack и у Mushroom Checker. Общий
 * путь покупки у них один, а связан он с экраном у каждого свой, и разъехаться
 * этой связке ничто не мешает — Checker и разъехался, оставшись со слепой паузой
 * на восстановлении и без подписки на сигнал о праве. Тупика, как в WayBack, у
 * него нет (приложение работает и без подписки), но купивший подписку человек
 * мог остаться без неё до перезапуска.
 *
 * Оба плеча обязательны: правило, которое ничего не ловит, хуже отсутствующего.
 * Прежние версии берутся не из `HEAD`, а поиском по истории самого файла — как
 * в .offline-map-skyforest-check.mjs. Плеч три, по файлу на причину:
 *   A) прежний src/lib/iap-store.ts — песочница по списку адресов;
 *   B) прежний src/lib/native/purchaseFlow.ts — цикл без сигнала о праве;
 *   C) прежний экран оплаты Checker — слепая пауза на восстановлении и никакой
 *      подписки на сигнал о праве. Плечо C берёт не модуль, а исходники экрана
 *      на той же ревизии: связка экрана с общим циклом видна только в них,
 *      и модель поведения экрана собирается из них же (см. checkerWiring).
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

/**
 * Экран оплаты Mushroom Checker: компонент, его путь покупки и состояние
 * подписки. Три файла, потому что связка живёт в трёх: кнопка — в компоненте,
 * исход покупки и восстановления — в хуке, перечитывание статуса по сигналу о
 * праве — в состоянии подписки (оно живёт на всех экранах приложения, а
 * транзакция из очереди StoreKit приезжает неизвестно на каком).
 */
const CK_SCREEN_REL = "skyforest/src/components/checker/CheckerPaywall.tsx";
const CK_HOOK_REL = "skyforest/src/lib/checker/useCheckerPurchase.ts";
const CK_STATE_REL = "skyforest/src/lib/checker/useSubscription.ts";

/** Признаки правки: по ним ищется прежняя версия каждого файла. */
const FLOW_FIX = "function announceEntitlement";
const STORE_FIX = "function appleHosts";
const CK_SCREEN_FIX = "useCheckerPurchase";

/**
 * Масштаб проверки: прежняя слепая пауза восстановления (2.5 с) превращается в
 * 60 мс, а поддельный Apple отвечает за 120 мс. Это ровно тот случай, из-за
 * которого угаданная пауза и негодна: на медленной связи она истекала до ответа
 * сервера, и восстановление выглядело неудачным при живой подписке.
 */
const SCREEN_SCALE = 2500 / 60;
const RESTORE_LATENCY_MS = 120;
const scaledPause = (ms) => Math.max(1, Math.round(ms / SCREEN_SCALE));

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

/** То же, но «файла нет» — это пустота: связка от этого станет неполной, и швы это скажут. */
const readOrEmpty = (rel) => {
  try {
    return read(rel);
  } catch {
    return "";
  }
};

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

/**
 * Чем связан путь покупки Checker с общим циклом — по его же исходникам.
 *
 * Модель экрана обязана быть моделью того экрана, который стоит в приложении, а
 * не того, каким его хочется видеть. React-компонент в Node не загрузить, зато
 * связка с общим циклом — это несколько мест, каждое из которых либо есть, либо
 * нет; их и вычитываем. Переименование любого из них ломает проверку, а не
 * проходит молча: это шов, и он обязан быть жёстким.
 */
function checkerWiring(text) {
  const blind = text.match(/restorePurchases\(\)[\s\S]{0,240}?setTimeout\([^,]+,\s*(\d+)\)/);
  return {
    /** Статус перечитывается по сигналу о праве, а не только по нажатию кнопки. */
    entitlementSignal: /onIapEntitlement\(\(\) =>/.test(text),
    /** Восстановление возвращает исход, и экран этот исход показывает. */
    restoreOutcome:
      /const found = await restorePurchases\(\)/.test(text) &&
      /setNothingRestored\(!found\)/.test(text) &&
      /nothingRestored && !error/.test(text),
    /** Слепая пауза вместо ожидания подтверждения — прежнее поведение. */
    blindPauseMs: blind ? Number(blind[1]) : null,
  };
}

const CATALOGUE = subscriptionCatalogue();
const TIER_FLAVOR = tierFlavors();
/**
 * У WayBack с августа 2026 два тарифа, и оба обязаны работать. `WAYBACK` —
 * годовой: он продаётся с первой версии, на нём написаны прежние положения, и
 * менять их под новый товар незачем. Недельный проверяется своими.
 */
const WAYBACK = CATALOGUE.find((p) => p.tier === "wayback" && p.period === "yearly");
const WAYBACK_WEEKLY = CATALOGUE.find((p) => p.tier === "wayback" && p.period === "weekly");
const CHECKER = CATALOGUE.find((p) => p.tier === "checker" && p.period === "yearly");

/** Путь от корня репозитория — в путь от `src/`, которым читает read(). */
const fromSrc = (rel) => rel.replace("skyforest/src/", "");

/** Экран оплаты Checker, каким он стоит в рабочем дереве. */
const CK_WIRING = checkerWiring(
  [CK_SCREEN_REL, CK_HOOK_REL, CK_STATE_REL].map((rel) => readOrEmpty(fromSrc(rel))).join("\n"),
);

const tiersForFlavor = (flavor) =>
  Object.keys(TIER_FLAVOR).filter((tier) => TIER_FLAVOR[tier] === flavor);

console.log("— швы: модель говорит о том же, о чём источники —");
check(
  `оба товара WayBack есть в каталоге: ${WAYBACK_WEEKLY?.productId}, ${WAYBACK?.productId}`,
  Boolean(WAYBACK) &&
    Boolean(WAYBACK_WEEKLY) &&
    WAYBACK.bundleId === "ai.skyforest.wayback" &&
    WAYBACK_WEEKLY.bundleId === "ai.skyforest.wayback",
  `разобрано товаров: ${CATALOGUE.length}`,
);
check(
  "оба тарифа WayBack дают один тир — право не зависит от того, каким купили",
  WAYBACK?.tier === "wayback" && WAYBACK_WEEKLY?.tier === "wayback",
  `${WAYBACK?.tier} / ${WAYBACK_WEEKLY?.tier}`,
);
{
  // Экран оплаты строится из ответа стора, а не из каталога и не из флага.
  // Товар, который стор не подтвердил, показывать нельзя: кнопка упёрлась бы
  // в «товар недоступен». Это ровно то, чем недельный тариф отличается от
  // годового в первые дни — в App Store он появится позже, чем в Play.
  const iap = read("lib/native/iap.ts");
  const plans = read("lib/wayback/subscriptionProducts.ts");
  const hook = read("lib/wayback/useWaybackPurchase.ts");
  check(
    "стор спрашивают о готовности товара к заказу (offer), а не о его наличии",
    /export function getPurchasableSubscriptions\(\)/.test(iap) &&
      /\.filter\(\(p\) => Boolean\(store\.get\(p\.productId, platform\)\?\.getOffer\?\.\(\)\)\)/.test(iap),
  );
  check(
    "список тарифов на экране — пересечение каталога с ответом стора",
    /export function waybackPlansFor\(/.test(plans) &&
      /purchasable\.includes\(p\.productId\)/.test(plans) &&
      /waybackPlansFor\(purchasable\)/.test(hook),
  );
  check(
    "флага «показать недельный» в коде нет — тариф появляется вместе с одобрением стора",
    !/WEEKLY_ENABLED|SHOW_WEEKLY|ENABLE_WEEKLY|NEXT_PUBLIC_WAYBACK_WEEKLY/.test(
      [iap, plans, hook, read("components/wayback/WayBackPaywall.tsx"), read("components/wayback/WayBackPlanPicker.tsx")].join("\n"),
    ),
  );
}
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
  // То же самое у Mushroom Checker: связка своя, и её слабость видна здесь.
  check(
    "экран Checker подписан на появление права (onIapEntitlement)",
    CK_WIRING.entitlementSignal,
    "статус подписки не перечитывается по сигналу — транзакция из очереди StoreKit до экрана не дойдёт",
  );
  check(
    "восстановление Checker сообщает исход, слепой паузы нет",
    CK_WIRING.restoreOutcome && CK_WIRING.blindPauseMs === null,
    CK_WIRING.blindPauseMs !== null
      ? `на восстановлении слепая пауза ${CK_WIRING.blindPauseMs} мс`
      : "исход восстановления не доходит до экрана",
  );
  check(
    "«нечего восстанавливать» у Checker названо своей строкой копии",
    /t\("restoreFailed"\)/.test(read("components/checker/CheckerPaywall.tsx")) &&
      /^\s{4}restoreFailed:/m.test(read("i18n/messages/checker.en.ts")) &&
      /^\s{4}restoreFailed:/m.test(read("i18n/messages/checker.ru.ts")),
  );
  check(
    "запасной текст отказа у Checker — сообщение об ошибке, а не подпись кнопки",
    /useCheckerPurchase\(t\("purchaseError"\)\)/.test(read("components/checker/CheckerPaywall.tsx")),
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

const git = (args) => execFileSync("git", args, { encoding: "utf8", cwd: REPO });

/** Файл на заданной ревизии; «его там не было» — это пустота, а не ошибка. */
function showOrEmpty(rev, rel) {
  try {
    return execFileSync("git", ["show", `${rev}:${rel}`], {
      encoding: "utf8",
      cwd: REPO,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

/** Ближайшая ревизия по истории файла, в которой ещё нет признака правки. */
function revBeforeFix(rel, marker) {
  const revs = git(["rev-list", "HEAD", "--", rel]).trim().split("\n").filter(Boolean);
  for (const rev of revs) {
    if (!git(["show", `${rev}:${rel}`]).includes(marker)) return rev;
  }
  throw new Error(`в истории ${rel} нет версии без «${marker}» — сверьте признак правки`);
}

/** Прежняя версия модуля, положенная в файл: из него её и импортируем. */
function loadBeforeFix(rel, marker, name) {
  const rev = revBeforeFix(rel, marker);
  const file = join(TEMP, `${name}-${rev.slice(0, 7)}.ts`);
  writeFileSync(file, git(["show", `${rev}:${rel}`]));
  return { rev, file };
}

/**
 * Прежний экран оплаты Checker: связка с общим циклом на той ревизии, где
 * компонент ещё не знал о `useCheckerPurchase`. Хука на ней могло не быть вовсе —
 * тогда его текст пуст, и связка честно оказывается неполной.
 */
function checkerWiringBeforeFix() {
  const rev = revBeforeFix(CK_SCREEN_REL, CK_SCREEN_FIX);
  const text = [CK_SCREEN_REL, CK_HOOK_REL, CK_STATE_REL]
    .map((rel) => showOrEmpty(rev, rel))
    .join("\n");
  return { rev, wiring: checkerWiring(text) };
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
    /**
     * Что вернёт GET /api/subscription на домене этого приложения.
     *
     * Наружу уходит ОДНА подписка, даже когда строк несколько: право — это
     * факт, а не количество. Из нескольких берётся та, что кончается позже, —
     * так же, как в getActiveSubscription. Строк бывает две после смены
     * тарифа: на Android новый тариф приезжает новым purchaseToken, и прежняя
     * запись живёт до конца оплаченного периода.
     */
    subscription(flavor) {
      const allowed = tiersForFlavor(flavor);
      const active = rows
        .filter(
          (r) =>
            r.user_id === userId &&
            allowed.includes(r.tier) &&
            new Date(r.current_period_end).getTime() > Date.now(),
        )
        .sort(
          (a, b) =>
            new Date(b.current_period_end).getTime() -
            new Date(a.current_period_end).getTime(),
        );
      const found = active[0];
      return found
        ? { current_period_end: found.current_period_end, product_id: found.product_id }
        : null;
    },
    /** Сколько строк действующего права у приложения — для проверки «не удвоилось». */
    activeRows(flavor) {
      const allowed = tiersForFlavor(flavor);
      return rows.filter(
        (r) =>
          r.user_id === userId &&
          allowed.includes(r.tier) &&
          new Date(r.current_period_end).getTime() > Date.now(),
      );
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
 *
 * У Checker гейта нет — приложение работает и без подписки, — но экран оплаты
 * ведёт себя так же: пока права нет, показан пейволл, как только оно появилось,
 * на его месте карточка активной подписки. Решение принимается по тому же
 * ответу /api/subscription, поэтому модель одна.
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
 *
 * `wiring` — связка экрана, вычитанная из его исходников (checkerWiring). Она
 * задана только у Checker: у WayBack связка проверена утверждениями в разделе
 * «швы», а плечо B меняет сам цикл, поэтому подменять экран там нечем.
 */
function app({
  createPurchaseFlow,
  server,
  store,
  productId = WAYBACK.productId,
  flavor = "wayback",
  wiring = null,
  fallbackError = null,
}) {
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

  // Ровно то, что делает useWaybackPurchase (и useCheckerSubscription): право,
  // подтверждённое сервером, перечитывает статус — от кнопки оно пришло или из
  // очереди StoreKit. Экран, который на сигнал не подписан, об оплате не узнает.
  if (typeof flow.onEntitlement === "function" && (!wiring || wiring.entitlementSignal)) {
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
  /**
   * Чем экран заполняет пустоту, если исход не назван. У WayBack на этом месте
   * стояла подпись кнопки — отсюда «Начать 3 бесплатных дня» в красной рамке у
   * человека с оплаченной подпиской. У Checker там общая фраза: не бессмыслица,
   * но и не причина, по которой можно решить, что делать дальше.
   */
  const fallback = fallbackError ?? CTA;

  return {
    flow,
    gate,
    screen,
    log,
    messages,
    CTA,
    fallback,
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
      else screen.error = outcome.error || fallback;
      return outcome;
    },
    /**
     * Нажатие «Восстановить покупки», как его делает restorePurchases().
     *
     * `legacySettleMs` — прежнее поведение: слепая пауза, затем перечитывание
     * статуса. Исход восстановления коду при этом неизвестен вовсе (плагин лишь
     * не бросил исключение), поэтому сказать «в этом аккаунте подписки нет»
     * такому экрану нечем — он молча остаётся прежним.
     */
    async restore({ waitMs = 6000, legacySettleMs = null } = {}) {
      let found;
      let reportsOutcome;
      if (legacySettleMs != null) {
        await store.restorePurchases();
        await new Promise((done) => setTimeout(done, legacySettleMs));
        found = true;
        reportsOutcome = false;
      } else {
        const entitled = flow.waitForEntitlement(waitMs);
        await store.restorePurchases();
        found = await entitled;
        reportsOutcome = true;
      }
      await gate.recheck();
      screen.nothingRestored = reportsOutcome ? !found : false;
      return found;
    },
  };
}

/**
 * Слепая пауза прежнего экрана в масштабе проверки — либо null, если экран
 * дожидается исхода. Число берётся из исходников, а не выдумано здесь: вырастет
 * пауза в коде — вырастет и в модели.
 */
const legacySettle = (wiring) =>
  wiring.restoreOutcome ? null : scaledPause(wiring.blindPauseMs ?? 2500);

/* ================================================================== */
/* Положения                                                          */
/* ================================================================== */

/** Строка копии Checker — из самой копии: списанная сюда разошлась бы молча. */
function checkerCopy(key) {
  const source = read("i18n/messages/checker.ru.ts");
  const found = source.match(new RegExp(`^\\s{4}${key}:\\s*\\n?\\s*"((?:[^"\\\\]|\\\\.)*)"`, "m"));
  if (!found) throw new Error(`не нашёл строку ${key} в i18n/messages/checker.ru.ts — копия переехала`);
  return found[1];
}

/** Чем Checker заполняет пустоту, когда причину отказа не назвал никто. */
const CK_FALLBACK = checkerCopy("purchaseError");

/** Приложение Mushroom Checker: свой товар, своё право, своя связка экрана. */
const checkerApp = (deps, server, store) =>
  app({
    ...deps,
    server,
    store,
    productId: CHECKER.productId,
    flavor: "checker",
    wiring: deps.checkerWiring,
    fallbackError: CK_FALLBACK,
  });

/**
 * @param {object} deps
 * @param {Function} deps.createPurchaseFlow цикл транзакции (текущий или прежний)
 * @param {Function} deps.getAppleSubscription опрос Apple (текущий или прежний)
 * @param {boolean} deps.legacyStoreArgs у прежнего iap-store была подпись с allowSandbox
 * @param {boolean} deps.legacyRestore у прежнего цикла не было сигнала о праве
 * @param {object} deps.checkerWiring связка экрана Checker (текущая или прежняя)
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
    id: "недельный тариф",
    title: "подписку купили недельным тарифом — право такое же, как у годового",
    async run(deps) {
      const apple = fakeApple({ environment: "sandbox" });
      const server = fakeServer({ ...deps, apple });
      const store = fakeStore({ productId: WAYBACK_WEEKLY.productId, orderTx: "tx-w1" });
      const a = app({ ...deps, server, store, productId: WAYBACK_WEEKLY.productId });
      await a.gate.recheck();
      const before = a.gate.status;
      apple.put("tx-w1", {
        productId: WAYBACK_WEEKLY.productId,
        bundleId: WAYBACK_WEEKLY.bundleId,
        accountRef: "user-1",
        expiresInMs: 7 * 86_400_000,
      });
      const outcome = await a.subscribe();
      return { a, outcome, before, store, server };
    },
    verify({ a, outcome, before, store, server }) {
      check(`${this.id}: до покупки экран оплаты («${before}»)`, before === "needSubscription");
      check(`${this.id}: покупка завершилась успехом`, outcome.ok === true, JSON.stringify(outcome));
      check(`${this.id}: экран оплаты снят («${a.gate.status}»)`, a.gate.status === "allowed");
      check(`${this.id}: транзакция закрыта через finish()`, store.state.finished.length === 1);
      check(
        `${this.id}: право записано тем же тиром, что у годового (wayback)`,
        server.rows.length === 1 && server.rows[0].tier === "wayback",
        `строки: ${JSON.stringify(server.rows)}`,
      );
    },
    // Чек из песочницы отвергался серверной проверкой — причина общая.
    regressionIn: ["iap-store"],
    broken: ({ a, outcome }) => a.gate.status !== "allowed" || outcome.ok !== true,
    report: ({ a, outcome }) => `исход ok=${outcome.ok}, гейт «${a.gate.status}»`,
  },
  {
    id: "смена тарифа",
    title: "с недельного перешли на годовой — право одно, и оно годовое",
    async run(deps) {
      const apple = fakeApple({ environment: "sandbox" });
      const server = fakeServer({ ...deps, apple });

      // Сначала неделя.
      apple.put("tx-w1", {
        productId: WAYBACK_WEEKLY.productId,
        bundleId: WAYBACK_WEEKLY.bundleId,
        accountRef: "user-1",
        expiresInMs: 7 * 86_400_000,
      });
      const weekStore = fakeStore({ productId: WAYBACK_WEEKLY.productId, orderTx: "tx-w1" });
      const week = app({ ...deps, server, store: weekStore, productId: WAYBACK_WEEKLY.productId });
      const boughtWeek = await week.subscribe();
      const afterWeek = server.subscription("wayback");

      // Затем год — прежняя недельная запись ещё не истекла (так это выглядит
      // на Android: новый purchaseToken, старая строка доживает свой период).
      apple.put("tx-y1", {
        productId: WAYBACK.productId,
        bundleId: WAYBACK.bundleId,
        accountRef: "user-1",
        expiresInMs: 365 * 86_400_000,
      });
      const yearStore = fakeStore({ productId: WAYBACK.productId, orderTx: "tx-y1" });
      const year = app({ ...deps, server, store: yearStore, productId: WAYBACK.productId });
      const boughtYear = await year.subscribe();

      return { week, year, boughtWeek, boughtYear, afterWeek, server };
    },
    verify({ week, year, boughtWeek, boughtYear, afterWeek, server }) {
      check(`${this.id}: недельная подписка куплена и открыла приложение`, boughtWeek.ok === true && week.gate.status === "allowed");
      check(
        `${this.id}: до перехода право названо недельным товаром`,
        afterWeek?.product_id === WAYBACK_WEEKLY.productId,
        JSON.stringify(afterWeek),
      );
      check(`${this.id}: годовая подписка куплена`, boughtYear.ok === true);
      check(`${this.id}: приложение открыто и после перехода («${year.gate.status}»)`, year.gate.status === "allowed");
      const active = server.activeRows("wayback");
      check(
        `${this.id}: наружу уходит одно право, а не два (строк ${active.length})`,
        server.subscription("wayback") !== null && active.every((r) => r.tier === "wayback"),
        JSON.stringify(active),
      );
      check(
        `${this.id}: право названо годовым — тем, по которому теперь списывают`,
        server.subscription("wayback")?.product_id === WAYBACK.productId,
        `выбрано ${JSON.stringify(server.subscription("wayback"))}`,
      );
    },
    regressionIn: ["iap-store"],
    broken: ({ boughtYear, year }) => boughtYear.ok !== true || year.gate.status !== "allowed",
    report: ({ server }) =>
      `действующих строк ${server.activeRows("wayback").length}, наружу «${server.subscription("wayback")?.product_id ?? "нет"}»`,
  },
  {
    id: "checker: покупка",
    title: "подписку Checker купили в приложении (чек из песочницы) — пейволл сменился активной подпиской",
    async run(deps) {
      const apple = fakeApple({ environment: "sandbox" });
      const server = fakeServer({ ...deps, apple });
      const store = fakeStore({ productId: CHECKER.productId });
      const a = checkerApp(deps, server, store);
      await a.gate.recheck();
      const before = a.gate.status;
      apple.put("tx-1", { productId: CHECKER.productId, bundleId: CHECKER.bundleId, accountRef: "user-1" });
      const outcome = await a.subscribe();
      return { a, outcome, before, apple, store };
    },
    verify({ a, outcome, before, apple, store }) {
      check(`${this.id}: до покупки показан пейволл («${before}»)`, before === "needSubscription");
      check(`${this.id}: покупка завершилась успехом`, outcome.ok === true, JSON.stringify(outcome));
      check(`${this.id}: пейволл снят без перезапуска («${a.gate.status}»)`, a.gate.status === "allowed");
      check(`${this.id}: транзакция закрыта через finish()`, store.state.finished.length === 1);
      check(
        `${this.id}: Apple опрошен в порядке продакшен → песочница (${apple.asked.join(" → ")})`,
        apple.asked[0] === "production" && apple.asked.includes("sandbox"),
      );
    },
    // Чек из песочницы отвергался серверной проверкой — общая причина обоих
    // приложений; связка экрана здесь ни при чём, кнопку нажали.
    regressionIn: ["iap-store"],
    broken: ({ a, outcome }) => a.gate.status !== "allowed" || outcome.ok !== true,
    report: ({ a, outcome }) =>
      `исход покупки ok=${outcome.ok}, пейволл «${a.gate.status}», сообщение «${a.screen.error || "нет"}»`,
  },
  {
    id: "checker: транзакция при старте",
    title: "транзакция Checker приезжает уже одобренной при инициализации, статус подписки прочитан раньше",
    async run(deps) {
      const apple = fakeApple({ environment: "sandbox" });
      const server = fakeServer({ ...deps, apple });
      apple.put("queued-1", { productId: CHECKER.productId, bundleId: CHECKER.bundleId, accountRef: "user-1" });
      const store = fakeStore({ productId: CHECKER.productId, queued: ["queued-1"] });
      const a = checkerApp(deps, server, store);
      await a.gate.recheck();
      const before = a.gate.status;
      await store.initialize();
      await new Promise((done) => setTimeout(done, 50));
      return { a, before, store };
    },
    verify({ a, before, store }) {
      check(`${this.id}: статус успели прочитать до очереди («${before}»)`, before === "needSubscription");
      check(`${this.id}: транзакция из очереди доставлена`, store.state.approvedDelivered === 1);
      check(
        `${this.id}: подписка применилась без перезапуска («${a.gate.status}»)`,
        a.gate.status === "allowed",
        `перечитываний статуса: ${a.gate.rechecks}`,
      );
      check(`${this.id}: транзакция закрыта через finish()`, store.state.finished.length === 1);
    },
    // Все три причины сходятся здесь: чек отвергался, цикл о праве не сообщал, а
    // экран Checker его и не слушал.
    regressionIn: ["iap-store", "purchaseFlow", "checker-screen"],
    broken: ({ a }) => a.gate.status !== "allowed",
    report: ({ a }) => `пейволл «${a.gate.status}», перечитываний статуса ${a.gate.rechecks}`,
  },
  {
    id: "checker: проверка чека упала",
    title: "серверная проверка отвечает ошибкой — Checker называет причину и даёт повторить",
    async run(deps) {
      const apple = fakeApple({ environment: "sandbox" });
      apple.put("tx-1", { productId: CHECKER.productId, bundleId: CHECKER.bundleId, accountRef: "user-1" });
      const server = fakeServer({ ...deps, apple, failWith: 500 });
      const store = fakeStore({ productId: CHECKER.productId });
      const a = checkerApp(deps, server, store);
      await a.gate.recheck();
      const first = await a.subscribe();
      const message = a.screen.error;
      const healthy = fakeServer({ ...deps, apple });
      const b = checkerApp(deps, healthy, fakeStore({ productId: CHECKER.productId }));
      const second = await b.subscribe();
      return { a, b, first, second, message };
    },
    verify({ a, b, first, second, message }) {
      check(`${this.id}: покупка кончилась отказом`, first.ok === false, JSON.stringify(first));
      check(`${this.id}: спиннер погашен`, a.screen.purchasing === false);
      check(`${this.id}: причина названа («${message}»)`, Boolean(first.error) && message === a.messages.verifyRetry);
      check(
        `${this.id}: общая фраза не подставлена вместо причины`,
        message !== a.fallback,
        `на экране «${message}»`,
      );
      check(`${this.id}: повтор проходит и снимает пейволл («${b.gate.status}»)`, second.ok === true && b.gate.status === "allowed");
    },
    // Отказ без причины — свойство самого цикла, общее для обоих приложений.
    regressionIn: ["purchaseFlow"],
    broken: ({ first, message, a }) => !first.error || message === a.fallback,
    report: ({ first, message }) =>
      `исход ok=${first.ok}, error=${first.error === undefined ? "не задан" : `«${first.error}»`}, на экране «${message}»`,
  },
  {
    id: "checker: восстановление",
    title: "«Восстановить покупку» в Checker возвращает право, даже когда сервер отвечает медленно",
    async run(deps) {
      const apple = fakeApple({ environment: "sandbox", latencyMs: RESTORE_LATENCY_MS });
      apple.put("owned-1", { productId: CHECKER.productId, bundleId: CHECKER.bundleId, accountRef: "user-1" });
      const server = fakeServer({ ...deps, apple });
      const store = fakeStore({ productId: CHECKER.productId, owned: ["owned-1"] });
      const a = checkerApp(deps, server, store);
      await a.gate.recheck();
      const before = a.gate.status;
      const settle = legacySettle(deps.checkerWiring);
      const found = settle != null ? await a.restore({ legacySettleMs: settle }) : await a.restore({ waitMs: 3000 });
      return { a, found, before, settle };
    },
    verify({ a, found, before }) {
      check(`${this.id}: до восстановления показан пейволл («${before}»)`, before === "needSubscription");
      check(`${this.id}: восстановление сообщило об успехе`, found === true);
      check(`${this.id}: право вернулось, пейволл снят («${a.gate.status}»)`, a.gate.status === "allowed");
      check(`${this.id}: «нечего восстанавливать» не показано`, a.screen.nothingRestored === false);
    },
    regressionIn: ["iap-store", "purchaseFlow", "checker-screen"],
    broken: ({ a, found }) => a.gate.status !== "allowed" || found !== true,
    report: ({ a, found, settle }) =>
      `восстановление вернуло ${found}${settle == null ? "" : ` (слепая пауза ${settle} мс против ответа за ${RESTORE_LATENCY_MS} мс)`}, пейволл «${a.gate.status}»`,
  },
  {
    id: "checker: нечего восстанавливать",
    title: "в этом аккаунте стора подписки Checker нет — об этом сказано прямо",
    async run(deps) {
      const apple = fakeApple({ environment: "sandbox" });
      const server = fakeServer({ ...deps, apple });
      const store = fakeStore({ productId: CHECKER.productId, owned: [] });
      const a = checkerApp(deps, server, store);
      await a.gate.recheck();
      const settle = legacySettle(deps.checkerWiring);
      const found = settle != null ? await a.restore({ legacySettleMs: settle }) : await a.restore({ waitMs: 150 });
      return { a, found };
    },
    verify({ a, found }) {
      check(`${this.id}: восстановление ответило «не нашлось»`, found === false);
      check(`${this.id}: экран сказал об этом`, a.screen.nothingRestored === true);
      check(`${this.id}: пейволл на месте`, a.gate.status === "needSubscription");
    },
    // Прежний экран считал успехом любой возврат плагина и молчал об исходе.
    regressionIn: ["purchaseFlow", "checker-screen"],
    broken: ({ found, a }) => found !== false || a.screen.nothingRestored !== true,
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
      const ck = checkerApp(deps, server, ckStore);
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
  checkerWiring: CK_WIRING,
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
async function arm(name, rel, rev, deps) {
  console.log(`\n— плечо «${name}»: ${rel.replace("skyforest/", "")} @ ${rev.slice(0, 7)} —`);
  const withOld = { ...current, ...deps };
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
  return { caught, expected };
}

// A) Прежний iap-store.ts: песочница разрешалась по списку адресов, поэтому чек
//    ревьюера отвергался с 402 — на нём валится всё, что требует покупки.
const beforeStore = loadBeforeFix(STORE_REL, STORE_FIX, "iap-store");
const armA = await arm("iap-store", STORE_REL, beforeStore.rev, {
  getAppleSubscription: (await import(pathToFileURL(beforeStore.file).href)).getAppleSubscription,
  legacyStoreArgs: true,
});
check(
  `песочница по списку адресов: отказ воспроизводится (${armA.caught}/${armA.expected})`,
  armA.caught === armA.expected,
);

// B) Прежний purchaseFlow.ts: цикл не сообщал о появлении права и отвечал
//    отказом без причины.
const beforeFlow = loadBeforeFix(FLOW_REL, FLOW_FIX, "purchaseFlow");
const armB = await arm("purchaseFlow", FLOW_REL, beforeFlow.rev, {
  createPurchaseFlow: (await import(pathToFileURL(beforeFlow.file).href)).createPurchaseFlow,
  legacyRestore: true,
});
check(
  `цикл без сигнала о праве: отказ воспроизводится (${armB.caught}/${armB.expected})`,
  armB.caught === armB.expected,
);

// C) Прежний экран оплаты Checker: слепая пауза на восстановлении, «успех» на
//    любой ответ плагина и никакой подписки на сигнал о праве. Общий цикл при
//    этом уже исправлен — плечо показывает ровно цену несвязанного экрана.
const beforeScreen = checkerWiringBeforeFix();
const armC = await arm("checker-screen", CK_SCREEN_REL, beforeScreen.rev, {
  checkerWiring: beforeScreen.wiring,
});
check(
  `экран Checker без исхода восстановления и сигнала о праве: отказ воспроизводится (${armC.caught}/${armC.expected})`,
  armC.caught === armC.expected,
);

console.log(failures === 0 ? "\nвсе проверки прошли" : `\nпровалено проверок: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
