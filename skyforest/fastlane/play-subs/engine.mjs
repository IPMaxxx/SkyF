/**
 * Механика работы с подписками Google Play: доступ к API, сверка объявленного
 * состояния с фактическим и запись.
 *
 * Здесь нет ни одного имени пакета, ни одной цены и ни одного идентификатора
 * товара — всё это приезжает из пофлейворного файла (`checker.mjs`,
 * `wayback.mjs`, `skyforest.mjs`). Разделение именно такое, потому что откат
 * чужих цен случился не из-за механики: она была верной. Разъехались данные,
 * которых в скрипте вообще не должно было быть.
 *
 * Три замка на запись, каждый следующий уже предыдущего:
 *
 *  1. `syncPackage` строит КАЖДЫЙ адрес запроса из `plan.pkg`. Точка входа
 *     импортирует ровно один пофлейворный файл, так что прогон ради Checker
 *     физически не может обратиться к `/applications/ai.skyforest.wayback/…`.
 *  2. Без `--apply` не отправляется ни одного изменяющего запроса — только
 *     чтение и таблица различий.
 *  3. Смена цены существующего базового плана требует ещё и `--price`.
 *     Цена — единственное поле, ошибка в котором стоит денег и не заметна
 *     глазами: остальное видно в консоли, а цена там просто число.
 *
 * Снятых с продажи товаров (`plan.retired`) движок не касается вовсе.
 */
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

const BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3";
/** Версия справочника регионов Google; та же, с которой товары заводились. */
const REGIONS_VERSION = "2025%2F03";

/* ------------------------------------------------------------------ */
/* Доступ                                                              */
/* ------------------------------------------------------------------ */

