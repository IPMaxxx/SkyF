#!/usr/bin/env node
/**
 * Полная сводка по WayBack в Google Play: всё, что Android Publisher API v3
 * вообще отдаёт на чтение. Скрипт ничего не меняет — только GET-запросы.
 *
 * Запуск из каталога skyforest:
 *   node fastlane/wayback-play-audit.mjs
 *
 * Разделы Play Console, которых в API нет ни на чтение, ни на запись
 * (проверено по discovery-документу, список методов — в конце вывода):
 * Privacy policy, Content rating (IARC), Target audience, App access,
 * декларации Ads / Financial features / Health. Их состояние из кода узнать
 * нельзя, только глазами в консоли.
 */
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";
import { createHash } from "node:crypto";

const PKG = process.env.PLAY_PKG || "ai.skyforest.wayback";
const LOCALE = "en-US";
const HERE = new URL("./", import.meta.url);
const sa = JSON.parse(readFileSync(new URL("./play-service-account.json", HERE), "utf8"));
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: "RS256", typ: "JWT" });
  const claims = b64url({
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
  if (!res.ok) throw new Error(`token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

const token = await accessToken();
const ROOT = "https://androidpublisher.googleapis.com/androidpublisher/v3";
async function api(method, path) {
  const res = await fetch(`${ROOT}${path}`, { method, headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

const APP = `/applications/${PKG}`;
console.log(`пакет ${PKG}\nсервисный аккаунт ${sa.client_email}\n`);

const edit = await api("POST", `${APP}/edits`);
if (!edit.ok) throw new Error(`не создался edit: ${edit.status} ${JSON.stringify(edit.data)}`);
const E = edit.data.id;

try {
  console.log("===== edits.details (Store settings → Contact details) =====");
  const details = await api("GET", `${APP}/edits/${E}/details`);
  for (const key of ["defaultLanguage", "contactEmail", "contactPhone", "contactWebsite"]) {
    console.log(`  ${key.padEnd(16)} ${details.data[key] ?? "(пусто)"}`);
  }

  console.log("\n===== edits.listings (Main store listing) =====");
  const listings = await api("GET", `${APP}/edits/${E}/listings`);
  for (const l of listings.data.listings || []) {
    console.log(`  локаль ${l.language}`);
    console.log(`    title            ${[...(l.title || "")].length}/30   ${JSON.stringify(l.title || "")}`);
    console.log(`    shortDescription ${[...(l.shortDescription || "")].length}/80   ${JSON.stringify(l.shortDescription || "")}`);
    console.log(`    fullDescription  ${[...(l.fullDescription || "")].length}/4000`);
    console.log(`    video            ${l.video || "(пусто)"}`);
  }

  console.log("\n===== edits.images (графика) =====");
  const IMAGE_TYPES = [
    "icon",
    "featureGraphic",
    "phoneScreenshots",
    "sevenInchScreenshots",
    "tenInchScreenshots",
    "tvScreenshots",
    "wearScreenshots",
    "tvBanner",
  ];
  for (const lang of (listings.data.listings || []).map((l) => l.language)) {
    for (const type of IMAGE_TYPES) {
      const imgs = await api("GET", `${APP}/edits/${E}/listings/${lang}/${type}`);
      const list = imgs.data.images || [];
      if (!list.length) {
        console.log(`  ${lang} ${type.padEnd(22)} —`);
        continue;
      }
      console.log(`  ${lang} ${type.padEnd(22)} ${list.length} шт.`);
      for (const im of list) console.log(`      sha256 ${im.sha256}  ${im.url}`);
    }
  }

  console.log("\n===== edits.tracks (Releases) =====");
  const tracks = await api("GET", `${APP}/edits/${E}/tracks`);
  for (const t of tracks.data.tracks || []) {
    const releases = t.releases || [];
    console.log(`  трек ${t.track}: ${releases.length ? "" : "(релизов нет)"}`);
    for (const r of releases) {
      console.log(
        `    релиз "${r.name}" [${r.status}] versionCodes=${(r.versionCodes || []).join(",")}` +
          (r.userFraction != null ? ` userFraction=${r.userFraction}` : ""),
      );
      const notes = r.releaseNotes || [];
      if (!notes.length) console.log("      releaseNotes: (пусто)");
      for (const n of notes) console.log(`      releaseNotes[${n.language}]: ${JSON.stringify(n.text.slice(0, 90))}…`);
    }
    const avail = await api("GET", `${APP}/edits/${E}/countryAvailability/${t.track}`);
    if (avail.ok) {
      const c = avail.data;
      console.log(`      countryAvailability: syncWithProduction=${c.syncWithProduction} стран=${(c.countries || []).length} restOfWorld=${c.restOfWorld}`);
    } else {
      console.log(`      countryAvailability: HTTP ${avail.status}`);
    }
    const testers = await api("GET", `${APP}/edits/${E}/testers/${t.track}`);
    if (testers.ok && (testers.data.googleGroups || []).length) {
      console.log(`      testers googleGroups: ${testers.data.googleGroups.join(", ")}`);
    }
  }

  console.log("\n===== edits.bundles / edits.apks (что загружено) =====");
  const bundles = await api("GET", `${APP}/edits/${E}/bundles`);
  for (const b of bundles.data.bundle || []) console.log(`  bundle versionCode=${b.versionCode} sha256=${b.sha256}`);
  const apks = await api("GET", `${APP}/edits/${E}/apks`);
  for (const a of apks.data.apks || []) console.log(`  apk versionCode=${a.versionCode}`);

  console.log("\n===== edits.validate =====");
  const val = await api("POST", `${APP}/edits/${E}:validate`);
  console.log(`  HTTP ${val.status} ${JSON.stringify(val.data).slice(0, 400)}`);
} finally {
  await api("DELETE", `${APP}/edits/${E}`);
}

console.log("\n===== monetization.subscriptions =====");
const subs = await api("GET", `${APP}/subscriptions?pageSize=50`);
for (const sub of subs.data.subscriptions || []) {
  console.log(`\n  продукт ${sub.productId}  archived=${sub.archived ?? false}`);
  for (const l of sub.listings || []) {
    console.log(`    листинг ${l.languageCode}: title=${JSON.stringify(l.title)}`);
    console.log(`      description=${JSON.stringify(l.description || "")}`);
    console.log(`      benefits=${JSON.stringify(l.benefits || [])}`);
  }
  console.log(`    taxAndComplianceSettings=${JSON.stringify(sub.taxAndComplianceSettings || {})}`);
  console.log(`    restrictedPaymentCountries=${JSON.stringify(sub.restrictedPaymentCountries || {})}`);
  for (const bp of sub.basePlans || []) {
    const arbp = bp.autoRenewingBasePlanType || {};
    console.log(
      `    базовый план ${bp.basePlanId} [${bp.state}] период=${arbp.billingPeriodDuration || "?"}` +
        ` grace=${arbp.gracePeriodDuration || "-"} resubscribe=${arbp.resubscribeState || "-"}` +
        ` proration=${arbp.prorationMode || "-"} legacyCompat=${arbp.legacyCompatible ?? "-"}`,
    );
    const regions = bp.regionalConfigs || [];
    const us = regions.find((r) => r.regionCode === "US");
    console.log(
      `      регионов=${regions.length}  US=${us ? `${us.price?.units}.${String(us.price?.nanos || 0).padStart(9, "0").slice(0, 2)} ${us.price?.currencyCode} newSubs=${us.newSubscriberAvailability}` : "нет"}`,
    );
    console.log(`      otherRegionsConfig=${JSON.stringify(bp.otherRegionsConfig || {})}`);
    console.log(`      offerTags=${JSON.stringify(bp.offerTags || [])}`);
    const offers = await api("GET", `${APP}/subscriptions/${sub.productId}/basePlans/${bp.basePlanId}/offers?pageSize=50`);
    for (const off of offers.data.subscriptionOffers || []) {
      console.log(`      оффер ${off.offerId} [${off.state}] tags=${JSON.stringify(off.offerTags || [])}`);
      for (const ph of off.phases || []) {
        console.log(
          `        фаза duration=${ph.duration} recurrenceCount=${ph.recurrenceCount ?? "-"} ` +
            `regions=${(ph.regionalConfigs || []).length} ` +
            `free=${(ph.regionalConfigs || [])[0]?.free ? "да" : "нет"} ` +
            `absolute=${JSON.stringify((ph.regionalConfigs || [])[0]?.absolutePrice || null)}`,
        );
      }
      console.log(`        targeting=${JSON.stringify(off.targeting || {})}`);
      console.log(`        otherRegionsConfig=${JSON.stringify(off.otherRegionsConfig || {})}`);
      console.log(`        регионов у оффера=${(off.regionalConfigs || []).length}`);
    }
  }
}

console.log("\n===== inappproducts (разовые покупки) =====");
const iap = await api("GET", `${APP}/inappproducts`);
console.log(`  HTTP ${iap.status}: ${(iap.data.inappproduct || []).map((p) => p.sku).join(", ") || "нет"}`);

console.log("\n===== monetization.onetimeproducts =====");
const otp = await api("GET", `${APP}/oneTimeProducts`);
console.log(`  HTTP ${otp.status}: ${(otp.data.oneTimeProducts || []).map((p) => p.productId).join(", ") || "нет"}`);

console.log("\n===== applications.deviceTierConfigs =====");
const dtc = await api("GET", `${APP}/deviceTierConfigs`);
console.log(`  HTTP ${dtc.status}: ${JSON.stringify(dtc.data).slice(0, 200)}`);

console.log("\n===== reviews (отзывы) =====");
const reviews = await api("GET", `${APP}/reviews`);
console.log(`  HTTP ${reviews.status}: ${(reviews.data.reviews || []).length} шт.`);

console.log("\n===== чего в API нет (проверено по discovery) =====");
for (const line of [
  "Privacy policy URL           — только ручной ввод в Play Console",
  "Content rating / IARC        — только анкета в Play Console",
  "Target audience and content  — только Play Console",
  "App access (демо-аккаунт)    — только Play Console",
  "Ads declaration              — только Play Console",
  "Financial features           — только Play Console",
  "Health apps declaration      — только Play Console",
  "Government apps              — только Play Console",
  "Data safety                  — POST applications.dataSafety есть, GET нет",
]) {
  console.log(`  ${line}`);
}
