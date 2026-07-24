#!/usr/bin/env node
// Показать/обновить store listing в Google Play.
// Использование: node play-listings.mjs           — показать текущие листинги
//                node play-listings.mjs --apply   — применить обновление (см. UPDATES ниже)
import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const PKG = 'ai.skyforest.app';
const sa = JSON.parse(readFileSync(new URL('./play-service-account.json', import.meta.url), 'utf8'));
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'RS256', typ: 'JWT' });
  const claims = b64url({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  });
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const sig = signer.sign(sa.private_key).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${sig}` }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`;
async function api(token, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// lang -> { title?, shortDescription?, fullDescription? } — только заданные поля перезаписываются
const UPDATES = {
  'en-US': {
    title: 'SkyForest AI: Mushroom App',
    shortDescription: 'Best foraging days from AI weather, mushroom ID by photo & way-back tracker',
    fullDescription: `Find more mushrooms: get the best foraging days from AI weather analysis, identify any mushroom by photo, and never get lost — Track always shows the way back home.

Stop guessing when it’s time to head to the forest. SkyForest is the ultimate all-in-one assistant for modern mushroom foragers — combining complex weather data, AI recognition, and a community marketplace.

Don't rely on luck. SkyForest analyzes meteorological patterns (temperature, rain, humidity) and compares current weather with the exact conditions of your past successful trips. Whether you are an experienced forager or just starting out, our tools will help you find the perfect moment and location for a great harvest.

Everything you need in one app (Key Features):
⛅ WEATHER AT YOUR SPOTS: Save your favorite foraging coordinates. We archive and track rain, temperature, and humidity directly for your private spots.
🔔 SMART HARVEST ALERTS: Mark the date of a successful haul. We remember the 14-day weather pattern leading up to it and notify you when those exact conditions repeat.
💧 PRECIPITATION MAP: Mushrooms grow where the moisture is. Check our interactive heat map to see exactly where it rained recently in your area.
🍄 AI MUSHROOM IDENTIFIER: Found an unknown species? Snap a photo and let our smart bot recognize the mushroom — porcini, chanterelle, boletus and hundreds more — safely and instantly.
🧭 WAY BACK TRACKER: Tap “I entered the forest” and SkyForest records your walk with GPS. A compass arrow and distance always point back to your entry spot, so you never get lost in the woods.
🌲 FIND SIMILAR FORESTS: Want to explore? Search for new forests by tree species, type, and distance to discover environments just like your favorite spots.
📍 SPOT MARKETPLACE: Find new productive locations through a community marketplace featuring verified spots with exact coordinates, dates, and species from other pickers.
🥾 FORAGING TOURS: Join planned mushroom-picking trips effortlessly. Access spot auctions, coordinates, and dates directly from local organizers.

Will others see my spots?
Absolutely not. Your saved spots and weather data remain strictly private on your dashboard unless you choose to share or sell them on the marketplace.

Transform your foraging experience.
Let data, AI, and smart tracking guide you to a full basket. Download SkyForest today and never miss a mushroom wave again!`,
  },
};

const apply = process.argv.includes('--apply');
const token = await getAccessToken();
const edit = await api(token, 'POST', '/edits', {});
try {
  const listings = await api(token, 'GET', `/edits/${edit.id}/listings`);
  console.log('CURRENT:', JSON.stringify(listings, null, 2));
  if (apply) {
    for (const [lang, upd] of Object.entries(UPDATES)) {
      const current = (listings.listings || []).find((l) => l.language === lang) || {};
      const merged = { ...current, ...upd, language: lang };
      await api(token, 'PUT', `/edits/${edit.id}/listings/${lang}`, merged);
      console.log(`updated ${lang}`);
    }
    const committed = await api(token, 'POST', `/edits/${edit.id}:commit`, {});
    console.log('COMMITTED:', JSON.stringify(committed));
  } else {
    await api(token, 'DELETE', `/edits/${edit.id}`);
  }
} catch (e) {
  try { await api(token, 'DELETE', `/edits/${edit.id}`); } catch {}
  throw e;
}
