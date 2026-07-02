// Генерация client secret (ES256 JWT) для провайдера "Sign in with Apple".
// Этот JWT вставляется в Supabase → Authentication → Providers → Apple →
// "Secret Key (for OAuth)". Он живёт максимум 6 месяцев и требует ротации.
//
// Ключ (.p8) читается с диска, НЕ хардкодится. Секреты не хранятся в коде.
//
// Запуск:  node fastlane/apple-client-secret.mjs
//   опц.:  node fastlane/apple-client-secret.mjs <servicesId> <teamId> <keyId> <p8Path>
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

// --- Константы (можно переопределить через argv) ---
const SERVICES_ID = process.argv[2] || "ai.skyforest.signin"; // sub
const TEAM_ID = process.argv[3] || "VH4L4R7PKW"; // iss
const KEY_ID = process.argv[4] || "56H345V5ZP"; // kid
const P8_PATH = process.argv[5] || "fastlane/AuthKey_56H345V5ZP.p8";

const AUDIENCE = "https://appleid.apple.com";
const MAX_LIFETIME = 15552000; // 180 дней (Apple лимит — 6 месяцев)

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function makeClientSecret() {
  const header = { alg: "ES256", kid: KEY_ID, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + MAX_LIFETIME;
  const payload = {
    iss: TEAM_ID,
    iat: now,
    exp,
    aud: AUDIENCE,
    sub: SERVICES_ID,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const key = readFileSync(P8_PATH, "utf8");
  const signer = createSign("SHA256");
  signer.update(signingInput);
  // JOSE требует подпись в формате IEEE P1363 (r||s), а не DER.
  const signature = signer.sign({ key, dsaEncoding: "ieee-p1363" });
  return { jwt: `${signingInput}.${b64url(signature)}`, iat: now, exp };
}

const { jwt, iat, exp } = makeClientSecret();
console.log(jwt);
console.error(`\n--- meta (stderr) ---`);
console.error(`services_id (sub): ${SERVICES_ID}`);
console.error(`team_id (iss):     ${TEAM_ID}`);
console.error(`key_id (kid):      ${KEY_ID}`);
console.error(`iat:  ${iat}  (${new Date(iat * 1000).toISOString()})`);
console.error(`exp:  ${exp}  (${new Date(exp * 1000).toISOString()})`);
