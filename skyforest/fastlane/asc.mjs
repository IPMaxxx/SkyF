// Универсальный клиент App Store Connect API для релизных операций.
// Запуск: node fastlane/asc.mjs <METHOD> <path> [json-body или @file]
// Пример: node fastlane/asc.mjs GET "/v1/apps/6786255697/appStoreVersions?limit=5"
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

const KEY_ID = "TRS8NZAGX5";
const ISSUER_ID = "31303d35-0acc-4d1a-89d4-872e31f2b28f";
const P8_PATH = new URL("./AuthKey_TRS8NZAGX5.p8", import.meta.url);
const BASE = "https://api.appstoreconnect.apple.com";

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
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 600, aud: "appstoreconnect-v1" };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const key = readFileSync(P8_PATH, "utf8");
  const signer = createSign("SHA256");
  signer.update(signingInput);
  const signature = signer.sign({ key, dsaEncoding: "ieee-p1363" });
  return `${signingInput}.${b64url(signature)}`;
}

const [method, path, bodyArg] = process.argv.slice(2);
if (!method || !path) {
  console.error("usage: node asc.mjs <METHOD> <path> [json-body | @file.json]");
  process.exit(2);
}

let body;
if (bodyArg) {
  body = bodyArg.startsWith("@") ? readFileSync(bodyArg.slice(1), "utf8") : bodyArg;
}

const res = await fetch(`${BASE}${path}`, {
  method: method.toUpperCase(),
  headers: {
    Authorization: `Bearer ${makeToken()}`,
    ...(body ? { "Content-Type": "application/json" } : {}),
  },
  body,
});
const text = await res.text();
console.log(`HTTP ${res.status}`);
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}
process.exit(res.ok ? 0 : 1);
