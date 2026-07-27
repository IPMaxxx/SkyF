#!/usr/bin/env node
// Загрузка скриншотов в Google Play (по умолчанию — phoneScreenshots, en-US).
// Старые изображения этого типа удаляются: Play показывает набор целиком.
//
// Usage: node fastlane/play-screenshots.mjs <package> <lang> <imageType> <file...>
// Пример: node fastlane/play-screenshots.mjs ai.skyforest.mushroomchecker en-US phoneScreenshots docs/store-shots/checker/play/*.png
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createSign } from "node:crypto";

const sa = JSON.parse(
  readFileSync(new URL("./play-service-account.json", import.meta.url), "utf8"),
);
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

async function getAccessToken() {
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

const [pkg, lang, imageType, ...files] = process.argv.slice(2);
if (!pkg || !lang || !imageType || !files.length) {
  console.error(
    "usage: play-screenshots.mjs <package> <lang> <imageType> <files...>",
  );
  process.exit(2);
}

const API = "https://androidpublisher.googleapis.com/androidpublisher/v3";
const UPLOAD = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3";
const token = await getAccessToken();

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${text}`);
  return data;
}

const edit = await api("POST", `${API}/applications/${pkg}/edits`);
const base = `${API}/applications/${pkg}/edits/${edit.id}/listings/${lang}/${imageType}`;

await api("DELETE", base);
console.log(`cleared ${imageType} (${lang})`);

for (const file of files.sort()) {
  const buf = readFileSync(file);
  const res = await fetch(
    `${UPLOAD}/applications/${pkg}/edits/${edit.id}/listings/${lang}/${imageType}?uploadType=media`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/png" },
      body: buf,
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`upload ${file} -> ${res.status}: ${text}`);
  console.log(`uploaded ${basename(file)}`);
}

await api("POST", `${API}/applications/${pkg}/edits/${edit.id}:commit`);
console.log("committed");
