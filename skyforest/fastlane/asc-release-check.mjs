#!/usr/bin/env node
/**
 * Читает из App Store Connect всё, что обязано быть заполнено до отправки
 * версии на ревью, и печатает фактические значения. Только GET — скрипт
 * ничего не меняет и ничего не отправляет.
 *
 * Смысл в том, чтобы не верить ответам на запись: каждое поле здесь
 * перечитано отдельным запросом. Пустые обязательные поля печатаются как
 * «НЕ ЗАПОЛНЕНО», и скрипт завершается с ненулевым кодом.
 *
 * Чего в этом списке нет и быть не может: раздел App Privacy (карточка сбора
 * данных). Публичный ASC API его не отдаёт — ни `appDataUsages`, ни
 * `appDataUsageCategories`, ни `appDataUsagesPublishState` в схеме не
 * существуют, у ресурса `apps` такой связи нет. Это только Console.
 *
 * Запуск из каталога skyforest:
 *   node fastlane/asc-release-check.mjs                       — оба приложения
 *   node fastlane/asc-release-check.mjs ai.skyforest.wayback  — одно
 */
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

const HERE = new URL("./", import.meta.url);
const KEY_ID = "TRS8NZAGX5";
const ISSUER_ID = "31303d35-0acc-4d1a-89d4-872e31f2b28f";
const P8 = readFileSync(new URL("./AuthKey_TRS8NZAGX5.p8", HERE), "utf8");
const ASC = "https://api.appstoreconnect.apple.com";

const BUNDLES = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const TARGETS = BUNDLES.length
  ? BUNDLES
  : ["ai.skyforest.wayback", "ai.skyforest.mushroomchecker"];

const b64url = (input) =>
  Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

function ascToken() {
  const header = { alg: "ES256", kid: KEY_ID, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 600, aud: "appstoreconnect-v1" };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signer = createSign("SHA256");
  signer.update(input);
  return `${input}.${b64url(signer.sign({ key: P8, dsaEncoding: "ieee-p1363" }))}`;
}

