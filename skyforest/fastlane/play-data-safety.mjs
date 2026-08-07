#!/usr/bin/env node
/**
 * Data safety (раздел «Безопасность данных») в Google Play для всех трёх
 * приложений: SkyForest, Mushroom Checker и WayBack.
 *
 * Вопреки распространённому мнению, форма закрывается через API: метод
 * `androidpublisher.applications.dataSafety` принимает тот же CSV, который
 * Play Console даёт выгрузить и загрузить руками. Читать декларацию обратно
 * API не умеет (метод только POST), поэтому проверка здесь двойная: Google
 * валидирует весь файл целиком и отказывает с перечнем ошибок, а глазами
 * итог видно в Play Console → Policy → App content → Data safety.
 *
 * Что объявляем и почему — ниже в `DECLARATIONS`. Основание: опубликованные
 * политики конфиденциальности (checker.skyforest.ai/privacy,
 * wayback.skyforest.ai/privacy) и код:
 *   - аккаунт Supabase даёт имя, почту и идентификатор пользователя;
 *   - записи о подписке лежат на сервере (`/api/subscription`);
 *   - на каждой странице работают Google Analytics и Яндекс.Метрика, значит
 *     взаимодействия и идентификатор устройства собираются для аналитики;
 *   - Checker грузит фотографию на сервер — без этого распознавания нет;
 *   - WayBack пишет путь по GPS, и завершённый поход уходит в таблицу `tracks`
 *     Supabase (см. src/lib/trackHistory.ts). Активный поход действительно
 *     лежит только на устройстве, но история — на сервере, а вход в WayBack
 *     обязателен, поэтому точное местоположение объявлено как собираемое.
 *     Раньше здесь стояло обратное — это была ошибка декларации, а не
 *     следствие фоновой записи.
 *   - вместе с точным WayBack объявляет и приблизительное местоположение.
 *     Заявлять только точное было ошибкой, и Google отклонил публикацию
 *     versionCode 6 с формулировкой «Location Data Type - Approximate
 *     Location». Основание — не формальность: `ACCESS_COARSE_LOCATION` стоит
 *     в манифесте (apps/wayback/android/.../AndroidManifest.xml) и доезжает до
 *     бандла, а `TrackServicePlugin` считает обязательным именно его — при
 *     отказе от «точного» запись продолжается по грубым координатам fused-
 *     провайдера, и такой трек так же уходит в `tracks`. Убрать разрешение
 *     нельзя: с targetSdk 31+ запрос ACCESS_FINE_LOCATION без ACCESS_COARSE_
 *     LOCATION система игнорирует.
 *   - SkyForest сюда добавлен последним и по той же причине, только хуже.
 *     Его форму когда-то заполнили руками в консоли ответом «приложение не
 *     собирает никаких данных», и это опубликовано на
 *     play.google.com/store/apps/datasafety?id=ai.skyforest.app. Приложение при
 *     этом просит оба местоположения и камеру, заводит аккаунт Supabase,
 *     заливает фотографии в бакет `best-day-photos`, пишет треки в `tracks`,
 *     держит переписку торговой площадки и продаёт токены с подписками. То есть
 *     это ровно тот состав, за который отклонили WayBack, только шире.
 *
 * Ещё два типа данных общие и появились не из разрешений, а из кода:
 *   - фотография, трек или подписка есть не у всех, а счётчики есть у всех:
 *     нативные оболочки грузят живой сайт (`server.url` в capacitor.config), и
 *     Яндекс.Метрика с Google Analytics из `src/app/layout.tsx` работают внутри
 *     приложения так же, как в браузере;
 *   - `src/lib/native/iap.ts` при сбое покупки сам шлёт на `/api/native/iap/log`
 *     стадию, код и текст ошибки. Крэш-репортера у нас нет (ни Sentry, ни
 *     Crashlytics), но эта телеметрия с устройства уходит, поэтому объявлена
 *     как «Diagnostics».
 *
 * Запуск из каталога skyforest:
 *   node fastlane/play-data-safety.mjs            — показать сводку и CSV-диф
 *   node fastlane/play-data-safety.mjs --apply    — отправить в Google Play
 *   … --pkg ai.skyforest.wayback                  — только одно приложение
 *
 * Фильтр по пакету нужен, когда декларация поменялась у одного приложения:
 * отправка перетирает форму целиком, и лишний раз трогать соседнюю, которая
 * уже прошла ревью, незачем. Руками формы больше не заполняются ни у одного из
 * трёх приложений — источник истины здесь.
 */
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";
import { pathToFileURL } from "node:url";

