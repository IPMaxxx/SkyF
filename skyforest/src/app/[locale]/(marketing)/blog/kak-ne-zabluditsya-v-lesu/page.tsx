import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowRight, Footprints } from "lucide-react";
import { RelatedArticles } from "@/components/marketing/RelatedArticles";
import { BlogArticleHeader } from "@/components/marketing/BlogArticleHeader";
import { BRAND } from "@/lib/brand";
import { defaultLocale } from "@/i18n/brand-locale";

type Props = { params: Promise<{ locale: string }> };

const SLUG = "kak-ne-zabluditsya-v-lesu";
const IMAGE_PATH = "/images/blog/blog-kak-ne-zabluditsya-v-lesu.jpg";
const PUBLISHED = "2026-07-07";

/** Brand-aware absolute URL: default locale is unprefixed (localePrefix: "as-needed"). */
function blogUrl(locale: string) {
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  return `${BRAND.url}${prefix}/blog/${SLUG}`;
}

const META = {
  ru: {
    title:
      "Как не заблудиться в лесу за грибами: функция Track в SkyForest",
    description:
      "Как не заблудиться в лесу и что делать, если заблудился: правила безопасности и Track — бесплатный трекер для грибника в SkyForest. Точка входа, путь на карте и стрелка возврата — навигация в лесу без интернета.",
    keywords: [
      "как не заблудиться в лесу",
      "заблудился в лесу что делать",
      "как вернуться из леса",
      "навигация в лесу без интернета",
      "приложение для грибников",
      "трекер для грибника",
      "как выйти из леса",
      "безопасность в лесу",
      "GPS в лесу",
    ],
    imageAlt:
      "Грибник с корзиной идёт по утреннему лесу, на земле — светящаяся линия трека с флажком точки входа",
  },
  en: {
    title:
      "How not to get lost in the forest: the Track feature in SkyForest",
    description:
      "How not to get lost in the forest while mushroom hunting — and how to find your way back in the woods. Meet Track: a free GPS tracker for mushroom hunting in the SkyForest foraging app that works as offline forest navigation.",
    keywords: [
      "how not to get lost in the forest",
      "mushroom foraging app",
      "forest navigation app offline",
      "GPS tracker for mushroom hunting",
      "find your way back in the woods",
      "lost in the woods what to do",
      "forest safety",
      "offline navigation",
    ],
    imageAlt:
      "A mushroom forager with a basket walking through a misty morning forest, a glowing track line with an entry-point flag on the ground",
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const lang = locale === "ru" ? "ru" : "en";
  const m = META[lang];
  const url = blogUrl(lang);

  return {
    title: m.title,
    description: m.description,
    keywords: [...m.keywords],
    openGraph: {
      title: m.title,
      description: m.description,
      url,
      siteName: BRAND.name,
      type: "article",
      images: [
        {
          url: `${BRAND.url}${IMAGE_PATH}`,
          width: 1536,
          height: 1024,
          alt: m.imageAlt,
        },
      ],
      publishedTime: `${PUBLISHED}T00:00:00+03:00`,
      modifiedTime: `${PUBLISHED}T00:00:00+03:00`,
      authors: [BRAND.name],
      section: lang === "ru" ? "Безопасность" : "Safety",
    },
    alternates: {
      canonical: url,
      languages: { ru: blogUrl("ru"), en: blogUrl("en") },
    },
  };
}

function buildJsonLd(lang: "ru" | "en") {
  const m = META[lang];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: m.title,
        description: m.description,
        author: { "@type": "Organization", name: BRAND.name, url: BRAND.url },
        publisher: {
          "@type": "Organization",
          name: BRAND.name,
          url: BRAND.url,
          logo: {
            "@type": "ImageObject",
            url: `${BRAND.url}/images/logo-square.png`,
          },
        },
        datePublished: PUBLISHED,
        dateModified: PUBLISHED,
        mainEntityOfPage: blogUrl(lang),
        image: {
          "@type": "ImageObject",
          url: `${BRAND.url}${IMAGE_PATH}`,
          width: 1536,
          height: 1024,
        },
        inLanguage: lang,
        keywords: m.keywords.slice(0, 6).join(", "),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: lang === "ru" ? "Главная" : "Home",
            item: BRAND.url,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: lang === "ru" ? "Блог" : "Blog",
            item: `${BRAND.url}/blog`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name:
              lang === "ru"
                ? "Как не заблудиться в лесу"
                : "How not to get lost in the forest",
          },
        ],
      },
    ],
  };
}

