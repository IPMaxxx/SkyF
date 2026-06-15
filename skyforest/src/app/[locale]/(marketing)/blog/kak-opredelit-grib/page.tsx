import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Bot, ScanSearch } from "lucide-react";
import { RelatedArticles } from "@/components/marketing/RelatedArticles";
import { BRAND } from "@/lib/brand";

const BOT_URL = BRAND.mushroomBotUrl || "https://t.me/skyforest_mushroom_bot";

export const metadata: Metadata = {
  title: "Как определить гриб по фото: приложения, нейросети и признаки",
  description:
    "Как определить гриб по фотографии и не ошибиться: как работают приложения и нейросети, какая у них точность, что именно фотографировать и какие признаки проверять вручную. Гид для грибников.",
  keywords: [
    "как определить гриб",
    "определение грибов по фото",
    "приложение для определения грибов",
    "распознать гриб по фото",
    "нейросеть определение грибов",
    "определитель грибов",
    "как узнать какой гриб",
    "определить гриб по фотографии онлайн",
    "съедобный гриб или нет",
    "опасные двойники грибов",
    "признаки съедобных грибов",
    "телеграм бот определение грибов",
  ],
  openGraph: {
    title: "Как определить гриб по фото: приложения, нейросети и признаки",
    description:
      "Как определить гриб по фотографии и не ошибиться: точность приложений, что фотографировать и какие признаки проверять вручную.",
    url: "https://www.skyforest.by/blog/kak-opredelit-grib",
    siteName: "SkyForest",
    type: "article",
    images: [
      {
        url: "https://www.skyforest.by/images/blog/blog-kak-opredelit-grib.jpg",
        width: 1536,
        height: 1024,
        alt: "Грибник определяет гриб по фото в приложении на смартфоне в лесу",
      },
    ],
    publishedTime: "2026-06-15T00:00:00+03:00",
    modifiedTime: "2026-06-15T00:00:00+03:00",
    authors: ["SkyForest"],
    section: "Грибы",
  },
  alternates: { canonical: "https://www.skyforest.by/blog/kak-opredelit-grib" },
};

