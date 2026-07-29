import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { WebOnly } from "@/components/native/NativeOnly";
import { shareUrlPath, type SharePayload } from "@/lib/checker/share";
import {
  CHECKER_APP_STORE,
  CHECKER_GOOGLE_PLAY,
  findQuestLevel,
  findQuestSpecies,
  readShareToken,
} from "./card";

/**
 * Публичная карточка Mushroom Checker — то, что видит человек, которому
 * переслали ссылку.
 *
 * Страница открыта без авторизации: это ссылка для посторонних, и упереться в
 * форму входа они не должны. Всё содержимое приезжает в самом адресе
 * (`/s/<токен>`, см. src/lib/checker/share.ts), поэтому карточка ничего не
 * знает о том, кто её отправил: ни идентификатора, ни фотографии — снимки
 * лежат в приватном бакете и в публичную ссылку не попадают.
 *
 * Тексты вписаны прямо здесь, как на посадочной `ck/landing`: словарь
 * приложения (`i18n/messages/checker.*`) описывает экраны кабинета, а это
 * витрина на одну карточку.
 */

type Props = {
  params: Promise<{ locale: string; token: string }>;
};

const copy = {
  en: {
    brand: "Mushroom Checker",
    identifiedIn: "Identified in Mushroom Checker",
    levelDone: "Level complete",
    levelBadge: (n: number) => `LEVEL ${n}`,
    progress: (found: number, total: number) => `${found} of ${total} species`,
    rankTitle: "Quest progress",
    rankSubtitle: "species identified",
    neutralTitle: "Mushroom identification by photo",
    neutralText: "This card cannot be read, but the app is right here.",
    tagline:
      "Take a photo of a mushroom — AI names the species with a confidence score, warns about dangerous lookalikes and edibility.",
    foundOn: (date: string) => `Found on ${date}`,
    openInApp: "Open in the app",
    getApp: "Get the app",
    ogFind: (name: string) => `${name} — identified in Mushroom Checker`,
    ogLevel: (n: number) => `Level ${n} complete in Mushroom Checker`,
    ogRank: (found: number, total: number) =>
      `${found} of ${total} species identified in Mushroom Checker`,
  },
  ru: {
    brand: "Mushroom Checker",
    identifiedIn: "Определено в Mushroom Checker",
    levelDone: "Уровень пройден",
    levelBadge: (n: number) => `УРОВЕНЬ ${n}`,
    progress: (found: number, total: number) => `${found} из ${total} видов`,
    rankTitle: "Прогресс квестов",
    rankSubtitle: "видов определено",
    neutralTitle: "Определение грибов по фото",
    neutralText: "Эту карточку не удалось прочитать, но приложение — вот оно.",
    tagline:
      "Сфотографируйте гриб — ИИ назовёт вид с процентом уверенности, предупредит об опасных двойниках и съедобности.",
    foundOn: (date: string) => `Находка ${date}`,
    openInApp: "Открыть в приложении",
    getApp: "Установить приложение",
    ogFind: (name: string) => `${name} — определено в Mushroom Checker`,
    ogLevel: (n: number) => `Уровень ${n} пройден в Mushroom Checker`,
    ogRank: (found: number, total: number) =>
      `Определено ${found} из ${total} видов в Mushroom Checker`,
  },
} as const;

function textsFor(locale: string) {
  return locale === "ru" ? copy.ru : copy.en;
}

/**
 * Название вида на языке страницы. Названия живут в словаре приложения
 * (`checker.quests.species.<key>`) — отсюда мы их только читаем.
 */
async function speciesNames(locale: string, key: string) {
  const species = findQuestSpecies(key);
  const t = await getTranslations({ locale, namespace: "checker.quests.species" });
  const name = t.has(key) ? t(key) : null;
  return { name, scientificName: species?.scientificName ?? null };
}

/** Дата находки: только день, без времени — время в ссылку не попадает. */
function formatDate(date: string, locale: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

/**
 * Заголовок карточки для превью в мессенджере. Вид без названия в словаре
 * (переименовали ключ, подобрали адрес руками) — повод показать нейтральный
 * текст, а не сырой ключ из ссылки.
 */
async function previewTitle(
  payload: SharePayload | null,
  locale: string,
): Promise<string> {
  const t = textsFor(locale);
  if (!payload) return t.brand;
  if (payload.kind === "find") {
    const { name, scientificName } = await speciesNames(locale, payload.speciesKey);
    const label = name ?? scientificName;
    return label ? t.ogFind(label) : t.brand;
  }
  if (payload.kind === "level") return t.ogLevel(payload.levelId);
  return t.ogRank(payload.found, payload.total);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, token } = await params;
  const payload = await readShareToken(token);
  const t = textsFor(locale);

  // Абсолютный адрес собираем по хосту запроса: один деплой обслуживает и
  // checker.skyforest.ai, и локальный checker.localhost.
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "checker.skyforest.ai";
  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.includes(".localhost") ? "http" : "https");
  // Публичный путь, а не внутренний `/ck/s/...`: по внутреннему сегменту
  // middleware уводит на домашний экран, и краулер получил бы редирект.
  const pageUrl = `${proto}://${host}${shareUrlPath(token, locale)}`;
  const imageUrl = `${pageUrl}/opengraph-image`;
  const title = await previewTitle(payload, locale);

  return {
    // `absolute`: шаблон заголовка флейвора («%s | Mushroom Checker») дописал
    // бы название приложения второй раз — оно уже есть в самой фразе.
    title: { absolute: title },
    description: t.tagline,
    openGraph: {
      type: "website",
      url: pageUrl,
      siteName: t.brand,
      title,
      description: t.tagline,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    // Своей картинки у Twitter нет — тот же роут, тот же кадр 1200×630.
    twitter: { card: "summary_large_image", title, description: t.tagline, images: [imageUrl] },
  };
}