function RuBody() {
  return (
    <>
      <p className="mb-5 text-lg leading-relaxed text-white/80">
        Каждый сезон спасатели ищут в лесах грибников — и чаще всего не
        новичков, а опытных людей, которые «этот лес знают с детства».
        Достаточно увлечься грибной полосой, пару раз свернуть за перспективной
        полянкой — и вот уже непонятно,{" "}
        <strong className="text-white">как вернуться из леса</strong> к машине
        или дороге. В этой статье разберём,{" "}
        <strong className="text-white">как не заблудиться в лесу</strong>: от
        базовых правил безопасности до функции Track в SkyForest — простого
        трекера для грибника, который запоминает точку входа и показывает путь
        назад.
      </p>

      <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
        Почему грибники теряются даже в знакомом лесу
      </h2>
      <p className="mb-5 leading-relaxed text-white/80">
        Во время «тихой охоты» взгляд направлен вниз, на грибы, а не на
        ориентиры. Человек движется не по прямой, а зигзагами от находки к
        находке, и мысленная карта пути быстро расходится с реальной. Добавьте
        пасмурное небо без солнца, однообразные посадки, где все просеки похожи
        друг на друга, — и через час активного сбора направление на выход
        превращается в догадку. Телефонная связь и мобильный интернет в лесу
        часто пропадают, поэтому привычные онлайн-карты могут просто не
        загрузиться.
      </p>

      <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
        Заблудился в лесу — что делать: пять первых шагов
      </h2>
      <p className="mb-4 leading-relaxed text-white/80">
        Если вы поняли, что потеряли направление, главное правило — не
        паниковать и не «ускоряться». Вот что советуют спасатели, если вы{" "}
        <strong className="text-white">заблудились в лесу</strong>:
      </p>
      <ol className="mb-8 list-decimal space-y-3 pl-6 leading-relaxed text-white/80">
        <li>
          <strong className="text-white">Остановитесь.</strong> Хаотичное
          движение почти всегда уводит дальше от выхода. Сядьте, выдохните,
          оцените обстановку.
        </li>
        <li>
          <strong className="text-white">Прислушайтесь.</strong> Шум трассы,
          лай собак, звук поезда — акустические ориентиры слышны за километры.
        </li>
        <li>
          <strong className="text-white">Проверьте телефон.</strong> Даже без
          интернета GPS работает: откройте сохранённую карту или трек, если он
          записывался. Экономьте заряд — уменьшите яркость.
        </li>
        <li>
          <strong className="text-white">Позвоните по номеру 112.</strong> Он
          набирается даже без SIM-карты и при слабом сигнале любой доступной
          сети.
        </li>
        <li>
          <strong className="text-white">Выходите по линейным ориентирам.</strong>{" "}
          Река, ЛЭП, просека, лесная дорога рано или поздно приведут к людям.
        </li>
      </ol>
      <p className="mb-8 leading-relaxed text-white/80">
        Но лучший сценарий — не выбираться, а не теряться. Для этого и сделана
        функция Track.
      </p>

      <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
        Track в SkyForest: трекер для грибника, который помнит, где вы вошли
      </h2>
      <p className="mb-5 leading-relaxed text-white/80">
        Track — бесплатная функция в{" "}
        <Link href="/" className="text-emerald-400 hover:text-emerald-300">
          SkyForest
        </Link>
        , нашем <strong className="text-white">приложении для грибников</strong>.
        Идея простая: перед тем как зайти в чащу, вы нажимаете одну кнопку —
        «Я вошёл в лес». Дальше приложение работает само.
      </p>

      <h3 className="mb-3 mt-8 text-xl font-bold text-white">
        Точка входа — ваш якорь
      </h3>
      <p className="mb-5 leading-relaxed text-white/80">
        В момент нажатия Track запоминает координаты — это «якорь», к которому
        вы будете возвращаться: опушка, машина, съезд с дороги. На карте якорь
        отмечен флажком, а от вашей текущей позиции к нему тянется пунктирная
        линия — кратчайшее направление назад.
      </p>

      <h3 className="mb-3 mt-8 text-xl font-bold text-white">
        Путь на карте — без разряженной батареи
      </h3>
      <p className="mb-5 leading-relaxed text-white/80">
        Пока вы собираете грибы, Track раз в пару минут грубо отмечает вашу
        позицию. Постоянный GPS-трекинг, как в спортивных приложениях, здесь
        не используется — поэтому телефон не разряжается за пару часов.
        Пройденный путь рисуется тёмно-зелёной ломаной линией, текущая позиция
        пульсирует на карте. Запись продолжается, даже если вы перешли на
        другие страницы приложения — например, проверить погоду или определить
        гриб по фото.
      </p>

      <h3 className="mb-3 mt-8 text-xl font-bold text-white">
        Стрелка возврата: направление и расстояние
      </h3>
      <p className="mb-8 leading-relaxed text-white/80">
        Когда пора домой, откройте Track — стрелка-компас покажет, куда идти, а
        рядом будет расстояние до точки входа. Если компас на устройстве
        недоступен, приложение подскажет текстом: «Вход: на северо-запад,
        850 м» — этого достаточно, чтобы держать направление по солнцу или
        карте. Вышли к машине — нажмите «Я вышел», и трек завершится.
      </p>

      <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
        Навигация в лесу без интернета: что работает офлайн
      </h2>
      <p className="mb-8 leading-relaxed text-white/80">
        Главный страх в лесу — «нет сети». Track спроектирован именно под такую{" "}
        <strong className="text-white">навигацию в лесу без интернета</strong>:
        для стрелки, расстояния и записи пути нужен только GPS, который
        работает без сотовой связи. Без интернета может не загрузиться
        подложка карты, но направление и метры до точки входа вы увидите всегда.
        Все данные хранятся локально на вашем устройстве и никуда не
        отправляются: не нужны ни регистрация трека на сервере, ни передача
        ваших грибных мест кому-либо.
      </p>

      <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
        Ограничения: честно о том, чего Track не делает
      </h2>
      <p className="mb-8 leading-relaxed text-white/80">
        Track — грубый ориентир, а не точный самописец маршрута. Точки
        записываются примерно раз в две минуты и только при уверенном сигнале
        GPS, поэтому линия пути — ломаная «для ориентировки», а не идеальная
        кривая вашего маршрута. Стрелка показывает направление по прямой — по
        пути могут оказаться болото или овраг, которые придётся обходить.
        И главное: никакое приложение не заменяет заряженный телефон,
        обычный компас, спички и здравый смысл. Track снижает риск потеряться,
        но не отменяет базовые правила безопасности в лесу.
      </p>

      <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
        Чек-лист: как не заблудиться в лесу
      </h2>
      <ul className="mb-8 list-disc space-y-2 pl-6 leading-relaxed text-white/80">
        <li>Предупредите близких, куда едете и когда планируете вернуться.</li>
        <li>Зарядите телефон до 100% и возьмите пауэрбанк.</li>
        <li>
          На опушке нажмите «Я вошёл в лес» в Track — это займёт три секунды.
        </li>
        <li>Запомните сторону, с которой вошли, и крупные ориентиры.</li>
        <li>Возьмите воду, спички и яркую одежду — в ней проще заметить человека.</li>
        <li>Начинайте возвращаться за 2–3 часа до заката, а не «как стемнеет».</li>
      </ul>

      <div className="my-16 rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center backdrop-blur-xl sm:px-10 sm:py-14">
        <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">
          Попробуйте Track в следующем походе
        </h2>
        <p className="mb-8 leading-relaxed text-white/70">
          Одна кнопка на опушке — и SkyForest запомнит, где вы вошли в лес,
          отметит путь на карте и покажет дорогу назад. Бесплатно, без
          передачи данных на сервер.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard/track"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 hover:shadow-xl"
          >
            <Footprints className="h-5 w-5" />
            Открыть Track
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-4 text-base font-medium text-white transition-colors hover:bg-white/10"
          >
            Зарегистрироваться бесплатно
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </>
  );
}

