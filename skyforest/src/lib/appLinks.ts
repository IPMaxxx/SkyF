import type { AppFlavor } from "@/lib/appFlavor";

/**
 * Данные для связывания домена с нативными приложениями (universal links на
 * iOS, app links на Android).
 *
 * Домен один на три продукта — `skyforest.ai`, `checker.skyforest.ai`,
 * `wayback.skyforest.ai` обслуживает один и тот же деплой, — а файлы
 * `/.well-known/apple-app-site-association` и `/.well-known/assetlinks.json`
 * лежат по фиксированным адресам. Поэтому отдавать их из `public/` нельзя:
 * статика не знает хоста и все три домена получали бы связку с одним
 * приложением (так и было — SkyForest забирал ссылки чужих поддоменов).
 * Файлы отдают роуты `src/app/.well-known/*`, а какое приложение попадёт в
 * ответ, решает флейвор запроса.
 *
 * Отпечаток Android — это сертификат, которым Google Play подписывает
 * отдаваемые устройствам APK (Play App Signing включён), а не локальный
 * upload-ключ `fastlane/skyforest-upload.jks`. Значение берётся из Play
 * Developer API: `applications/<package>/generatedApks/<versionCode>` →
 * `certificateSha256Hash`. Локальный ключ сюда подставлять нельзя: устройство
 * увидит подпись Play и проверка не сойдётся.
 */
export type AppLinks = {
  /** `<TeamID>.<bundle id>` для apple-app-site-association. */
  appleAppId: string;
  /** Android package оболочки. */
  androidPackage: string;
  /** SHA-256 сертификата подписи, которым приложение приходит на устройство. */
  androidSha256: string;
  /**
   * Пути, которые приложение забирает себе. Пустой список = домен целиком
   * (так у SkyForest: его оболочка и есть сайт).
   */
  paths: string[];
};

/** Общий Apple Team ID всех оболочек (DEVELOPMENT_TEAM в project.pbxproj). */
const TEAM_ID = "VH4L4R7PKW";

/**
 * Что приходит в письмах подтверждения и в OAuth-редиректах. Забирать домен
 * целиком у поддоменов-приложений нельзя: тогда любая ссылка на сайт (оферта,
 * политика, письмо поддержки) открывалась бы в приложении.
 */
const AUTH_PATHS = ["/auth/confirm", "/auth/callback"];

export const APP_LINKS: Record<AppFlavor, AppLinks> = {
  skyforest: {
    appleAppId: `${TEAM_ID}.ai.skyforest.app`,
    androidPackage: "ai.skyforest.app",
    androidSha256:
      "72:57:9B:23:47:08:A3:B8:F8:B4:97:A8:82:D7:B8:02:E5:1F:A3:9C:3A:ED:FB:D2:61:D7:31:76:9A:1A:35:13",
    paths: [],
  },
  checker: {
    appleAppId: `${TEAM_ID}.ai.skyforest.mushroomchecker`,
    androidPackage: "ai.skyforest.mushroomchecker",
    androidSha256:
      "74:9B:9B:F3:B7:80:D0:20:A8:C8:19:B3:E2:23:43:FA:A1:E9:AD:4B:82:47:2A:B8:09:58:67:AF:D6:8F:28:39",
    // `/s/*` — публичная карточка «поделиться»: у владельца приложения ссылка
    // из мессенджера должна открывать приложение, а не браузер.
    paths: [...AUTH_PATHS, "/s"],
  },
  wayback: {
    appleAppId: `${TEAM_ID}.ai.skyforest.wayback`,
    androidPackage: "ai.skyforest.wayback",
    androidSha256:
      "8C:AC:A9:B3:4A:5B:A4:94:50:E5:C8:B2:27:B9:F4:66:25:47:C3:FB:AB:16:31:99:79:7F:AB:2C:73:BC:36:B9",
    paths: AUTH_PATHS,
  },
};

/**
 * apple-app-site-association для флейвора.
 *
 * Отдаём и `components` (iOS 13+), и `paths` (старый формат): современные
 * версии читают первое, остальные — второе, и оба описывают один набор.
 */
export function appleAppSiteAssociation(flavor: AppFlavor) {
  const { appleAppId, paths } = APP_LINKS[flavor];
  const wildcard = paths.length === 0;
  return {
    applinks: {
      apps: [],
      details: [
        {
          appID: appleAppId,
          appIDs: [appleAppId],
          paths: wildcard ? ["*"] : paths.flatMap((p) => [p, `${p}/*`]),
          components: wildcard
            ? [{ "/": "*" }]
            : paths.flatMap((p) => [{ "/": p }, { "/": `${p}/*` }]),
        },
      ],
    },
  };
}

/** assetlinks.json для флейвора (пути задаёт intent-filter, не файл). */
export function assetLinks(flavor: AppFlavor) {
  const { androidPackage, androidSha256 } = APP_LINKS[flavor];
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: androidPackage,
        sha256_cert_fingerprints: [androidSha256],
      },
    },
  ];
}
