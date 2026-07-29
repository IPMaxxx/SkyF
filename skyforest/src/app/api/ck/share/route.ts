import { NextResponse, type NextRequest } from "next/server";
import {
  buildShareToken,
  isSharePayload,
  shareUrlPath,
  type SharePayload,
} from "@/lib/checker/share";

/**
 * Подпись ссылки «поделиться» для Mushroom Checker.
 *
 * Лежит в `api/ck/`, а не в `api/checker/`: этот сегмент попадает в
 * CHECKER_FILES из eslint.config.mjs, поэтому роуту разрешён импорт
 * `@/lib/checker/*` и границы приложений остаются проверяемыми правилом, а не
 * снятыми точечным `eslint-disable`.
 *
 * Клиент присылает то, чем хочет поделиться, и получает готовый путь
 * `/s/<токен>`: содержимое карточки едет в самом адресе, никакой записи в базе
 * не появляется. Секрет подписи живёт только здесь — на клиент он не попадает,
 * иначе подписать можно было бы что угодно.
 *
 * Роут анонимный намеренно: поделиться можно и без сессии (в нативной оболочке
 * cookie есть не всегда), а секрета в ответе нет — только результат его
 * применения к присланным данным. Никаких запросов в базу и внешние сервисы
 * здесь тоже нет, так что нагрузить его нечем.
 */

/** Секрета может не быть: тогда отдаём ссылку без подписи (см. share.ts). */
const SECRET = process.env.CHECKER_SHARE_SECRET;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { payload, locale } = (body ?? {}) as {
    payload?: unknown;
    locale?: unknown;
  };

  if (!isSharePayload(payload)) {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const token = await buildShareToken(payload as SharePayload, SECRET);
  const path = shareUrlPath(token, typeof locale === "string" ? locale : "");

  return NextResponse.json(
    { path },
    // Ответ зависит от тела запроса — кэшировать его посредникам нечего.
    { headers: { "Cache-Control": "no-store" } },
  );
}