const APPLY = process.argv.includes("--apply");
const PKG_ARG = process.argv[process.argv.indexOf("--pkg") + 1];
const ONLY_PKG = process.argv.includes("--pkg") ? PKG_ARG : null;
const HERE = new URL("./", import.meta.url);

/** Цели сбора в терминах CSV — используются в таблицах ниже. */
const FUNCTIONALITY = "PSL_APP_FUNCTIONALITY";
const ANALYTICS = "PSL_ANALYTICS";
const ACCOUNT = "PSL_ACCOUNT_MANAGEMENT";
const COMMUNICATIONS = "PSL_DEVELOPER_COMMUNICATIONS";
const SECURITY = "PSL_FRAUD_PREVENTION_SECURITY";

/** Типы данных, общие для всех трёх приложений: аккаунт, подписка, аналитика. */
const SHARED_TYPES = [
  {
    type: "PSL_NAME",
    what: "Имя в профиле (или имя из Google/Apple при входе)",
    required: false,
    purposes: [FUNCTIONALITY, ACCOUNT],
  },
  {
    type: "PSL_EMAIL",
    what: "Почта аккаунта: вход, письма о подписке и восстановление пароля",
    required: true,
    purposes: [FUNCTIONALITY, ACCOUNT, COMMUNICATIONS],
  },
  {
    // К аккаунту при регистрации пишется ещё и IP (`profiles.signup_ip`,
    // /api/auth/log-signup-ip) — отдельного типа под IP в таксономии Google нет,
    // поэтому он проходит вместе с идентификатором и отмечен целью «безопасность».
    type: "PSL_USER_ACCOUNT",
    what: "Идентификатор пользователя Supabase — к нему привязано всё остальное",
    required: true,
    purposes: [FUNCTIONALITY, ACCOUNT, SECURITY],
  },
  {
    type: "PSL_PURCHASE_HISTORY",
    what: "Запись о подписке на нашей стороне (что куплено и до какого числа)",
    required: true,
    purposes: [FUNCTIONALITY, ACCOUNT],
  },
  {
    type: "PSL_USER_INTERACTION",
    what: "Просмотры экранов и нажатия — Google Analytics и Яндекс.Метрика",
    required: true,
    purposes: [ANALYTICS],
  },
  {
    type: "PSL_DEVICE_ID",
    what: "Идентификатор браузера/устройства тех же счётчиков аналитики",
    required: true,
    purposes: [ANALYTICS],
  },
  {
    type: "PSL_PERFORMANCE_DIAGNOSTICS",
    what: "Стадия, код и текст ошибки покупки — приложение шлёт их на /api/native/iap/log",
    required: true,
    purposes: [FUNCTIONALITY],
  },
];

/** Общие типы с уточнённым описанием и целями — там, где приложение шире. */
const sharedTypesWith = (overrides) =>
  SHARED_TYPES.map((t) => {
    const extra = overrides[t.type];
    if (!extra) return t;
    return { ...t, ...extra, purposes: [...new Set([...t.purposes, ...(extra.purposes || [])])] };
  });