const FAQ_ITEMS = [
  {
    q: "Можно ли точно определить гриб по фото?",
    a: "Фото — это хороший помощник, но не гарантия. Независимые исследования показывают, что даже лучшие приложения распознают гриб верно примерно в половине случаев, а ядовитые виды — ещё реже. Поэтому результат определения по фотографии всегда нужно перепроверять по ключевым признакам и никогда не употреблять незнакомый гриб, полагаясь только на приложение.",
  },
  {
    q: "Как сделать фото, чтобы определение было точнее?",
    a: "Сфотографируйте гриб с нескольких ракурсов: шляпку сверху, низ шляпки (пластинки или трубочки), всю ножку и обязательно её основание, а также срез мякоти. Снимайте при дневном свете, в фокусе, рядом положите линейку или монету для масштаба. Чем больше деталей видно, тем выше шанс правильного распознавания.",
  },
  {
    q: "Какие признаки гриба проверять вручную?",
    a: "Тип гименофора (пластинки или трубочки), наличие кольца на ножке и вольвы (мешочка) у основания, цвет мякоти на срезе и изменение цвета, запах, тип леса и дерево-партнёр. Многие смертельно ядовитые виды (например, бледная поганка) выдают себя именно вольвой и кольцом — деталями, которые на фото сверху не видны.",
  },
  {
    q: "Как работает определитель грибов в Telegram у SkyForest?",
    a: "Вы отправляете боту фотографию гриба, и нейросеть подсказывает наиболее вероятный вид. Первые 3 определения бесплатны. Дальше каждое распознавание стоит 1 токен — токены покупаются на сайте SkyForest и переводятся на баланс бота в личном кабинете.",
  },
  {
    q: "Стоит ли есть гриб, если приложение определило его как съедобный?",
    a: "Нет. Ни одно приложение и ни одна нейросеть не дают стопроцентной гарантии. Известны случаи отравлений после неправильного определения. Если есть хоть малейшие сомнения — не берите гриб. При подозрении на отравление немедленно обращайтесь за медицинской помощью.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline:
        "Как определить гриб по фото: приложения, нейросети и признаки",
      description:
        "Как определить гриб по фотографии и не ошибиться: как работают приложения и нейросети, какая у них точность, что именно фотографировать и какие признаки проверять вручную.",
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
      mainEntityOfPage: "https://www.skyforest.by/blog/kak-opredelit-grib",
      image: {
        "@type": "ImageObject",
        url: "https://www.skyforest.by/images/blog/blog-kak-opredelit-grib.jpg",
        width: 1536,
        height: 1024,
      },
      inLanguage: "ru",
      keywords:
        "как определить гриб, определение грибов по фото, приложение для определения грибов, нейросеть определение грибов",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: "https://www.skyforest.by" },
        { "@type": "ListItem", position: 2, name: "Блог", item: "https://www.skyforest.by/blog" },
        { "@type": "ListItem", position: 3, name: "Как определить гриб" },
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

export default function KakOpredelitGribPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <Link
          href="/blog"
          className="mb-10 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white/80"
        >
          <ArrowLeft className="h-4 w-4" />
          Блог
        </Link>

        <h1 className="mb-6 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          Как определить гриб по&nbsp;фото: приложения, нейросети и&nbsp;признаки
        </h1>

        <p className="mb-8 text-sm text-white/40">
          Обновлено: 15 июня 2026 · Время чтения: 11 мин
        </p>

        <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-2xl">
          <Image
            src="/images/blog/blog-kak-opredelit-grib.jpg"
            alt="Грибник определяет гриб по фотографии в приложении на смартфоне посреди солнечного леса"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        {/* INTRO */}
        <p className="mb-5 text-lg leading-relaxed text-white/80">
          «Что это за гриб?» — пожалуй, самый частый вопрос в лесу. Нашёл
          красивый крепкий боровик — или это его несъедобный двойник? Раньше
          ответ знали только опытные грибники и редкие книги-определители.
          Сегодня достаточно достать смартфон, сфотографировать находку — и
          через пару секунд{" "}
          <strong className="text-white">нейросеть подскажет вид</strong>. Звучит
          как магия, но за этой простотой скрываются важные нюансы, которые
          стоит понимать, прежде чем доверять алгоритму.
        </p>
        <p className="mb-8 text-lg leading-relaxed text-white/80">
          В этой статье разберём по-честному: как именно работает определение
          грибов по фото, насколько точны популярные приложения, что и как
          правильно фотографировать, какие признаки нужно проверять вручную — и
          где проходит граница, за которой доверять алгоритму опасно.
        </p>

        {/* SECTION 1 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Как «по фото» вообще определяется гриб
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          В основе всех современных определителей лежит{" "}
          <strong className="text-white">свёрточная нейросеть (CNN)</strong> —
          тот же тип алгоритмов, что используется в распознавании лиц.
          Упрощённо процесс выглядит так: ваше фото превращается в массив
          пикселей, нейросеть выделяет из него визуальные признаки — от простых
          контуров и текстур до сложных форм шляпки и ножки, — а затем сравнивает
          их с обученной базой и выдаёт список наиболее вероятных видов с
          процентом совпадения.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Ключевое слово здесь —{" "}
          <strong className="text-white">«вероятных»</strong>. Алгоритм не
          «знает» гриб, он лишь оценивает похожесть на то, что видел при
          обучении. Если ракурс непривычный, освещение плохое, а вид редкий —
          ошибка почти неизбежна. И главное ограничение: нейросеть работает{" "}
          <strong className="text-white">только с тем, что видно на фото</strong>.
          Запах, вкус, изменение цвета мякоти, тип почвы — всё это остаётся за
          кадром, хотя именно эти признаки часто отличают съедобный гриб от
          ядовитого.
        </p>

        {/* SECTION 2 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Насколько точны приложения: что говорят исследования
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Здесь начинается самое важное. Маркетинг приложений обещает
          «мгновенное и точное распознавание», но независимые научные проверки
          рисуют куда более сдержанную картину.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          В{" "}
          <a
            href="https://pubmed.ncbi.nlm.nih.gov/36794335/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline decoration-emerald-400/30 hover:text-emerald-300"
          >
            исследовании, опубликованном в журнале Clinical Toxicology (PubMed
            36794335)
          </a>
          , три популярных приложения тестировали на 78 образцах, поступивших в
          токсикологический центр. Лучшее из них (Picture Mushroom) определило
          вид верно лишь в{" "}
          <strong className="text-white">49% случаев</strong>, а ядовитые грибы —
          в 44%. Два других справились примерно с третью образцов.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Более свежая проверка, описанная в{" "}
          <a
            href="https://www.nature.com/articles/s41538-026-00752-4"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline decoration-emerald-400/30 hover:text-emerald-300"
          >
            npj Science of Food (Nature, 2026)
          </a>
          , охватила более 100 фотографий почти 60 видов в реальных условиях.
          Вывод: даже самый удачный инструмент{" "}
          <strong className="text-white">ошибался почти в 15% случаев</strong>, а
          ни одно приложение не давало стабильно один верный ответ.
        </p>

        <div className="my-8 overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 font-semibold text-white">Приложение</th>
                <th className="px-4 py-3 font-semibold text-white">
                  Точность (все виды)
                </th>
                <th className="px-4 py-3 font-semibold text-white">
                  Ядовитые виды
                </th>
              </tr>
            </thead>
            <tbody className="text-white/70">
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 text-white/90">Picture Mushroom</td>
                <td className="px-4 py-3 text-emerald-400">49%</td>
                <td className="px-4 py-3">44%</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 text-white/90">Mushroom Identificator</td>
                <td className="px-4 py-3">35%</td>
                <td className="px-4 py-3">30%</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-white/90">iNaturalist</td>
                <td className="px-4 py-3">35%</td>
                <td className="px-4 py-3">40%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mb-5 leading-relaxed text-white/80">
          По данным авторов приложения «Грибок», его база насчитывает свыше 12
          000 видов, но достоверность выше 80% заявлена лишь примерно для 1700 из
          них. Иными словами: с массовыми, хорошо узнаваемыми грибами нейросети
          справляются неплохо, а вот на редких и «спорных» видах легко
          ошибаются.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Психологи называют это ловушкой{" "}
          <strong className="text-white">автоматизированного доверия</strong>:
          людям свойственно переоценивать решения машины. Приложение выдало
          ответ уверенным тоном — и хочется поверить. Но в случае с грибами цена
          ошибки слишком высока.
        </p>

        {/* SECTION 3 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Анатомия гриба: что именно фотографировать
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Главная причина ошибок — снимок только шляпки сверху. По одной шляпке
          даже эксперт-миколог редко определит вид. Чтобы и нейросеть, и вы сами
          могли сделать вывод, нужно зафиксировать все ключевые части:
        </p>
        <ul className="mb-5 list-inside space-y-2 text-white/80">
          <li className="leading-relaxed">
            <strong className="text-white">Шляпка сверху:</strong> форма, цвет,
            фактура поверхности (гладкая, чешуйчатая, слизистая).
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Низ шляпки:</strong> пластинки или
            трубочки (поры) — это разные группы грибов. Снимите крупным планом.
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Ножка целиком:</strong> цвет, форма,
            наличие сеточки или чешуек, есть ли кольцо (юбочка).
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Основание ножки:</strong> аккуратно
            выкрутите гриб целиком — у основания может быть вольва (мешочек),
            характерная для смертельно ядовитых мухоморов.
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Срез мякоти:</strong> цвет на срезе и
            то, как он меняется (синеет, краснеет, остаётся белым).
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Окружение:</strong> тип леса и дерево
            рядом — многие грибы образуют микоризу со строго определёнными
            породами.
          </li>
        </ul>

        {/* SECTION 4 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Как сделать фото правильно: чек-лист
        </h2>
        <ul className="mb-5 list-inside space-y-2 text-white/80">
          <li className="leading-relaxed">
            Снимайте при <strong className="text-white">дневном свете</strong>,
            без вспышки, в фокусе.
          </li>
          <li className="leading-relaxed">
            Сделайте <strong className="text-white">3–5 кадров</strong> с разных
            ракурсов, а не один.
          </li>
          <li className="leading-relaxed">
            Положите рядом{" "}
            <strong className="text-white">линейку или монету</strong> для
            масштаба.
          </li>
          <li className="leading-relaxed">
            Очистите шляпку и ножку от земли и листвы, но не повреждайте гриб.
          </li>
          <li className="leading-relaxed">
            Снимайте на <strong className="text-white">нейтральном фоне</strong>{" "}
            (ладонь, лист бумаги), если фон слишком пёстрый.
          </li>
        </ul>

        {/* SECTION 5: bot promo */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Определитель грибов SkyForest в&nbsp;Telegram
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Чтобы не устанавливать отдельное приложение, мы сделали{" "}
          <strong className="text-white">бесплатный определитель прямо в
          Telegram</strong>. Отправляете боту фотографию гриба — он распознаёт
          наиболее вероятный вид и присылает справку. Удобно проверить находку,
          не выходя из мессенджера.
        </p>
        <div className="my-8 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-6 backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2">
            <Bot className="h-6 w-6 text-sky-300" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-white">
              Как это работает
            </h3>
          </div>
          <ul className="mb-5 list-inside space-y-2 text-sm text-white/80">
            <li className="leading-relaxed">
              <strong className="text-white">3 проверки бесплатно</strong> —
              каждому новому пользователю.
            </li>
            <li className="leading-relaxed">
              Дальше <strong className="text-white">1 токен = 1 определение</strong>.
              Токены покупаются на сайте SkyForest.
            </li>
            <li className="leading-relaxed">
              В{" "}
              <Link
                href="/account"
                className="text-sky-300 underline decoration-sky-400/30 hover:text-sky-200"
              >
                личном кабинете
              </Link>{" "}
              переводите часть токенов на баланс бота — и определяете грибы по
              фото.
            </li>
          </ul>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
            >
              <ScanSearch className="h-4 w-4" aria-hidden="true" />
              Открыть бота в Telegram
            </a>
            <Link
              href="/account"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              Управление токенами
            </Link>
          </div>
        </div>
        <p className="mb-5 leading-relaxed text-white/80">
          Важно: наш бот, как и любой другой определитель, — это{" "}
          <strong className="text-white">помощник, а не эксперт</strong>.
          Используйте его, чтобы сузить круг версий и узнать больше о грибах, но
          итоговое решение всегда проверяйте по признакам.
        </p>

        {/* SECTION 6: safety */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Правила безопасности: где доверять нельзя
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Ни одно приложение и ни один бот не должны быть единственным
          основанием, чтобы положить гриб в корзину и тем более в сковородку.
          Запомните несколько правил:
        </p>
        <ul className="mb-5 list-inside space-y-2 text-white/80">
          <li className="leading-relaxed">
            <strong className="text-white">Не уверен — не бери.</strong> Это
            золотое правило грибника старше любых нейросетей.
          </li>
          <li className="leading-relaxed">
            Особенно осторожны будьте с{" "}
            <strong className="text-white">пластинчатыми грибами</strong>: среди
            них самые опасные двойники (бледная поганка, мухоморы).
          </li>
          <li className="leading-relaxed">
            Проверяйте <strong className="text-white">вольву и кольцо</strong> —
            их не видно на фото сверху, а именно они выдают смертельно ядовитые
            виды.
          </li>
          <li className="leading-relaxed">
            При сомнениях покажите находку{" "}
            <strong className="text-white">опытному грибнику или микологу</strong>.
          </li>
          <li className="leading-relaxed">
            При первых признаках отравления (тошнота, боль в животе, слабость) —{" "}
            <strong className="text-white">немедленно к врачу</strong>, не
            дожидаясь ухудшения.
          </li>
        </ul>

        {/* Summary */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Итого
        </h2>
        <p className="mb-8 leading-relaxed text-white/80">
          Определение грибов по фото — отличный инструмент, чтобы учиться,
          расширять кругозор и быстро проверять находки. Современные нейросети
          неплохо узнают массовые виды, но ошибаются на редких и опасных. Делайте
          качественные фото с нескольких ракурсов, проверяйте ключевые признаки
          вручную и помните: алгоритм — это помощник, а ответственность за
          решение всегда на вас. Используйте{" "}
          <a
            href={BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline decoration-emerald-400/30 hover:text-emerald-300"
          >
            определитель SkyForest
          </a>{" "}
          как удобную подсказку — но финальную проверку оставляйте за собой.
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

        <RelatedArticles currentSlug="kak-opredelit-grib" />

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl sm:p-12">
          <h2 className="mb-4 text-2xl font-bold text-white">
            Определяйте грибы и находите лучшие дни для сбора
          </h2>
          <p className="mb-6 text-white/70">
            SkyForest подскажет, когда погода идеальна для тихой охоты, а
            Telegram-бот поможет распознать находку по фото. Регистрация
            бесплатна.
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
