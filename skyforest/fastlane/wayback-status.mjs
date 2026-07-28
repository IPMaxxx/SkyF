// Состояние WayBack в App Store Connect: есть ли запись приложения, какие
// билды загружены, какие бета-группы и тестировщики есть.
// Запуск из каталога skyforest: node fastlane/wayback-status.mjs
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

const KEY_ID = "TRS8NZAGX5";
const ISSUER_ID = "31303d35-0acc-4d1a-89d4-872e31f2b28f";
const P8_PATH = "fastlane/AuthKey_TRS8NZAGX5.p8";
const BASE = "https://api.appstoreconnect.apple.com";
const BUNDLE = "ai.skyforest.wayback";

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
function makeToken() {
  const header = { alg: "ES256", kid: KEY_ID, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 600,
    aud: "appstoreconnect-v1",
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signer = createSign("SHA256");
  signer.update(signingInput);
  const signature = signer.sign({
    key: readFileSync(P8_PATH, "utf8"),
    dsaEncoding: "ieee-p1363",
  });
  return `${signingInput}.${b64url(signature)}`;
}
async function api(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${makeToken()}` },
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

const apps = await api(
  `/v1/apps?filter[bundleId]=${BUNDLE}&fields[apps]=name,bundleId,sku`,
);
const app = apps.json.data?.[0];
if (!app) {
  console.log(`ЗАПИСИ НЕТ: приложение с bundle id ${BUNDLE} не найдено в ASC`);
  console.log(`ответ: ${apps.status} ${JSON.stringify(apps.json).slice(0, 300)}`);
  process.exit(0);
}
console.log(`приложение: ${app.attributes.name} (id=${app.id})`);

const builds = await api(
  `/v1/builds?filter[app]=${app.id}&fields[builds]=version,processingState,expired,uploadedDate&sort=-uploadedDate&limit=10`,
);
const list = builds.json.data || [];
console.log(`билдов: ${list.length}`);
for (const b of list) {
  const a = b.attributes;
  console.log(
    `  build ${a.version} [${a.processingState}]${a.expired ? " EXPIRED" : ""} ${a.uploadedDate || ""}`,
  );
}

const groups = await api(
  `/v1/betaGroups?filter[app]=${app.id}&fields[betaGroups]=name,isInternalGroup,publicLinkEnabled&limit=20`,
);
console.log(`бета-группы:`);
for (const g of groups.json.data || []) {
  console.log(
    `  ${g.attributes.name} (${g.attributes.isInternalGroup ? "internal" : "external"}) id=${g.id}`,
  );
}

const testers = await api(
  `/v1/betaTesters?filter[apps]=${app.id}&fields[betaTesters]=email,firstName,inviteType,state&limit=50`,
);
console.log(`тестировщики: ${(testers.json.data || []).length}`);
for (const t of testers.json.data || []) {
  console.log(`  ${t.attributes.email} [${t.attributes.state || "-"}]`);
}