export const DECLARATIONS = {
  "ai.skyforest.app": {
    name: "SkyForest",
    encryptedInTransit: true,
    userRequestDelete: true,
    deletionUrl: "https://skyforest.ai/delete-account",
    types: [
      // Токен пуш-уведомлений — тоже «Device or other IDs», и он есть только
      // здесь: `@capacitor/push-notifications` собран лишь в этой оболочке,
      // отсюда `com.google.android.c2dm.permission.RECEIVE` в бандле.
      ...sharedTypesWith({
        PSL_PURCHASE_HISTORY: {
          what: "Покупки на нашей стороне: пакеты токенов и подписка Forager/Pro",
        },
        PSL_DEVICE_ID: {
          what:
            "Идентификатор браузера/устройства счётчиков аналитики и токен" +
            " пуш-уведомлений — он лежит в таблице push_tokens, без него" +
            " уведомления некуда доставлять",
          purposes: [FUNCTIONALITY],
        },
      }),
      {
        // Разрешения ACCESS_FINE_LOCATION и ACCESS_COARSE_LOCATION стоят в
        // манифесте и доезжают до бандла. Координаты уходят на сервер: точки
        // на карте (таблица `locations`), завершённые треки (`tracks`), запросы
        // погоды, типа леса и поиска по лесу, центр поиска на торговой площадке.
        type: "PSL_PRECISE_LOCATION",
        what:
          "Координаты точек, которые человек сам сохраняет на карте, путь" +
          " записанного похода и точка, для которой он запрашивает погоду или" +
          " тип леса",
        required: false,
        purposes: [FUNCTIONALITY],
      },
      {
        type: "PSL_APPROX_LOCATION",
        what: "То же самое, когда выдано только «примерное» местоположение",
        required: false,
        purposes: [FUNCTIONALITY],
      },
      {
        type: "PSL_PHOTOS",
        what:
          "Фотографии грибного дня уезжают в бакет best-day-photos; человек" +
          " может опубликовать их на торговой площадке",
        required: false,
        purposes: [FUNCTIONALITY],
      },
      {
        type: "PSL_USER_GENERATED_CONTENT",
        what:
          "Названия и описания точек, заметки о грибном дне, объявления" +
          " торговой площадки",
        required: false,
        purposes: [FUNCTIONALITY],
      },
      {
        type: "PSL_OTHER_MESSAGES",
        what: "Переписка покупателя и продавца в чате торговой площадки",
        required: false,
        purposes: [FUNCTIONALITY],
      },
      {
        // Ссылка для связи (Telegram и т.п.) из профиля: её видят те, кому
        // человек сам отвечает на площадке или записывается в тур.
        type: "PSL_OTHER_PERSONAL",
        what: "Ссылка для связи в профиле, если человек её указал",
        required: false,
        purposes: [FUNCTIONALITY],
      },
    ],
  },
  "ai.skyforest.wayback": {
    name: "WayBack",
    // Данные шифруются в транзите (весь трафик — HTTPS), удаление аккаунта
    // есть в самом приложении и на странице /delete-account.
    encryptedInTransit: true,
    userRequestDelete: true,
    deletionUrl: "https://wayback.skyforest.ai/delete-account",
    types: [
      ...SHARED_TYPES,
      {
        type: "PSL_PRECISE_LOCATION",
        what:
          "Точки пути по GPS: запись идёт между «начал поход» и «вышел из леса»," +
          " в том числе со свёрнутым приложением, а завершённый поход попадает" +
          " в историю на сервере",
        required: true,
        purposes: [FUNCTIONALITY],
      },
      {
        type: "PSL_APPROX_LOCATION",
        what:
          "Тот же путь, когда человек выдал только «примерное» местоположение:" +
          " fused-провайдер отдаёт грубые координаты, запись не отменяется" +
          " и трек так же уходит в историю",
        required: true,
        purposes: [FUNCTIONALITY],
      },
    ],
  },
  "ai.skyforest.mushroomchecker": {
    name: "Mushroom Checker",
    encryptedInTransit: true,
    userRequestDelete: true,
    deletionUrl: "https://checker.skyforest.ai/delete-account",
    types: [
      ...SHARED_TYPES,
      {
        // Снимок уходит на наш сервер, тот срезает EXIF (в том числе GPS,
        // src/lib/checker/exif.ts) и передаёт картинку в Kindwise, а копию
        // кладёт в приватный бакет mushroom-photos, чтобы человек видел свою
        // историю. Kindwise — обработчик по нашему поручению, не «третье лицо»
        // в терминах Google, поэтому тип объявлен как собираемый, а не
        // передаваемый.
        type: "PSL_PHOTOS",
        what: "Фотография гриба уходит на сервер: без неё распознавания нет",
        required: true,
        purposes: [FUNCTIONALITY],
      },
    ],
  },
};

