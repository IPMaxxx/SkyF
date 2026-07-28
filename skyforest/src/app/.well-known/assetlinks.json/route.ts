import { flavorFromHost } from "@/lib/appFlavor";
import { assetLinks } from "@/lib/appLinks";

/**
 * App links: Google проверяет этот файл, когда в манифесте стоит
 * `android:autoVerify="true"`. Как и apple-app-site-association, отдаётся
 * роутом — содержимое зависит от хоста (три приложения на одном домене).
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const flavor = flavorFromHost(request.headers.get("host"));
  return new Response(JSON.stringify(assetLinks(flavor)), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
