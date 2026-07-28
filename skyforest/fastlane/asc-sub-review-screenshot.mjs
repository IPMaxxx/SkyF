#!/usr/bin/env node
/**
 * Скриншот экрана покупки для ревьюера подписки (App Store Connect).
 *
 * Apple не пропускает подписку на ревью без кадра, на котором видно, что
 * именно продаётся: название тарифа, срок, цена, автопродление и ссылки на
 * условия. Кадр не показывается в сторе — он только для ревью.
 *
 * Загрузка трёхшаговая, как у обычных скриншотов версии: резервируем запись
 * (POST), заливаем байты по `uploadOperations`, подтверждаем контрольной
 * суммой (PATCH). Между шагами файл в ASC ещё не существует — не подтвердив
 * загрузку, получим запись в состоянии AWAITING_UPLOAD.
 *
 * Связь `appStoreReviewScreenshot` у подписки одна к одному, поэтому старый
 * кадр перед заливкой нового удаляется. В интерфейсе ASC удалить его нельзя,
 * только заменить, но через API DELETE проходит.
 *
 * Запуск из каталога skyforest:
 *   node fastlane/asc-sub-review-screenshot.mjs <subscriptionId> <файл.png>
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createSign, createHash } from "node:crypto";

const KEY_ID = "TRS8NZAGX5";
const ISSUER_ID = "31303d35-0acc-4d1a-89d4-872e31f2b28f";
const P8 = readFileSync(new URL("./AuthKey_TRS8NZAGX5.p8", import.meta.url), "utf8");
const BASE = "https://api.appstoreconnect.apple.com";

const b64url = (input) =>
  Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

function token() {
  const header = { alg: "ES256", kid: KEY_ID, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 600, aud: "appstoreconnect-v1" };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signer = createSign("SHA256");
  signer.update(input);
  return `${input}.${b64url(signer.sign({ key: P8, dsaEncoding: "ieee-p1363" }))}`;
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
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
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  return json;
}

const [subId, file] = process.argv.slice(2);
if (!subId || !file) {
  console.error("usage: node fastlane/asc-sub-review-screenshot.mjs <subscriptionId> <файл.png>");
  process.exit(2);
}

const buf = readFileSync(file);
const name = basename(file);

const current = await api("GET", `/v1/subscriptions/${subId}/appStoreReviewScreenshot`);
if (current.data) {
  console.log(`старый кадр ${current.data.id} (${current.data.attributes.fileName}) — удаляем`);
  await api("DELETE", `/v1/subscriptionAppStoreReviewScreenshots/${current.data.id}`);
}

const reserved = await api("POST", "/v1/subscriptionAppStoreReviewScreenshots", {
  data: {
    type: "subscriptionAppStoreReviewScreenshots",
    attributes: { fileName: name, fileSize: buf.length },
    relationships: { subscription: { data: { type: "subscriptions", id: subId } } },
  },
});
const shot = reserved.data;
console.log(`зарезервировано ${shot.id}, операций загрузки: ${shot.attributes.uploadOperations.length}`);

for (const op of shot.attributes.uploadOperations) {
  const headers = Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value]));
  const res = await fetch(op.url, {
    method: op.method,
    headers,
    body: buf.subarray(op.offset, op.offset + op.length),
  });
  if (!res.ok) throw new Error(`кусок ${op.offset}+${op.length}: ${res.status} ${await res.text()}`);
}

await api("PATCH", `/v1/subscriptionAppStoreReviewScreenshots/${shot.id}`, {
  data: {
    type: "subscriptionAppStoreReviewScreenshots",
    id: shot.id,
    attributes: { uploaded: true, sourceFileChecksum: createHash("md5").update(buf).digest("hex") },
  },
});

// Проверяем не ответ на запись, а перечитанное состояние: Apple обрабатывает
// файл асинхронно, и COMPLETE появляется не сразу.
for (let i = 0; i < 20; i++) {
  const check = await api("GET", `/v1/subscriptionAppStoreReviewScreenshots/${shot.id}`);
  const a = check.data.attributes;
  const state = a.assetDeliveryState?.state;
  if (state !== "UPLOAD_COMPLETE" && state !== "AWAITING_UPLOAD") {
    console.log(
      `${a.fileName} ${a.imageAsset?.width}x${a.imageAsset?.height} [${state}]` +
        (a.assetDeliveryState?.errors ? ` ошибки: ${JSON.stringify(a.assetDeliveryState.errors)}` : ""),
    );
    process.exit(state === "COMPLETE" ? 0 : 1);
  }
  await new Promise((r) => setTimeout(r, 3000));
}
console.log("файл залит, но ASC всё ещё обрабатывает его — проверьте позже");
