// Загрузка скриншотов в App Store Connect (набор APP_IPHONE_69).
// Usage: node fastlane/asc-screenshots.mjs <localizationId> <displayType> <file1> [file2...]
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createSign, createHash } from "node:crypto";

const KEY_ID = "TRS8NZAGX5";
const ISSUER_ID = "31303d35-0acc-4d1a-89d4-872e31f2b28f";
const P8_PATH = new URL("./AuthKey_TRS8NZAGX5.p8", import.meta.url);
const BASE = "https://api.appstoreconnect.apple.com";

const b64url = (input) => Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

function makeToken() {
  const header = { alg: "ES256", kid: KEY_ID, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 600, aud: "appstoreconnect-v1" };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const key = readFileSync(P8_PATH, "utf8");
  const signer = createSign("SHA256");
  signer.update(signingInput);
  return `${signingInput}.${b64url(signer.sign({ key, dsaEncoding: "ieee-p1363" }))}`;
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${makeToken()}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

const [locId, displayType, ...files] = process.argv.slice(2);
if (!locId || !displayType || !files.length) {
  console.error("usage: asc-screenshots.mjs <localizationId> <displayType> <files...>");
  process.exit(2);
}

// Найти или создать набор нужного типа.
const sets = await api("GET", `/v1/appStoreVersionLocalizations/${locId}/appScreenshotSets`);
let set = sets.data.find((s) => s.attributes.screenshotDisplayType === displayType);
if (!set) {
  const created = await api("POST", "/v1/appScreenshotSets", {
    data: {
      type: "appScreenshotSets",
      attributes: { screenshotDisplayType: displayType },
      relationships: {
        appStoreVersionLocalization: { data: { type: "appStoreVersionLocalizations", id: locId } },
      },
    },
  });
  set = created.data;
  console.log(`created set ${displayType}: ${set.id}`);
} else {
  console.log(`existing set ${displayType}: ${set.id}`);
}

for (const file of files) {
  const buf = readFileSync(file);
  const name = basename(file);
  const reserved = await api("POST", "/v1/appScreenshots", {
    data: {
      type: "appScreenshots",
      attributes: { fileName: name, fileSize: buf.length },
      relationships: { appScreenshotSet: { data: { type: "appScreenshotSets", id: set.id } } },
    },
  });
  const shot = reserved.data;
  for (const op of shot.attributes.uploadOperations) {
    const chunk = buf.subarray(op.offset, op.offset + op.length);
    const headers = Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value]));
    const res = await fetch(op.url, { method: op.method, headers, body: chunk });
    if (!res.ok) throw new Error(`upload chunk failed: ${res.status} ${await res.text()}`);
  }
  const md5 = createHash("md5").update(buf).digest("hex");
  await api("PATCH", `/v1/appScreenshots/${shot.id}`, {
    data: {
      type: "appScreenshots",
      id: shot.id,
      attributes: { uploaded: true, sourceFileChecksum: md5 },
    },
  });
  console.log(`uploaded ${name} -> ${shot.id}`);
}
console.log("done");