/**
 * Собирает CSV: берём пустой шаблон вопросов и проставляем `true` там, где
 * декларация приложения это утверждает. Всё, что не перечислено, остаётся
 * пустым — то есть «нет».
 */
export function buildCsv(decl) {
  const template = readFileSync(new URL("./metadata/play-data-safety-template.csv", HERE), "utf8")
    .replace(/\r/g, "")
    .split("\n")
    .filter(Boolean);

  const collected = new Set(decl.types.map((t) => t.type));
  const byType = new Map(decl.types.map((t) => [t.type, t]));

  const answer = (questionId, responseId) => {
    if (questionId === "PSL_DATA_COLLECTION_COLLECTS_PERSONAL_DATA") return true;
    if (questionId === "PSL_DATA_COLLECTION_ENCRYPTED_IN_TRANSIT") return decl.encryptedInTransit;

    // Аккаунт заводится почтой с паролем либо входом через Google или Apple.
    if (questionId === "PSL_SUPPORTED_ACCOUNT_CREATION_METHODS") {
      return responseId === "PSL_ACM_USER_ID_PASSWORD" || responseId === "PSL_ACM_OAUTH";
    }
    // Удаление аккаунта есть и в приложении, и на публичной странице.
    if (questionId === "PSL_SUPPORT_DATA_DELETION_BY_USER") {
      return responseId === (decl.userRequestDelete ? "DATA_DELETION_YES" : "DATA_DELETION_NO");
    }
    if (questionId === "PSL_ACCOUNT_DELETION_URL" || questionId === "PSL_DATA_DELETION_URL") {
      return decl.deletionUrl;
    }
    // Поле «опишите способ» относится только к варианту «Other» — Google
    // отвергает файл, если на него вообще что-то отвечено.
    if (questionId === "PSL_ACM_SPECIFY") return null;
    // Не детское приложение, независимого аудита MASA нет, индийский
    // UPI-бейдж не запрашиваем.
    if (
      questionId === "PSL_DATA_COLLECTION_COMPLIES_FAMILY_POLICY" ||
      questionId === "PSL_INDEPENDENTLY_VALIDATED" ||
      questionId === "PSL_UPI_BADGE_OPT_IN"
    ) {
      return false;
    }

    // «Какие типы данных вы собираете» — галочки в списке категорий.
    if (questionId.startsWith("PSL_DATA_TYPES_")) return collected.has(responseId);

    // «Как используется конкретный тип данных».
    const usage = questionId.match(/^PSL_DATA_USAGE_RESPONSES:([A-Z_]+):(.+)$/);
    if (!usage) return false;
    const [, dataType, question] = usage;
    const t = byType.get(dataType);
    if (!t) return false;
    switch (question) {
      case "PSL_DATA_USAGE_COLLECTION_AND_SHARING":
        // Собираем, но не передаём третьим лицам: аналитика, Supabase и сервис
        // распознавания работают как обработчики по нашему поручению. Объявление
        // и переписка на торговой площадке SkyForest видны другому человеку, но
        // это передача по прямому действию самого пользователя — у Google это
        // отдельное исключение из «sharing», а не передача третьему лицу.
        return responseId === "PSL_DATA_USAGE_ONLY_COLLECTED";
      case "PSL_DATA_USAGE_EPHEMERAL":
        return false; // данные хранятся, а не обрабатываются на лету
      case "DATA_USAGE_USER_CONTROL":
        return responseId ===
          (t.required
            ? "PSL_DATA_USAGE_USER_CONTROL_REQUIRED"
            : "PSL_DATA_USAGE_USER_CONTROL_OPTIONAL");
      case "DATA_USAGE_COLLECTION_PURPOSE":
        return t.purposes.includes(responseId);
      case "DATA_USAGE_SHARING_PURPOSE":
        return false; // ничего не передаём
      default:
        return false;
    }
  };

  const rows = [template[0]];
  let filled = 0;
  for (const line of template.slice(1)) {
    const parts = line.split(",");
    const [questionId, responseId] = parts;
    // Уточняющие вопросы о типе данных, который мы не собираем, Google
    // отвергает даже с ответом «нет»: такую строку надо просто выкинуть.
    const usage = questionId.match(/^PSL_DATA_USAGE_RESPONSES:([A-Z_]+):/);
    if (usage && !collected.has(usage[1])) continue;
    const value = answer(questionId, responseId);
    if (value === null) continue; // вопрос не задан — строку не отправляем
    // Строковые ответы (ссылки) идут в ту же колонку, что и true/false.
    parts[2] = typeof value === "string" ? value : value ? "true" : "false";
    if (value) filled += 1;
    rows.push(parts.join(","));
  }
  return { csv: `${rows.join("\n")}\n`, filled, total: rows.length - 1 };
}

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

