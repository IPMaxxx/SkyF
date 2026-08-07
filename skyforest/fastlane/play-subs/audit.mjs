/**
 * Сверка объявленного состояния подписок с фактическим в Google Play.
 *
 * Вынесено из проверки отдельной функцией, чтобы её можно было натравить не
 * только на сегодняшние объявления, но и на данные из истории репозитория —
 * иначе негативное плечо пришлось бы писать вторым, отдельным кодом, и оно
 * проверяло бы уже не ту сверку, которая работает.
 *
 * Необъявленное не проверяется: у объявления из истории нет ни витрин, ни
 * офферов, ни периодов — только цены. Поэтому каждое поле сверяется, лишь
 * когда оно задано.
 */
import {
  basePlanUsd,
  listingsMatch,
  offerFreePhase,
  offerPhaseUsd,
  priceAmount,
  readOffers,
  readSubscriptions,
} from "./engine.mjs";

/**
 * @param {object}   api     клиент из `makeApi`
 * @param {object}   plan    объявление приложения
 * @param {Function} check   `(name, ok, detail) => void`
 * @param {Array}    table   строки «в репозитории / в консоли» (необязательно)
 */
export async function auditPackage({ api, plan, check, table }) {
  const subs = await readSubscriptions(api, plan.pkg);
  const byId = new Map(subs.map((s) => [s.productId, s]));
  const regionSets = [];

  for (const want of plan.products) {
    const sub = byId.get(want.productId);
    if (!sub) {
      check(`${want.productId}: товар есть в консоли`, false, "товара нет вовсе");
      table?.push([want.productId, `${want.usd} USD`, "товара нет", "—"]);
      continue;
    }
    const bp = (sub.basePlans || []).find((b) => b.basePlanId === want.basePlanId);
    if (!bp) {
      check(`${want.productId}: базовый план ${want.basePlanId}`, false, "плана нет");
      continue;
    }

    const actualUsd = basePlanUsd(bp);
    const otherUsd = priceAmount(bp.otherRegionsConfig?.usdPrice);
    check(
      `${want.productId}: цена ${want.usd} USD`,
      actualUsd === want.usd && otherUsd === want.usd,
      `в консоли US ${actualUsd}, остальные регионы ${otherUsd}`,
    );
    table?.push([
      want.productId,
      `${want.usd} USD`,
      `${actualUsd} USD`,
      actualUsd === want.usd ? "совпало, не трогал" : "РАСХОЖДЕНИЕ",
    ]);

    if (want.billingPeriod) {
      const type = bp.autoRenewingBasePlanType || {};
      check(
        `${want.productId}: период ${want.billingPeriod}, льготный ${want.gracePeriod}`,
        type.billingPeriodDuration === want.billingPeriod &&
          type.gracePeriodDuration === want.gracePeriod,
        `в консоли ${type.billingPeriodDuration} / ${type.gracePeriodDuration}`,
      );
    }
    check(`${want.productId}: базовый план активен`, bp.state === "ACTIVE", `состояние ${bp.state}`);

    if (want.listings) {
      check(
        `${want.productId}: витрины совпадают`,
        listingsMatch(want.listings, sub.listings),
        `в консоли ${(sub.listings || []).map((l) => `${l.languageCode}:"${l.title}"`).join(", ")}`,
      );
    }

    const regions = (bp.regionalConfigs || []).map((r) => r.regionCode).sort();
    regionSets.push({ id: `${want.productId}/${want.basePlanId}`, regions });
    check(
      `${want.productId}: продажа открыта во всех ${regions.length} регионах`,
      (bp.regionalConfigs || []).every((r) => r.newSubscriberAvailability) &&
        bp.otherRegionsConfig?.newSubscriberAvailability === true,
      "в каком-то регионе закрыта продажа новым подписчикам",
    );

    if (!want.offers) continue;
    const offers = await readOffers(api, plan.pkg, want.productId, want.basePlanId);
    const declaredIds = new Set(want.offers.map((o) => o.offerId));

    for (const wantOffer of want.offers) {
      const offer = offers.find((o) => o.offerId === wantOffer.offerId);
      if (!offer) {
        check(`${want.productId}: оффер ${wantOffer.offerId}`, false, "оффера нет в консоли");
        continue;
      }
      check(
        `${want.productId}: оффер ${wantOffer.offerId} ${wantOffer.state}`,
        offer.state === wantOffer.state,
        `в консоли ${offer.state}`,
      );
      if (wantOffer.free) {
        const phase = offerFreePhase(offer);
        check(
          `${want.productId}: оффер ${wantOffer.offerId} — ${wantOffer.duration} бесплатно`,
          phase?.duration === wantOffer.duration,
          phase ? `в консоли ${phase.duration}` : "фаза не бесплатная или их несколько",
        );
      } else if (wantOffer.usd != null) {
        check(
          `${want.productId}: оффер ${wantOffer.offerId} — ${wantOffer.duration} за ${wantOffer.usd} USD`,
          offerPhaseUsd(offer) === wantOffer.usd && offer.phases?.[0]?.duration === wantOffer.duration,
          `в консоли ${offer.phases?.[0]?.duration} за ${offerPhaseUsd(offer)} USD`,
        );
      }
      if (offer.state === "ACTIVE") {
        const offerRegions = new Set((offer.regionalConfigs || []).map((r) => r.regionCode));
        check(
          `${want.productId}: оффер ${wantOffer.offerId} покрывает регионы плана`,
          regions.every((code) => offerRegions.has(code)),
          `у плана ${regions.length} регионов, у оффера ${offerRegions.size}`,
        );
      }
    }

    const strays = offers.filter((o) => o.state === "ACTIVE" && !declaredIds.has(o.offerId));
    check(
      `${want.productId}: посторонних активных офферов нет`,
      strays.length === 0,
      `активны, но не объявлены: ${strays.map((o) => o.offerId).join(", ")}`,
    );
  }

  /* Снятое с продажи обязано оставаться выключенным. */
  for (const retired of plan.retired || []) {
    const sub = byId.get(retired.productId);
    if (!sub) {
      check(`${retired.productId}: снятый товар на месте`, false, "товара нет — по нему были подписчики");
      continue;
    }
    const bp = (sub.basePlans || []).find((b) => b.basePlanId === retired.basePlanId);
    check(
      `${retired.productId}: снят с продажи (план выключен)`,
      bp?.state === "INACTIVE",
      `состояние ${bp?.state}`,
    );
    if (retired.usd != null) {
      const actualUsd = basePlanUsd(bp);
      check(
        `${retired.productId}: цена ${retired.usd} USD не менялась`,
        actualUsd === retired.usd,
        `в консоли ${actualUsd}`,
      );
      table?.push([retired.productId, `${retired.usd} USD (снят)`, `${actualUsd} USD`, "совпало, не трогал"]);
    } else {
      table?.push([retired.productId, "снят с продажи", `план ${bp?.state}`, "не трогал"]);
    }
    const offers = await readOffers(api, plan.pkg, retired.productId, retired.basePlanId);
    const live = offers.filter((o) => o.state === "ACTIVE");
    check(
      `${retired.productId}: активных офферов на снятом плане нет`,
      live.length === 0,
      `активны: ${live.map((o) => o.offerId).join(", ")}`,
    );
  }

  /* Единый набор стран у всех планов приложения. */
  if (regionSets.length > 1) {
    const [first, ...rest] = regionSets;
    const diverged = rest.filter((s) => s.regions.join(",") !== first.regions.join(","));
    check(
      `${plan.pkg}: у всех планов один набор стран (${first.regions.length})`,
      diverged.length === 0,
      diverged.map((s) => `${s.id}: ${s.regions.length}`).join("; "),
    );
  }

  /* В консоли не должно быть товаров, о которых репозиторий не знает. */
  if (plan.exhaustive !== false) {
    const known = new Set([
      ...plan.products.map((p) => p.productId),
      ...(plan.retired || []).map((p) => p.productId),
    ]);
    const unknown = subs.map((s) => s.productId).filter((id) => !known.has(id));
    check(
      `${plan.pkg}: репозиторий знает про все товары в консоли`,
      unknown.length === 0,
      `не объявлены: ${unknown.join(", ")}`,
    );
  }
}