export default async function CheckerSharePage({ params }: Props) {
  const { locale, token } = await params;
  const payload = await readShareToken(token);
  const t = textsFor(locale);

  const find =
    payload?.kind === "find"
      ? await speciesNames(locale, payload.speciesKey)
      : null;
  // Ключ вида, которого нет ни в словаре, ни в конфиге квестов, показывать
  // нечем: карточка становится нейтральной, а не пустой.
  const hasFind = Boolean(find && (find.name || find.scientificName));

  const levelTitle = await (async () => {
    if (payload?.kind !== "level") return null;
    const level = findQuestLevel(payload.levelId);
    if (!level) return null;
    const tLevels = await getTranslations({
      locale,
      namespace: "checker.quests.levels",
    });
    const key = `${level.key}.title`;
    return tLevels.has(key) ? tLevels(key) : null;
  })();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ck-canvas px-5 py-12">
      <div className="ck-card ck-lift w-full max-w-sm px-6 py-8 text-center">
        <Image
          src="/icons/checker-192.png"
          alt=""
          width={56}
          height={56}
          className="mx-auto rounded-2xl shadow-[0_8px_30px_var(--ck-glow)]"
          priority
        />

        {payload?.kind === "find" && hasFind && (
          <>
            <h1 className="mt-5 font-heading text-3xl font-bold leading-tight tracking-tight text-ck-ink">
              {find?.name ?? find?.scientificName}
            </h1>
            {find?.name && find.scientificName && (
              <p className="mt-1 text-sm italic text-ck-muted">
                {find.scientificName}
              </p>
            )}
            <p className="mt-4 text-sm text-ck-body">
              {t.foundOn(formatDate(payload.date, locale))}
            </p>
          </>
        )}

        {payload?.kind === "level" && (
          <>
            {/* Медаль: круг с номером уровня — без картинок и шрифтовых значков. */}
            <div className="mx-auto mt-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-ck-primary-border bg-ck-primary-tint">
              <span className="font-heading text-3xl font-bold text-ck-primary-text">
                {payload.levelId}
              </span>
            </div>
            <p className="ck-mono mt-4 text-[11px] tracking-[0.18em] text-ck-faint">
              {t.levelBadge(payload.levelId)}
            </p>
            <h1 className="mt-2 font-heading text-3xl font-bold leading-tight tracking-tight text-ck-ink">
              {levelTitle ?? t.levelDone}
            </h1>
            <p className="mt-3 text-sm text-ck-body">
              {t.progress(payload.found, payload.total)}
            </p>
          </>
        )}

        {payload?.kind === "rank" && (
          <>
            <p className="ck-mono mt-5 text-[11px] tracking-[0.18em] text-ck-faint">
              {t.rankTitle}
            </p>
            <h1 className="mt-2 font-heading text-5xl font-bold tracking-tight text-ck-ink">
              <span className="text-ck-primary-text">{payload.found}</span>
              <span className="text-ck-muted-2"> / {payload.total}</span>
            </h1>
            <p className="mt-3 text-sm text-ck-body">{t.rankSubtitle}</p>
          </>
        )}

        {(!payload || (payload.kind === "find" && !hasFind)) && (
          <>
            <h1 className="mt-5 font-heading text-2xl font-bold leading-tight tracking-tight text-ck-ink">
              {t.neutralTitle}
            </h1>
            <p className="mt-3 text-sm text-ck-body">{t.neutralText}</p>
          </>
        )}

        {/* Подпись приложения есть на любой карточке: ссылка должна называть
            нас даже там, где рассказывать не о чем (нечитаемый токен). */}
        <p className="ck-mono mt-6 text-[11px] tracking-[0.18em] text-ck-faint">
          {payload?.kind === "find" && hasFind ? t.identifiedIn : t.brand}
        </p>
      </div>

      <div className="mt-6 w-full max-w-sm">
        <p className="px-2 text-center text-sm leading-relaxed text-ck-body-soft">
          {t.tagline}
        </p>
        {/* В нативной оболочке ссылка ведёт на экран распознавания; в браузере
            анонимного гостя ждёт вход — /dashboard/identify защищён. */}
        <Link
          href="/dashboard/identify"
          className="ck-btn ck-btn-primary mt-6"
        >
          {t.openInApp}
        </Link>
        {/* Кнопок магазинов в самой оболочке быть не должно: на iOS упоминание
            Google Play нарушает guideline 2.3.10, а приложение уже установлено. */}
        <WebOnly>
          <p className="ck-mono mt-7 text-center text-[11px] tracking-[0.18em] text-ck-faint">
            {t.getApp}
          </p>
          <div className="mt-3 flex gap-3">
            <a
              href={CHECKER_APP_STORE}
              target="_blank"
              rel="noopener noreferrer"
              className="ck-btn ck-btn-secondary"
            >
              App Store
            </a>
            <a
              href={CHECKER_GOOGLE_PLAY}
              target="_blank"
              rel="noopener noreferrer"
              className="ck-btn ck-btn-secondary"
            >
              Google Play
            </a>
          </div>
        </WebOnly>
      </div>
    </div>
  );
}