export async function playToken() {
  const sa = JSON.parse(
    readFileSync(new URL("../play-service-account.json", import.meta.url), "utf8"),
  );
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const header = b64({ alg: "RS256", typ: "JWT" });
  const claims = b64({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const sig = signer.sign(sa.private_key).toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${sig}`,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`не получен токен: ${JSON.stringify(data)}`);
  return data.access_token;
}

export function makeApi(token) {
  return async function api(method, path, body) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    return { status: res.status, ok: res.ok, json };
  };
}

/* ------------------------------------------------------------------ */
/* Чтение фактического состояния                                       */
/* ------------------------------------------------------------------ */

export const priceAmount = (price) =>
  price ? Number(price.units || 0) + Number(price.nanos || 0) / 1e9 : null;

export const usdPrice = (amount) => ({
  currencyCode: "USD",
  units: String(Math.trunc(amount)),
  nanos: Math.round((amount - Math.trunc(amount)) * 100) * 10_000_000,
});

/** Цена базового плана для США — по ней сверяется всё остальное. */
export function basePlanUsd(basePlan) {
  const regional = basePlan?.regionalConfigs?.find((r) => r.regionCode === "US")?.price;
  return priceAmount(regional ?? basePlan?.otherRegionsConfig?.usdPrice);
}

/** Все подписки приложения одним запросом. */
export async function readSubscriptions(api, pkg) {
  const res = await api("GET", `/applications/${pkg}/subscriptions?pageSize=100`);
  if (!res.ok) throw new Error(`не прочитал подписки ${pkg}: HTTP ${res.status} ${JSON.stringify(res.json).slice(0, 300)}`);
  return res.json.subscriptions || [];
}

export async function readOffers(api, pkg, productId, basePlanId) {
  const res = await api(
    "GET",
    `/applications/${pkg}/subscriptions/${productId}/basePlans/${basePlanId}/offers`,
  );
  if (!res.ok) return [];
  return res.json.subscriptionOffers || [];
}

/** Единственная бесплатная фаза оффера, если она такая одна. */
export function offerFreePhase(offer) {
  const phases = offer.phases || [];
  if (phases.length !== 1) return null;
  const [phase] = phases;
  const free = (phase.regionalConfigs || []).every((r) => r.free) && phase.otherRegionsConfig?.free;
  return free ? phase : null;
}

/** Цена первой фазы оффера для США — для вводных предложений со скидкой. */
export function offerPhaseUsd(offer) {
  const phase = (offer.phases || [])[0];
  if (!phase) return null;
  const regional = phase.regionalConfigs?.find((r) => r.regionCode === "US")?.price;
  return priceAmount(regional ?? phase.otherRegionsConfig?.otherRegionsPrices?.usdPrice);
}

/** Витрины совпадают с объявленными — заголовок, описание и список выгод. */
export function listingsMatch(declared, actual) {
  return declared.every((want) => {
    const has = (actual || []).find((c) => c.languageCode === want.languageCode);
    return (
      has &&
      has.title === want.title &&
      has.description === want.description &&
      (has.benefits || []).join("|") === (want.benefits || []).join("|")
    );
  });
}

/* ------------------------------------------------------------------ */
/* Запись                                                              */
/* ------------------------------------------------------------------ */

/** Региональные цены, пересчитанные Google из доллара. */
async function convertPrices(api, pkg, usd) {
  const conv = await api("POST", `/applications/${pkg}/pricing:convertRegionPrices`, {
    price: usdPrice(usd),
  });
  if (!conv.ok) return { error: conv };
  return {
    regionalConfigs: Object.values(conv.json.convertedRegionPrices || {}).map((r) => ({
      regionCode: r.regionCode,
      newSubscriberAvailability: true,
      price: r.price,
    })),
    other: conv.json.convertedOtherRegionsPrice || {},
  };
}

/**
 * Привести подписки одного приложения к объявленному состоянию.
 *
 * @param {object}  plan            пофлейворное объявление (`checker.mjs` и т.п.)
 * @param {boolean} apply           отправлять изменяющие запросы
 * @param {boolean} allowPriceChange разрешить менять цену существующего плана
 * @returns {Promise<{changes: number, blocked: number, failures: number}>}
 */
export async function syncPackage({ plan, apply = false, allowPriceChange = false }) {
  if (plan.readOnly) throw new Error(`${plan.pkg}: приложение объявлено только для чтения`);
  const pkg = plan.pkg;
  const token = await playToken();
  const api = makeApi(token);

  const say = (line) => console.log(`  ${line}`);
  const fail = (step, res) => {
    console.error(`  ОШИБКА ${step}: HTTP ${res.status} ${JSON.stringify(res.json).slice(0, 600)}`);
  };
  const result = { changes: 0, blocked: 0, failures: 0 };

  console.log(`\n########## ${pkg} ##########`);
  console.log(apply ? "режим: запись" : "режим: показ различий (для записи добавьте --apply)");

  for (const p of plan.products) {
    console.log(`\n=== ${p.productId} — ${p.usd} USD / ${p.billingPeriod} ===`);

    const existing = await api("GET", `/applications/${pkg}/subscriptions/${p.productId}`);
    let sub = existing.ok ? existing.json : null;

    /* ---- товара нет: создать вместе с базовым планом ---- */
    if (!sub) {
      say(`товара нет — будет создан за ${p.usd} USD`);
      result.changes += 1;
      if (!apply) continue;
      const conv = await convertPrices(api, pkg, p.usd);
      if (conv.error) {
        fail("пересчёт региональных цен", conv.error);
        result.failures += 1;
        continue;
      }
      const created = await api(
        "POST",
        `/applications/${pkg}/subscriptions?productId=${encodeURIComponent(p.productId)}&regionsVersion.version=${REGIONS_VERSION}`,
        {
          productId: p.productId,
          listings: p.listings,
          taxAndComplianceSettings: { eeaWithdrawalRightType: "WITHDRAWAL_RIGHT_SERVICE" },
          basePlans: [
            {
              basePlanId: p.basePlanId,
              autoRenewingBasePlanType: {
                billingPeriodDuration: p.billingPeriod,
                gracePeriodDuration: p.gracePeriod,
                resubscribeState: "RESUBSCRIBE_STATE_ACTIVE",
                prorationMode: "SUBSCRIPTION_PRORATION_MODE_CHARGE_ON_NEXT_BILLING_DATE",
                legacyCompatible: false,
              },
              regionalConfigs: conv.regionalConfigs,
              otherRegionsConfig: {
                usdPrice: conv.other.usdPrice,
                eurPrice: conv.other.eurPrice,
                newSubscriberAvailability: true,
              },
            },
          ],
        },
      );
      if (!created.ok) {
        fail("создание товара", created);
        result.failures += 1;
        continue;
      }
      sub = created.json;
      say("товар создан");
    } else {
      /* ---- товар есть: сверить цену и витрины ---- */
      const bp = sub.basePlans?.find((b) => b.basePlanId === p.basePlanId);
      if (!bp) {
        console.error(`  ОШИБКА: у товара нет базового плана ${p.basePlanId}`);
        result.failures += 1;
        continue;
      }
      const actualUsd = basePlanUsd(bp);
      const priceStale = actualUsd !== p.usd;
      const listingsStale = !listingsMatch(p.listings, sub.listings);

      say(
        `цена в консоли ${actualUsd} USD${priceStale ? ` → в репозитории ${p.usd} USD` : " (совпадает)"}` +
          `; витрины ${listingsStale ? "расходятся" : "совпадают"}`,
      );

      // Третий замок. Цена — единственное, что здесь стоит денег, и
      // единственное, что уже однажды уехало молча: `--apply` её не меняет.
      if (priceStale && !allowPriceChange) {
        say(`смена цены ${actualUsd} → ${p.usd} USD ПРОПУЩЕНА: нужен ещё флаг --price`);
        result.blocked += 1;
      }

      const changePrice = priceStale && allowPriceChange;
      if (changePrice || listingsStale) result.changes += 1;

      if (apply && (changePrice || listingsStale)) {
        const masks = [];
        const body = { packageName: pkg, productId: p.productId };

        if (changePrice) {
          const conv = await convertPrices(api, pkg, p.usd);
          if (conv.error) {
            fail("пересчёт региональных цен", conv.error);
            result.failures += 1;
            continue;
          }
          // Новая цена достаётся НОВЫМ подписчикам; действующие остаются на
          // своей, пока их не мигрируют вручную в консоли.
          body.basePlans = sub.basePlans.map((plan) => {
            // `state` в теле PATCH только для чтения: активацией плана
            // занимается отдельный вызов basePlans:activate.
            const rest = { ...plan };
            delete rest.state;
            if (rest.basePlanId !== p.basePlanId) return rest;
            return {
              ...rest,
              regionalConfigs: conv.regionalConfigs,
              otherRegionsConfig: {
                usdPrice: conv.other.usdPrice,
                eurPrice: conv.other.eurPrice,
                newSubscriberAvailability: true,
              },
            };
          });
          masks.push("basePlans");
        }
        if (listingsStale) {
          body.listings = p.listings;
          masks.push("listings");
        }

        const patched = await api(
          "PATCH",
          `/applications/${pkg}/subscriptions/${p.productId}` +
            `?updateMask=${masks.join(",")}&regionsVersion.version=${REGIONS_VERSION}`,
          body,
        );
        if (!patched.ok) {
          fail("обновление товара", patched);
          result.failures += 1;
          continue;
        }
        sub = patched.json;
        say(`обновлено: ${masks.join(", ")}`);
      }
    }

    /* ---- базовый план: без активации товар не продаётся вовсе ---- */
    const bpState = sub.basePlans?.find((b) => b.basePlanId === p.basePlanId)?.state;
    if (bpState !== "ACTIVE") {
      say(`базовый план ${bpState ?? "?"} → будет активирован`);
      result.changes += 1;
      if (apply) {
        const act = await api(
          "POST",
          `/applications/${pkg}/subscriptions/${p.productId}/basePlans/${p.basePlanId}:activate`,
          {},
        );
        if (!act.ok) {
          fail("активация базового плана", act);
          result.failures += 1;
          continue;
        }
        say("базовый план активирован");
      }
    } else {
      say("базовый план активен");
    }
    if (!apply && bpState !== "ACTIVE") continue;

    /* ---- офферы ---- */
    const actualOffers = await readOffers(api, pkg, p.productId, p.basePlanId);
    for (const want of p.offers || []) {
      if (want.state !== "ACTIVE") {
        // Объявленный неактивным оффер — остаток прежней модели. Движок его
        // не трогает: включить второй оффер на плане значит отдать выбор
        // предложения жребию.
        const has = actualOffers.find((o) => o.offerId === want.offerId);
        say(`оффер ${want.offerId}: объявлен выключенным, в консоли ${has?.state ?? "нет"} — не трогаю`);
        continue;
      }
      if (!want.free) {
        say(`оффер ${want.offerId}: не бесплатная фаза, движок такие не заводит — не трогаю`);
        continue;
      }

      let offer = actualOffers.find((o) => o.offerId === want.offerId);
      if (!offer) {
        say(`оффера ${want.offerId} нет — будет создан (${want.duration} бесплатно)`);
        result.changes += 1;
        if (!apply) continue;
        const cur = await api("GET", `/applications/${pkg}/subscriptions/${p.productId}`);
        const bp = cur.json.basePlans.find((b) => b.basePlanId === p.basePlanId);
        const createdOffer = await api(
          "POST",
          `/applications/${pkg}/subscriptions/${p.productId}/basePlans/${p.basePlanId}/offers` +
            `?offerId=${want.offerId}&regionsVersion.version=${REGIONS_VERSION}`,
          {
            packageName: pkg,
            productId: p.productId,
            basePlanId: p.basePlanId,
            offerId: want.offerId,
            // Регионы оффера обязаны покрывать регионы базового плана.
            regionalConfigs: bp.regionalConfigs.map((r) => ({
              regionCode: r.regionCode,
              newSubscriberAvailability: true,
            })),
            otherRegionsConfig: { otherRegionsNewSubscriberAvailability: true },
            phases: [
              {
                recurrenceCount: 1,
                duration: want.duration,
                regionalConfigs: bp.regionalConfigs.map((r) => ({ regionCode: r.regionCode, free: {} })),
                otherRegionsConfig: { free: {} },
              },
            ],
            targeting: { acquisitionRule: { scope: { thisSubscription: {} } } },
          },
        );
        if (!createdOffer.ok) {
          fail("создание оффера", createdOffer);
          result.failures += 1;
          continue;
        }
        offer = createdOffer.json;
        say(`оффер ${want.offerId} создан`);
      }

      if (offer.state !== "ACTIVE") {
        say(`оффер ${want.offerId}: ${offer.state} → будет активирован`);
        result.changes += 1;
        if (apply) {
          const actOffer = await api(
            "POST",
            `/applications/${pkg}/subscriptions/${p.productId}/basePlans/${p.basePlanId}/offers/${want.offerId}:activate`,
            {},
          );
          if (!actOffer.ok) {
            fail("активация оффера", actOffer);
            result.failures += 1;
          } else say(`оффер ${want.offerId} активирован`);
        }
      } else {
        const phase = offerFreePhase(offer);
        say(
          `оффер ${want.offerId} активен, фаза ${phase?.duration ?? "не бесплатная"}` +
            (phase && phase.duration !== want.duration ? ` — ОЖИДАЛАСЬ ${want.duration}` : ""),
        );
      }
    }
  }

  /* ---- снятое с продажи: только напомнить, что оно есть ---- */
  for (const r of plan.retired || []) {
    console.log(`\n=== ${r.productId} — снят с продажи, движок не трогает ===`);
    console.log(`  ${r.note}`);
  }

  console.log(
    `\nИтог ${pkg}: изменений ${result.changes}` +
      `${result.blocked ? `, заблокировано смен цены ${result.blocked}` : ""}` +
      `${result.failures ? `, ошибок ${result.failures}` : ""}` +
      `${apply ? "" : " (ничего не отправлено)"}`,
  );
  return result;
}
