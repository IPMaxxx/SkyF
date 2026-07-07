// Разовый статус билдов SkyForest + состояние beta review submissions.
// Запуск из каталога skyforest: node fastlane/check-builds.mjs
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

const KEY_ID = "TRS8NZAGX5";
const ISSUER_ID = "31303d35-0acc-4d1a-89d4-872e31f2b28f";
const P8_PATH = "fastlane/AuthKey_TRS8NZAGX5.p8";
const BASE = "https://api.appstoreconnect.apple.com";
const APP = "6786255697";

function b64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function makeToken() {
  const header = { alg: "ES256", kid: KEY_ID, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 600, aud: "appstoreconnect-v1" };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const key = readFileSync(P8_PATH, "utf8");
  const signer = createSign("SHA256");
  signer.update(signingInput);
  const signature = signer.sign({ key, dsaEncoding: "ieee-p1363" });
  return `${signingInput}.${b64url(signature)}`;
}
async function api(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${makeToken()}` },
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

const builds = await api(
  `/v1/builds?filter[app]=${APP}&fields[builds]=version,processingState,expired&sort=-uploadedDate&limit=10`,
);
for (const b of builds.json.data || []) {
  console.log(`build ${b.attributes.version} [${b.attributes.processingState}]${b.attributes.expired ? " EXPIRED" : ""} id=${b.id}`);
}

const subs = await api(
  `/v1/betaAppReviewSubmissions?filter[app]=${APP}&include=build&fields[builds]=version&limit=10`,
);
const verById = {};
for (const inc of subs.json.included || []) verById[inc.id] = inc.attributes?.version;
for (const s of subs.json.data || []) {
  const bid = s.relationships?.build?.data?.id;
  console.log(`submission build=${verById[bid] || bid} state=${s.attributes?.betaReviewState}`);
}
