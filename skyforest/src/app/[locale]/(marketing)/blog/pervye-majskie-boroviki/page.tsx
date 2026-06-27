import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { RelatedArticles } from "@/components/marketing/RelatedArticles";
import { BlogArticleHeader } from "@/components/marketing/BlogArticleHeader";

export const metadata: Metadata = {
  title: "Первые майские боровики: где и когда искать ранний белый гриб",
  description:
    "Майские боровики (белый гриб дубовый, Boletus reticulatus) — самый ранний белый гриб. Когда появляются, в каких лесах искать, какая погода нужна и как отличить от двойников. Гид для грибников.",
  keywords: [
    "майские боровики",
    "первые белые грибы",
    "белый гриб в мае",
    "боровик сетчатый",
    "белый гриб дубовый",
    "Boletus reticulatus",
    "ранний белый гриб",
    "когда появляются белые грибы",
    "грибы в мае",
    "где растут майские боровики",
    "как отличить белый гриб",
    "грибной сезон май",
  ],
  openGraph: {
    title: "Первые майские боровики: где и когда искать ранний белый гриб",
    description:
      "Самый ранний белый гриб — боровик сетчатый. Когда появляется, где искать, какая погода нужна и как отличить от двойников.",
    url: "https://www.skyforest.by/blog/pervye-majskie-boroviki",
    siteName: "SkyForest",
    type: "article",
    images: [
      {
        url: "https://www.skyforest.by/images/blog/blog-pervye-majskie-boroviki.jpg",
        width: 1536,
        height: 1024,
        alt: "Майские боровики растут в светлой весенней дубраве при свете солнца",
      },
    ],
    publishedTime: "2026-06-15T00:00:00+03:00",
    modifiedTime: "2026-06-15T00:00:00+03:00",
    authors: ["SkyForest"],
    section: "Грибы",
  },
  alternates: {
    canonical: "https://www.skyforest.by/blog/pervye-majskie-boroviki",
  },
};

const FAQ_ITEMS = [
  {
    q: "В каком месяце появляются первые боровики?",
    a: "Самый ранний белый гриб — боровик сетчатый (он же дубовый белый, Boletus reticulatus) — появляется уже в середине-конце мая, а в тёплых южных регионах иногда в начале мая. Это самый ранний из всех болетовых грибов. Растёт он волнами вплоть до октября.",
  },
  {
    q: "Где искать майские боровики?",
    a: "В светлых лиственных лесах, прежде всего в дубравах, а также рядом с буком, грабом, липой и каштаном. Гриб любит хорошо прогреваемые опушки, просеки и поляны, холмистую местность и суховатые щелочные почвы. В густой тени и сырых низинах в мае его почти не бывает.",
  },
  {
    q: "Какая погода нужна для майских боровиков?",
    a: "Тёплая и влажная: лучший сбор — через несколько дней после затяжных дождей или коротких гроз, когда почва прогрелась, а воздух остаётся влажным (туманы по утрам). Боровику нужно тепло — устойчивые дневные температуры, прогретая почва. В засуху ранние боровики почти не растут.",
  },
  {
    q: "Чем майский боровик отличается от обычного белого гриба?",
    a: "Это близкий родственник белого гриба. Главное отличие — выраженная светлая сеточка, покрывающая почти всю ножку (у обычного белого гриба сеточка только в верхней части). Шляпка часто более матовая, буровато-коричневая, в сухую погоду нередко растрескивается. На срезе мякоть остаётся белой и не синеет.",
  },
  {
    q: "С какими опасными грибами можно перепутать боровик?",
    a: "Главные двойники — желчный гриб (горчак), у которого розовеет трубчатый слой и очень горький вкус, и более редкий сатанинский гриб с краснеющей мякотью и красноватыми порами. У настоящего боровика мякоть белая, не синеет и не горчит. При любых сомнениях гриб лучше не брать.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline:
        "Первые майские боровики: где и когда искать ранний белый гриб",
      description:
        "Майские боровики (белый гриб дубовый, Boletus reticulatus) — самый ранний белый гриб. Когда появляются, где искать, какая погода нужна и как отличить от двойников.",
      author: { "@type": "Organization", name: "SkyForest", url: "https://www.skyforest.by" },
      publisher: {
        "@type": "Organization",
        name: "SkyForest",
        url: "https://www.skyforest.by",
        logo: {
          "@type": "ImageObject",
          url: "https://www.skyforest.by/images/logo-square.png",
        },
      },
      datePublished: "2026-06-15",
      dateModified: "2026-06-15",
      mainEntityOfPage: "https://www.skyforest.by/blog/pervye-majskie-boroviki",
      image: {
        "@type": "ImageObject",
        url: "https://www.skyforest.by/images/blog/blog-pervye-majskie-boroviki.jpg",
        width: 1536,
        height: 1024,
      },
      inLanguage: "ru",
      keywords:
        "майские боровики, белый гриб в мае, боровик сетчатый, белый гриб дубовый, Boletus reticulatus",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: "https://www.skyforest.by" },
        { "@type": "ListItem", position: 2, name: "Блог", item: "https://www.skyforest.by/blog" },
        { "@type": "ListItem", position: 3, name: "Первые майские боровики" },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ],
};

export default function PervyeMajskieBorovikiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <BlogArticleHeader title="Первые майские боровики: где и&nbsp;когда искать ранний белый гриб" />

        <h1 className="mb-6 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          Первые майские боровики: где и&nbsp;когда искать ранний белый гриб
        </h1>

        <p className="mb-8 text-sm text-white/40">
          Обновлено: 15 июня 2026 · Время чтения: 10 мин
        </p>

        <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-2xl">
          <Image
            src="/images/blog/blog-pervye-majskie-boroviki.jpg"
            alt="Несколько крепких майских боровиков растут на земле в светлой весенней дубраве, сквозь деревья пробивается солнце"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        {/* INTRO */}
        <p className="mb-5 text-lg leading-relaxed text-white/80">
          Для большинства грибников белый гриб — это символ осени. Но опытные
          охотники за боровиками знают секрет: первые белые можно набрать уже{" "}
          <strong className="text-white">в мае</strong>, когда лес только
          оделся свежей листвой, а до классического сезона ещё несколько
          месяцев. Эти ранние крепыши — отдельный вид, и охота за ними имеет
          свои правила.
        </p>
        <p className="mb-8 text-lg leading-relaxed text-white/80">
          Речь о{" "}
          <strong className="text-white">
            боровике сетчатом
          </strong>{" "}
          (он же белый гриб дубовый, <em>Boletus reticulatus</em>) — самом раннем
          из всех белых грибов. Разберём, когда он появляется, в каких лесах его
          искать, какая погода запускает рост и как не спутать находку с
          несъедобными двойниками.
        </p>

        {/* SECTION 1 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Что такое майский боровик
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Майский боровик — это народное название{" "}
          <strong className="text-white">боровика сетчатого</strong> (
          <em>Boletus reticulatus</em>, синонимы — белый гриб дубовый, белый гриб
          сетчатый, <em>Boletus aestivalis</em>). Он относится к тому же роду
          Боровик, что и классический белый гриб (<em>Boletus edulis</em>), и
          считается одним из лучших по вкусу. Его главная особенность —{" "}
          <strong className="text-white">самые ранние сроки плодоношения</strong>{" "}
          среди всех болетовых.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Узнать его помогает «визитная карточка» — выраженная светлая{" "}
          <strong className="text-white">сеточка, покрывающая почти всю
          ножку</strong> (у обычного белого гриба она только в верхней части).
          Шляпка буровато-коричневая, чаще матовая и бархатистая, в сухую погоду
          нередко покрывается мелкими трещинками — как пересохшая земля. Мякоть
          белая, на срезе цвет не меняет, с приятным ореховым запахом.
        </p>

        {/* SECTION 2 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Когда появляются: сроки и сигналы
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Боровик сетчатый стартует{" "}
          <strong className="text-white">в середине-конце мая</strong>, а в
          тёплых южных регионах его находят и в начале месяца. Это самый ранний
          белый гриб — он опережает классические летне-осенние слои на
          несколько недель. За сезон, который тянется до октября, на одном и том
          же месте успевает смениться несколько «волн» (генераций).
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Главный сигнал — устойчивое тепло. Боровику нужна прогретая почва и
          тёплые ночи. Как только майские дни стабильно тёплые, а прошедшие
          дожди напитали землю влагой — стоит планировать первую вылазку. Помните
          правило ранних боровиков: <strong className="text-white">тепло +
          влага после дождя</strong>, а не одно из двух по отдельности.
        </p>

        {/* SECTION 3 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Где искать майские боровики
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Боровик сетчатый образует микоризу преимущественно с деревьями
          семейства буковых, поэтому искать его нужно в{" "}
          <strong className="text-white">светлых лиственных лесах</strong>:
        </p>
        <ul className="mb-5 list-inside space-y-2 text-white/80">
          <li className="leading-relaxed">
            <strong className="text-white">Дубравы</strong> — главный адрес.
            Недаром гриб называют дубовым белым.
          </li>
          <li className="leading-relaxed">
            Леса с <strong className="text-white">буком, грабом, липой</strong>,
            на юге — рядом со <strong className="text-white">съедобным
            каштаном</strong>.
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Опушки, просеки, поляны</strong> —
            хорошо прогреваемые солнцем участки, а не глухая чаща.
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Холмистая местность</strong> и
            суховатые, скорее щелочные почвы.
          </li>
        </ul>
        <p className="mb-5 leading-relaxed text-white/80">
          Логика проста: в мае почва в густой тени и низинах ещё холодная и
          сырая. А вот открытые, прогретые солнцем края леса — там, где земля
          уже тёплая, — становятся первыми точками роста. Распространён вид
          широко: от Беларуси и средней полосы России до Крыма, Кавказа и
          Краснодарского края, по всей умеренной Евразии.
        </p>

        {/* SECTION 4 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Какая погода запускает рост
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Идеальный сценарий для майского боровика —{" "}
          <strong className="text-white">затяжные тёплые дожди</strong>, после
          которых устанавливается влажная погода с утренними туманами. Хорошо
          работают и короткие грозы с последующей «парниковой» влажностью.
          Отправляться в лес стоит не в день дождя, а через несколько дней
          после — когда грибница получила сигнал и успела сформировать плодовые
          тела.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          В засуху искать ранние боровики почти бесполезно: без влаги мицелий не
          трогается в рост, а уже выросшие грибы быстро вянут и растрескиваются.
          Именно поэтому ранняя «тихая охота» — это во многом{" "}
          <strong className="text-white">игра с погодой</strong>: нужно поймать
          окно тепла и влаги.
        </p>
        <div className="my-8 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <p className="text-sm leading-relaxed text-white/70">
            <strong className="text-white">Совет SkyForest:</strong> отметьте
            на карте свои дубравы и опушки, а сервис будет отслеживать осадки и
            температуру по этим точкам — и подскажет, когда после майских дождей
            складываются идеальные условия для первых боровиков. Подробнее о
            погодных условиях — в статье{" "}
            <Link
              href="/blog/pogoda-dlya-gribov"
              className="text-emerald-400 underline decoration-emerald-400/30 hover:text-emerald-300"
            >
              «Погода для грибов»
            </Link>
            .
          </p>
        </div>

        {/* SECTION 5 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Как отличить от двойников
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Хорошая новость: смертельно ядовитых двойников у боровика нет. Но есть
          несъедобные и горькие виды, способные испортить всё блюдо. Проверяйте
          три признака:
        </p>
        <div className="my-8 overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 font-semibold text-white">Признак</th>
                <th className="px-4 py-3 font-semibold text-white">
                  Боровик сетчатый
                </th>
                <th className="px-4 py-3 font-semibold text-white">
                  Желчный гриб (горчак)
                </th>
              </tr>
            </thead>
            <tbody className="text-white/70">
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 text-white/90">Трубчатый слой</td>
                <td className="px-4 py-3 text-emerald-400">Белый, затем желтоватый</td>
                <td className="px-4 py-3">Розовеет</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 text-white/90">Сеточка на ножке</td>
                <td className="px-4 py-3 text-emerald-400">Светлая, по всей ножке</td>
                <td className="px-4 py-3">Тёмная, грубая</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 text-white/90">Мякоть на срезе</td>
                <td className="px-4 py-3 text-emerald-400">Белая, не меняется</td>
                <td className="px-4 py-3">Слегка розовеет</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-white/90">Вкус</td>
                <td className="px-4 py-3 text-emerald-400">Приятный, ореховый</td>
                <td className="px-4 py-3">Очень горький</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mb-5 leading-relaxed text-white/80">
          Реже встречается сатанинский гриб — у него красноватые поры и
          краснеющая или синеющая мякоть. У настоящего боровика мякоть остаётся
          белой. Если сомневаетесь в находке, сфотографируйте её и проверьте
          через{" "}
          <Link
            href="/blog/kak-opredelit-grib"
            className="text-emerald-400 underline decoration-emerald-400/30 hover:text-emerald-300"
          >
            определитель грибов
          </Link>{" "}
          — но окончательное решение всегда принимайте по совокупности
          признаков.
        </p>

        {/* SECTION 6 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Советы по ранней охоте
        </h2>
        <ul className="mb-5 list-inside space-y-2 text-white/80">
          <li className="leading-relaxed">
            Ходите по <strong className="text-white">прогретым опушкам и
            просекам</strong>, а не вглубь сырого леса.
          </li>
          <li className="leading-relaxed">
            Боровик любит постоянство:{" "}
            <strong className="text-white">запоминайте удачные места</strong> —
            он возвращается на них из года в год.
          </li>
          <li className="leading-relaxed">
            Срезайте или аккуратно выкручивайте гриб, не разрушая грибницу.
          </li>
          <li className="leading-relaxed">
            Ранние боровики чаще червивеют в тепле —{" "}
            <strong className="text-white">проверяйте срез</strong> сразу.
          </li>
          <li className="leading-relaxed">
            Ловите <strong className="text-white">окно после дождя</strong>: 3–6
            тёплых влажных дней — лучшее время.
          </li>
        </ul>

        {/* Summary */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Итого
        </h2>
        <p className="mb-8 leading-relaxed text-white/80">
          Майский боровик — приятный бонус для тех, кто не хочет ждать осени.
          Ищите боровик сетчатый с середины мая в светлых дубравах и на
          прогретых опушках, после тёплых дождей. Отличить его легко по сеточке
          на всей ножке и белой мякоти, которая не синеет и не горчит. А чтобы не
          пропустить идеальное погодное окно, доверьте наблюдение за осадками и
          температурой SkyForest — и выходите в лес тогда, когда шансы на
          корзину первых белых максимальны.
        </p>

        {/* FAQ */}
        <h2 className="mb-6 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Часто задаваемые вопросы
        </h2>
        <div className="space-y-4">
          {FAQ_ITEMS.map((item) => (
            <div
              key={item.q}
              className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
            >
              <h3 className="mb-2 font-semibold text-white">{item.q}</h3>
              <p className="text-sm leading-relaxed text-white/70">{item.a}</p>
            </div>
          ))}
        </div>

        <RelatedArticles currentSlug="pervye-majskie-boroviki" />

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl sm:p-12">
          <h2 className="mb-4 text-2xl font-bold text-white">
            Не пропустите первую волну белых
          </h2>
          <p className="mb-6 text-white/70">
            SkyForest анализирует погоду по вашим грибным местам и подсказывает
            лучший день для тихой охоты. Регистрация бесплатна.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-primary-dark hover:shadow-xl"
          >
            Попробовать SkyForest
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </article>
    </>
  );
}
