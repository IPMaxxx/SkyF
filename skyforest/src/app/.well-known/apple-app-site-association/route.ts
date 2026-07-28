import { flavorFromHost } from "@/lib/appFlavor";
import { appleAppSiteAssociation } from "@/lib/appLinks";

/**
 * Universal links: iOS скачивает этот файл при установке приложения.
 *
 * Роут, а не файл в `public/`, потому что домен один на три приложения, а
 * адрес файла фиксирован: содержимое выбирается по хосту запроса.
 *
 * Требования Apple, которые здесь важны: расширения у пути нет,
 * `Content-Type: application/json`, ответ 200 без редиректа (за этим файлом
 * iOS не ходит по 301/302).
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const flavor = flavorFromHost(request.headers.get("host"));
  return new Response(JSON.stringify(appleAppSiteAssociation(flavor)), {
    headers: {
      "Content-Type": "application/json",
      // Только браузерный кеш: на CDN ответ зависит от хоста.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