function EnBody() {
  return (
    <>
      <p className="mb-5 text-lg leading-relaxed text-white/80">
        Every season, rescue teams search the woods for mushroom pickers — and
        more often than not it&rsquo;s not beginners, but experienced foragers
        who have &ldquo;known this forest since childhood.&rdquo; It only takes
        following a promising mushroom patch and a couple of turns off the path
        before you no longer know how to{" "}
        <strong className="text-white">find your way back in the woods</strong>{" "}
        to your car or the road. In this article we&rsquo;ll cover{" "}
        <strong className="text-white">
          how not to get lost in the forest
        </strong>
        : from basic safety rules to Track — a simple feature in the SkyForest{" "}
        <strong className="text-white">mushroom foraging app</strong> that
        remembers your entry point and shows the way back.
      </p>

      <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
        Why foragers get lost even in a familiar forest
      </h2>
      <p className="mb-5 leading-relaxed text-white/80">
        During a mushroom hunt your eyes are on the ground, not on landmarks.
        You don&rsquo;t walk in a straight line — you zigzag from find to find,
        and your mental map quickly drifts away from reality. Add an overcast
        sky with no sun and uniform plantations where every ride looks the
        same, and after an hour of picking, the direction to the exit becomes a
        guess. Cell coverage and mobile data often drop out in the forest, so
        the online maps you rely on may simply fail to load.
      </p>

      <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
        Lost in the woods — what to do first
      </h2>
      <p className="mb-4 leading-relaxed text-white/80">
        If you realize you&rsquo;ve lost your bearings, the main rule is: no
        panic and no rushing. Here is what rescuers advise:
      </p>
      <ol className="mb-8 list-decimal space-y-3 pl-6 leading-relaxed text-white/80">
        <li>
          <strong className="text-white">Stop.</strong> Chaotic movement almost
          always takes you farther from the exit. Sit down, breathe, assess.
        </li>
        <li>
          <strong className="text-white">Listen.</strong> Road noise, barking
          dogs, a train — acoustic landmarks carry for kilometers.
        </li>
        <li>
          <strong className="text-white">Check your phone.</strong> GPS works
          even without internet: open a saved map or your track if one was
          recorded. Save battery — dim the screen.
        </li>
        <li>
          <strong className="text-white">Call the emergency number.</strong> In
          most countries it connects even with a weak signal on any available
          network.
        </li>
        <li>
          <strong className="text-white">Follow linear landmarks.</strong> A
          river, a power line, a forest road will sooner or later lead you to
          people.
        </li>
      </ol>
      <p className="mb-8 leading-relaxed text-white/80">
        But the best scenario is not getting out — it&rsquo;s not getting lost
        in the first place. That&rsquo;s exactly what Track is for.
      </p>

      <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
        Track in SkyForest: a GPS tracker for mushroom hunting
      </h2>
      <p className="mb-5 leading-relaxed text-white/80">
        Track is a free feature in{" "}
        <Link href="/" className="text-emerald-400 hover:text-emerald-300">
          SkyForest
        </Link>
        . The idea is simple: before stepping into the thicket, you tap one
        button — &ldquo;I&rsquo;ve entered the forest.&rdquo; From there, the
        app does the rest.
      </p>

      <h3 className="mb-3 mt-8 text-xl font-bold text-white">
        The entry point is your anchor
      </h3>
      <p className="mb-5 leading-relaxed text-white/80">
        The moment you tap, Track stores your coordinates — the
        &ldquo;anchor&rdquo; you&rsquo;ll return to: the forest edge, your car,
        the turn-off from the road. On the map the anchor is marked with a
        flag, and a dashed line stretches from your current position to it —
        the shortest direction back.
      </p>

      <h3 className="mb-3 mt-8 text-xl font-bold text-white">
        Your path on the map — without draining the battery
      </h3>
      <p className="mb-5 leading-relaxed text-white/80">
        While you pick mushrooms, Track roughly marks your position every
        couple of minutes. There is no constant GPS tracking like in sports
        apps — so your phone doesn&rsquo;t die in two hours. Your path is drawn
        as a dark-green line, and your current position pulses on the map.
        Recording continues even if you switch to other pages of the app — say,
        to check the weather or identify a mushroom by photo.
      </p>

      <h3 className="mb-3 mt-8 text-xl font-bold text-white">
        The return arrow: direction and distance
      </h3>
      <p className="mb-8 leading-relaxed text-white/80">
        When it&rsquo;s time to head home, open Track — a compass arrow shows
        where to go, with the distance to your entry point right next to it. If
        your device has no compass, the app falls back to plain words:
        &ldquo;Entry: northwest, 850 m&rdquo; — enough to hold a bearing by the
        sun or the map. Back at the car, tap &ldquo;I&rsquo;m out&rdquo; and
        the track is finished.
      </p>

      <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
        A forest navigation app that works offline
      </h2>
      <p className="mb-8 leading-relaxed text-white/80">
        The biggest fear in the forest is &ldquo;no signal.&rdquo; Track was
        designed precisely as{" "}
        <strong className="text-white">
          offline forest navigation
        </strong>
        : the arrow, the distance and the path recording only need GPS, which
        works without any cellular connection. Without internet the map tiles
        may not load, but you will always see the direction and the meters left
        to your entry point. All data is stored locally on your device and is
        never sent anywhere: no server-side track registration, no sharing of
        your secret mushroom spots with anyone.
      </p>

      <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
        Limitations: what Track honestly doesn&rsquo;t do
      </h2>
      <p className="mb-8 leading-relaxed text-white/80">
        Track is a rough guide, not a precise route logger. Points are recorded
        about every two minutes and only with a solid GPS fix, so the path line
        is a polyline &ldquo;for orientation,&rdquo; not an exact replay of
        your route. The arrow points in a straight line — there may be a swamp
        or a ravine on the way that you&rsquo;ll have to walk around. And most
        importantly: no app replaces a charged phone, a real compass, matches
        and common sense. Track lowers the risk of getting lost, but it
        doesn&rsquo;t cancel basic forest safety rules.
      </p>

      <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
        Checklist: how not to get lost in the forest
      </h2>
      <ul className="mb-8 list-disc space-y-2 pl-6 leading-relaxed text-white/80">
        <li>Tell someone where you&rsquo;re going and when you plan to be back.</li>
        <li>Charge your phone to 100% and bring a power bank.</li>
        <li>
          At the forest edge, tap &ldquo;I&rsquo;ve entered the forest&rdquo; in
          Track — it takes three seconds.
        </li>
        <li>Note which side you entered from and the major landmarks.</li>
        <li>
          Bring water, matches and bright clothing — it makes you easier to
          spot.
        </li>
        <li>
          Start heading back 2–3 hours before sunset, not &ldquo;when it gets
          dark.&rdquo;
        </li>
      </ul>

      <div className="my-16 rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center backdrop-blur-xl sm:px-10 sm:py-14">
        <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">
          Try Track on your next foraging trip
        </h2>
        <p className="mb-8 leading-relaxed text-white/70">
          One tap at the forest edge — and SkyForest remembers where you
          entered, marks your path on the map and shows the way back. Free,
          with no data ever leaving your device.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard/track"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 hover:shadow-xl"
          >
            <Footprints className="h-5 w-5" />
            Open Track
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-4 text-base font-medium text-white transition-colors hover:bg-white/10"
          >
            Sign up for free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </>
  );
}

export default async function KakNeZabluditsyaVLesuPage({ params }: Props) {
  const { locale } = await params;
  const lang = locale === "ru" ? "ru" : "en";
  const m = META[lang];
  const jsonLd = buildJsonLd(lang);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <BlogArticleHeader
          title={
            lang === "ru"
              ? "Как не заблудиться в лесу"
              : "How not to get lost in the forest"
          }
        />

        <h1 className="mb-6 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          {m.title}
        </h1>

        <p className="mb-8 text-sm text-white/40">
          {lang === "ru"
            ? "Обновлено: 7 июля 2026 · Время чтения: 7 мин"
            : "Updated: July 7, 2026 · Reading time: 7 min"}
        </p>

        <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-2xl">
          <Image
            src={IMAGE_PATH}
            alt={m.imageAlt}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        {lang === "ru" ? <RuBody /> : <EnBody />}

        <RelatedArticles currentSlug={SLUG} />
      </article>
    </>
  );
}