async function asc(path) {
  const res = await fetch(`${ASC}${path}`, { headers: { Authorization: `Bearer ${ascToken()}` } });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

/**
 * Все страницы отношения. Цены и вводные офферы Apple хранит по записи на
 * территорию (их 175), и первая страница ответила бы «всего 50».
 */
async function ascAll(path) {
  let next = `${ASC}${path}`;
  const data = [];
  const included = [];
  while (next) {
    const res = await fetch(next, { headers: { Authorization: `Bearer ${ascToken()}` } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`GET ${next} -> ${res.status}`);
    data.push(...(json.data || []));
    included.push(...(json.included || []));
    next = json.links?.next ?? null;
  }
  return { data, included };
}

let problems = 0;
const line = (label, value, ok = value != null && value !== "") => {
  if (!ok) problems += 1;
  console.log(`  ${ok ? "OK " : "НЕТ"}  ${label.padEnd(26)} ${value ?? "НЕ ЗАПОЛНЕНО"}`);
};

for (const bundle of TARGETS) {
  const apps = await asc(`/v1/apps?filter[bundleId]=${bundle}&fields[apps]=name,contentRightsDeclaration`);
  const app = apps.data?.[0];
  if (!app) throw new Error(`нет приложения ${bundle} в ASC`);
  console.log(`\n===== ${app.attributes.name} (${bundle}, id=${app.id}) =====`);
  line("content rights", app.attributes.contentRightsDeclaration);

  // --- App Information: категории и возрастной рейтинг ---
  const infos = await asc(
    `/v1/apps/${app.id}/appInfos?fields[appInfos]=state,appStoreAgeRating,brazilAgeRatingV2`,
  );
  const info =
    infos.data.find((i) => i.attributes.state === "PREPARE_FOR_SUBMISSION") || infos.data[0];
  line("age rating", info.attributes.appStoreAgeRating);

  for (const rel of ["primaryCategory", "secondaryCategory"]) {
    const r = await asc(`/v1/appInfos/${info.id}/${rel}`);
    line(rel, r.data?.id, rel === "primaryCategory" ? Boolean(r.data) : true);
  }

  // Вопросник рейтинга: незаполненные поля значат «анкета не дописана», даже
  // если итоговый рейтинг уже посчитан.
  const decl = await asc(`/v1/appInfos/${info.id}/ageRatingDeclaration`);
  const skip = new Set(["kidsAgeBand", "developerAgeRatingInfoUrl", "ageRatingOverride"]);
  const unanswered = Object.entries(decl.data.attributes)
    .filter(([k, v]) => !skip.has(k) && v == null)
    .map(([k]) => k);
  line(
    "вопросник рейтинга",
    unanswered.length ? `без ответа: ${unanswered.join(", ")}` : "заполнен целиком",
    unanswered.length === 0,
  );

  // --- Версия ---
  const versions = await asc(
    `/v1/apps/${app.id}/appStoreVersions?limit=5&fields[appStoreVersions]=versionString,appVersionState,copyright,usesIdfa`,
  );
  const version =
    versions.data.find((v) => v.attributes.appVersionState === "PREPARE_FOR_SUBMISSION") ||
    versions.data[0];
  console.log(`  версия ${version.attributes.versionString} [${version.attributes.appVersionState}]`);
  line("copyright", version.attributes.copyright);
  line("usesIdfa", String(version.attributes.usesIdfa), version.attributes.usesIdfa != null);

  const build = await asc(
    `/v1/appStoreVersions/${version.id}/build?fields[builds]=version,processingState,usesNonExemptEncryption`,
  );
  line(
    "привязанный билд",
    build.data && `build ${build.data.attributes.version} [${build.data.attributes.processingState}]`,
  );
  line(
    "export compliance",
    build.data && String(build.data.attributes.usesNonExemptEncryption),
    build.data?.attributes.usesNonExemptEncryption != null,
  );

  const locs = await asc(
    `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?fields[appStoreVersionLocalizations]=locale,description,keywords,supportUrl&limit=10`,
  );
  for (const loc of locs.data) {
    const a = loc.attributes;
    line(`описание ${a.locale}`, a.description && `${[...a.description].length} симв.`);
    line(`ключевые слова ${a.locale}`, a.keywords);
    line(`support URL ${a.locale}`, a.supportUrl);
    const sets = await asc(`/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets?include=appScreenshots`);
    const shots = (sets.included || []).length;
    line(`скриншоты ${a.locale}`, `${shots} шт. в ${sets.data.length} наборах`, shots > 0);
  }

  // --- App Review Information ---
  const detail = await asc(`/v1/appStoreVersions/${version.id}/appStoreReviewDetail`);
  const d = detail.data?.attributes;
  line("контакт ревью", d && `${d.contactFirstName} ${d.contactLastName} <${d.contactEmail}> ${d.contactPhone}`);
  line("демо-аккаунт", d?.demoAccountName);
  line("пароль демо", d?.demoAccountPassword ? "задан" : null);
  line("заметки ревьюеру", d?.notes && `${[...d.notes].length} симв.`);

  // --- Pricing and Availability ---
  const price = await asc(
    `/v1/appPriceSchedules/${app.id}?include=baseTerritory,manualPrices&limit[manualPrices]=1`,
  );
  const base = price.data.relationships.baseTerritory.data?.id;
  const auto = await asc(`/v1/appPriceSchedules/${app.id}/automaticPrices?limit=1`);
  line(
    "расписание цен",
    base && `база ${base}, территорий с ценой ${1 + (auto.meta?.paging?.total ?? 0)}`,
  );

  let avail = null;
  try {
    avail = await asc(`/v2/appAvailabilities/${app.id}?include=territoryAvailabilities&limit[territoryAvailabilities]=1`);
  } catch {
    /* записи нет — appAvailabilities отдаёт 404, а не пустой объект */
  }
  line(
    "территории продажи",
    avail &&
      `${avail.data.relationships.territoryAvailabilities.meta.paging.total} шт., новые территории: ${avail.data.attributes.availableInNewTerritories}`,
  );

  // --- Подписки ---
  // Новую группу Apple не принимает саму по себе: «New subscription groups must
  // be submitted with an auto-renewable subscription from within that group».
  // Поэтому проверяем не только заполненность товара, но и то, что он лежит
  // элементом в той же отправке, что и версия приложения.
  const submissionEntities = new Map();
  const groups = await asc(`/v1/apps/${app.id}/subscriptionGroups?limit=50`);
  for (const group of groups.data) {
    console.log(`  группа подписок «${group.attributes.referenceName}»`);

    const groupLocs = await asc(
      `/v1/subscriptionGroups/${group.id}/subscriptionGroupLocalizations?limit=20`,
    );
    for (const loc of groupLocs.data) {
      line(`  название группы ${loc.attributes.locale}`, loc.attributes.name);
    }
    const groupVersions = await asc(`/v1/subscriptionGroups/${group.id}/versions?limit=5`);
    for (const v of groupVersions.data) submissionEntities.set(v.id, `группа «${group.attributes.referenceName}»`);

    const subs = await asc(`/v1/subscriptionGroups/${group.id}/subscriptions?limit=50`);
    for (const sub of subs.data) {
      const a = sub.attributes;
      console.log(`  подписка ${a.productId} [${a.state}]`);
      line("  период", a.subscriptionPeriod);
      line("  заметки ревьюеру", a.reviewNote && `${[...a.reviewNote].length} симв.`);

      const subLocs = await asc(`/v1/subscriptions/${sub.id}/subscriptionLocalizations?limit=20`);
      line("  локализации", subLocs.data.length && `${subLocs.data.length} шт.`, subLocs.data.length > 0);
      for (const loc of subLocs.data) {
        const la = loc.attributes;
        line(`  название ${la.locale}`, la.name);
        line(`  описание ${la.locale}`, la.description);
      }

      const prices = await ascAll(
        `/v1/subscriptions/${sub.id}/prices?include=territory,subscriptionPricePoint&limit=200`,
      );
      const points = new Map(
        prices.included
          .filter((i) => i.type === "subscriptionPricePoints")
          .map((i) => [i.id, i.attributes]),
      );
      const usaRow = prices.data.find((p) => p.relationships?.territory?.data?.id === "USA");
      const usa = usaRow && points.get(usaRow.relationships?.subscriptionPricePoint?.data?.id);
      line(
        "  цена",
        usa && `${usa.customerPrice} USD, территорий ${prices.data.length}`,
        Boolean(usa),
      );

      const offers = await ascAll(`/v1/subscriptions/${sub.id}/introductoryOffers?limit=200`);
      const kinds = [
        ...new Set(
          offers.data.map(
            (o) => `${o.attributes.offerMode} ${o.attributes.duration} x${o.attributes.numberOfPeriods}`,
          ),
        ),
      ];
      // Вводный оффер не обязателен для ревью — печатаем как факт, а не как долг.
      console.log(
        `  --   ${"вводный оффер".padEnd(26)} ${kinds.length ? `${kinds.join(", ")} на ${offers.data.length} территориях` : "нет"}`,
      );

      // Скриншот экрана покупки обязателен: без него подписку не примут.
      const shot = await asc(`/v1/subscriptions/${sub.id}/appStoreReviewScreenshot`);
      const sa = shot.data?.attributes;
      line(
        "  скриншот для ревью",
        sa && `${sa.imageAsset?.width}x${sa.imageAsset?.height} [${sa.assetDeliveryState?.state}]`,
        sa?.assetDeliveryState?.state === "COMPLETE",
      );

      const subVersions = await asc(`/v1/subscriptions/${sub.id}/versions?limit=5`);
      for (const v of subVersions.data) submissionEntities.set(v.id, a.productId);
    }
  }

  // --- Отправка на ревью ---
  if (submissionEntities.size) {
    const subm = await asc(`/v1/reviewSubmissions?filter[app]=${app.id}&limit=20`);
    const draft = subm.data.find((s) => !s.attributes.submittedDate);
    if (!draft) {
      line("черновик отправки", null);
    } else {
      const items = await asc(`/v1/reviewSubmissions/${draft.id}/items?include=appStoreVersion&limit=50`);
      // Версию API отдаёт связью, а подписку — нет. Её приходится узнавать по
      // идентификатору элемента: это base64url от «отправка|тип|сущность»,
      // и хвост совпадает с id версии подписки или группы.
      const entities = new Set(
        items.data.map((i) => Buffer.from(i.id, "base64url").toString().split("|")[2]),
      );
      const inVersion = items.data.some(
        (i) => i.relationships?.appStoreVersion?.data?.id === version.id,
      );
      console.log(`  черновик отправки ${draft.id} [${draft.attributes.state}], элементов ${items.data.length}`);
      line("  версия приложения", inVersion ? version.attributes.versionString : null, inVersion);
      for (const [entity, label] of submissionEntities) {
        line(`  ${label}`, entities.has(entity) ? "в отправке" : null, entities.has(entity));
      }
      console.log(`  --   ${"подтверждена".padEnd(26)} нет — кнопка в App Store Connect`);
    }
  }
}

console.log(
  problems
    ? `\nНЕ ЗАПОЛНЕНО полей: ${problems} — смотрите строки с «НЕТ»`
    : "\nвсё, что отдаёт API, заполнено; в Console остаётся только App Privacy",
);
console.log(
  "App Privacy (сбор данных) в API отсутствует: App Store Connect → приложение → App Privacy.",
);
process.exit(problems ? 1 : 0);