async function accessToken() {
  // Ключ читаем здесь, а не при загрузке модуля: декларацию импортирует
  // play-data-safety-check.mjs, а ему сервисный аккаунт не нужен.
  const sa = JSON.parse(readFileSync(new URL("./play-service-account.json", HERE), "utf8"));
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

/**
 * Модуль ещё и импортируют (play-data-safety-check.mjs берёт отсюда
 * DECLARATIONS и buildCsv), поэтому отправка живёт под этой проверкой: иначе
 * проверка на пустом месте слала бы CSV в Google и завершала свой процесс.
 */
const RUN_AS_CLI = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

let failed = false;
for (const [pkg, decl] of RUN_AS_CLI ? Object.entries(DECLARATIONS) : []) {
  if (ONLY_PKG && pkg !== ONLY_PKG) continue;
  console.log(`\n===== ${decl.name} (${pkg}) =====`);
  const { csv, filled, total } = buildCsv(decl);
  console.log(`собираем ${decl.types.length} типов данных, «да» в ${filled} из ${total} строк CSV:`);
  for (const t of decl.types) {
    console.log(`  ${t.type.padEnd(24)} ${t.required ? "обязательно" : "по желанию "}  ${t.what}`);
  }
  console.log(`  шифрование в транзите: ${decl.encryptedInTransit}, удаление по запросу: ${decl.deletionUrl}`);
  console.log("  ничего не передаём третьим лицам (только сбор)");

  if (!APPLY) continue;

  const token = await accessToken();
  const res = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/dataSafety`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ safetyLabels: csv }),
    },
  );
  const text = await res.text();
  if (res.ok) {
    console.log(`  ОТПРАВЛЕНО: HTTP ${res.status} ${text.trim() || "{}"}`);
  } else {
    failed = true;
    console.log(`  ОШИБКА: HTTP ${res.status}\n${text}`);
  }
}

if (RUN_AS_CLI && !APPLY) {
  console.log("\n(сухой прогон — запустите с --apply)");
}
// Прочитать декларацию обратно API не даёт: у ресурса dataSafety есть только
// POST (GET на тот же URL отвечает 404, в discovery-документе androidpublisher
// v3 метода нет). Итог смотреть в Play Console → Policy → App content →
// Data safety. Подтверждение со стороны API — сам код 200: Google валидирует
// присланный CSV целиком и отвечает ошибкой с перечнем строк, если тип данных
// отмечен без своих уточняющих ответов или наоборот.
if (RUN_AS_CLI) process.exit(failed ? 1 : 0);
