// Регистрация Bundle ID в Apple Developer Portal через App Store Connect API.
// Использует командный API-ключ (fastlane/AuthKey_<keyId>.p8). Пароль Apple ID не нужен.
//
// Запуск: node fastlane/asc-bundle.mjs
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

const KEY_ID = "TRS8NZAGX5";
const ISSUER_ID = "31303d35-0acc-4d1a-89d4-872e31f2b28f";
const P8_PATH = "fastlane/AuthKey_TRS8NZAGX5.p8";
const BASE = "https://api.appstoreconnect.apple.com";

const BUNDLE_ID = "ai.skyforest.app";
const BUNDLE_NAME = "SkyForest";
const CAPABILITIES = ["PUSH_NOTIFICATIONS", "ASSOCIATED_DOMAINS"];

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
  const key = readFileSync(P8_PATH, "utf8");
  const signer = createSign("SHA256");
  signer.update(signingInput);
  // JOSE требует подпись в формате IEEE P1363 (r||s), а не DER.
  const signature = signer.sign({ key, dsaEncoding: "ieee-p1363" });
  return `${signingInput}.${b64url(signature)}`;
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${makeToken()}`,
      "Content-Type": "application/json",
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
  return { status: res.status, json };
}

async function findBundle() {
  const { status, json } = await api(
    "GET",
    `/v1/bundleIds?filter[identifier]=${encodeURIComponent(BUNDLE_ID)}&include=bundleIdCapabilities`,
  );
  if (status !== 200) throw new Error(`list bundleIds failed: ${status} ${JSON.stringify(json)}`);
  return json.data?.[0] || null;
}

async function createBundle() {
  const { status, json } = await api("POST", "/v1/bundleIds", {
    data: {
      type: "bundleIds",
      attributes: { identifier: BUNDLE_ID, name: BUNDLE_NAME, platform: "IOS" },
    },
  });
  if (status !== 201) throw new Error(`create bundleId failed: ${status} ${JSON.stringify(json)}`);
  return json.data;
}

async function enableCapability(bundleId, capabilityType) {
  const { status, json } = await api("POST", "/v1/bundleIdCapabilities", {
    data: {
      type: "bundleIdCapabilities",
      attributes: { capabilityType },
      relationships: {
        bundleId: { data: { type: "bundleIds", id: bundleId } },
      },
    },
  });
  // 409 = уже включено — это ок.
  if (status !== 201 && status !== 409) {
    console.warn(`  ! ${capabilityType}: ${status} ${JSON.stringify(json)}`);
    return false;
  }
  return true;
}

async function main() {
  let bundle = await findBundle();
  if (bundle) {
    console.log(`Bundle ID уже существует: ${bundle.attributes.identifier} (id=${bundle.id})`);
  } else {
    bundle = await createBundle();
    console.log(`Bundle ID создан: ${bundle.attributes.identifier} (id=${bundle.id})`);
  }
  for (const cap of CAPABILITIES) {
    const ok = await enableCapability(bundle.id, cap);
    console.log(`  capability ${cap}: ${ok ? "on" : "skip/err"}`);
  }
  console.log("BUNDLE_INTERNAL_ID=" + bundle.id);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
