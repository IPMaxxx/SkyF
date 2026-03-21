import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title:
    "Ежовик гребенчатый: гриб для мозга — что говорит наука",
  description:
    "Ежовик гребенчатый (Lion's Mane) — гриб, улучшающий когнитивные функции, память и настроение. Разбираем клинические исследования: эринацины vs герициноны, мицелий vs плодовое тело.",
  keywords: [
    "ежовик гребенчатый",
    "львиная грива гриб",
    "lion's mane",
    "hericium erinaceus",
    "гриб для мозга",
    "ежовик польза",
    "эринацины",
    "герициноны",
    "ноотропный гриб",
    "ежовик когнитивные функции",
    "ежовик депрессия",
    "ежовик память",
    "мицелий ежовика",
    "гриб для нервной системы",
    "фактор роста нервов NGF",
  ],
  openGraph: {
    title: "Ежовик гребенчатый: гриб для мозга — что говорит наука",
    description:
      "Разбираем клинические исследования ежовика гребенчатого: влияние на память, депрессию, тревогу и нервную систему. Мицелий vs плодовое тело.",
    url: "https://skyforest.by/blog/ezhovik-grebenchatyj",
    siteName: "SkyForest",
    type: "article",
    images: [
      {
        url: "/images/blog/blog-ezhovik-grebenchatyj.jpg",
        width: 1792,
        height: 1024,
        alt: "Ежовик гребенчатый растёт на стволе дерева в осеннем лесу",
      },
    ],
  },
  alternates: {
    canonical: "https://skyforest.by/blog/ezhovik-grebenchatyj",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline:
    "Ежовик гребенчатый: гриб для мозга — что говорит наука",
  description:
    "Разбираем клинические исследования ежовика гребенчатого: влияние на память, депрессию, тревогу и нервную систему. Эринацины, герициноны, мицелий и плодовые тела.",
  author: { "@type": "Organization", name: "SkyForest" },
  publisher: {
    "@type": "Organization",
    name: "SkyForest",
    url: "https://skyforest.by",
  },
  datePublished: "2025-10-01",
  dateModified: "2026-03-11",
  mainEntityOfPage: "https://skyforest.by/blog/ezhovik-grebenchatyj",
  keywords:
    "ежовик гребенчатый, lion's mane, hericium erinaceus, гриб для мозга, эринацины, герициноны, мицелий, когнитивные функции",
  inLanguage: "ru",
};

const RELATED = [
  {
    href: "/blog/pogoda-dlya-gribov",
    title: "Погода для грибов: при какой температуре и влажности растут грибы",
    desc: "Какие погодные условия идеальны для роста грибов. Температура, влажность, осадки — что важно знать.",
    time: "12 мин",
  },
  {
    href: "/blog/v-kakom-lesu-iskat-griby",
    title: "В каком лесу искать грибы: хвойный, лиственный или смешанный",
    desc: "Какие грибы где растут: белые в сосняках, подберёзовики у берёз. Гид по типам лесов.",
    time: "10 мин",
  },
  {
    href: "/blog/gde-rastut-griby",
    title: "Где растут грибы в России и Беларуси",
    desc: "Регионы, леса и конкретные места для тихой охоты. Карта грибных мест и советы.",
    time: "12 мин",
  },
  {
    href: "/blog/kogda-pora-v-les",
    title: "Когда пора в лес: 7 признаков, что грибы пошли",
    desc: "Практические признаки начала сезона. Температура почвы, первые находки и другие подсказки.",
    time: "6 мин",
  },
];

const FAQ_ITEMS = [
  {
    q: "Чем ежовик гребенчатый полезен для мозга?",
    a: "Ежовик содержит уникальные вещества — эринацины (в мицелии) и герициноны (в плодовом теле), которые стимулируют выработку фактора роста нервов (NGF). Клинические исследования на людях показали улучшение когнитивных функций, снижение тревоги и депрессии при регулярном приёме. Доказательная база пока ограничена небольшими выборками, но результаты последовательны.",
  },
  {
    q: "Что лучше — мицелий или плодовое тело ежовика?",
    a: "Зависит от цели. Для когнитивных функций и нейропротекции — мицелий, обогащённый эринацинами (полученный жидкой ферментацией, не на зерне). Именно эринацины проникают через гематоэнцефалический барьер и стимулируют NGF в мозге. Для иммунитета — экстракт плодовых тел с высоким содержанием бета-глюканов. Важно: большинство коммерческих добавок с мицелием выращены на зерне и существенно отличаются от исследовательских экстрактов.",
  },
  {
    q: "Можно ли найти ежовик гребенчатый в лесу?",
    a: "Да, ежовик гребенчатый встречается в лесах России и Беларуси — на стволах и пнях лиственных деревьев (дуб, бук, берёза). Но он редок и занесён в Красные книги многих регионов. Чаще его выращивают в специальных условиях для получения БАДов.",
  },
  {
    q: "Сколько нужно принимать ежовик для эффекта?",
    a: "В клинических исследованиях эффекты наблюдались при приёме от 750 мг до 3000 мг в день на протяжении 4–49 недель. Улучшение когнитивных функций нарастало с каждой неделей, но могло снижаться после прекращения приёма.",
  },
  {
    q: "Есть ли побочные эффекты у ежовика гребенчатого?",
    a: "В проведённых клинических испытаниях серьёзных побочных эффектов не зафиксировано. Систематический обзор 2025 года (Frontiers in Nutrition) отмечает возможные побочные эффекты: дискомфорт в желудке, головная боль, аллергические реакции — но они встречаются редко. Перед применением рекомендуется консультация с врачом.",
  },
];

export default function EzhovikGrebenchatyjPage() {
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
          ← Блог
        </Link>

        <h1 className="mb-6 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          Ежовик гребенчатый: гриб для&nbsp;мозга&nbsp;— что&nbsp;говорит наука
        </h1>

        <p className="mb-8 text-sm text-white/40">
          Обновлено: 11 марта 2026 · 18 мин чтения
        </p>

        <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-2xl">
          <Image
            src="/images/blog/blog-ezhovik-grebenchatyj.jpg"
            alt="Ежовик гребенчатый (Hericium erinaceus) растёт на стволе дерева в туманном осеннем лесу"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        {/* INTRO */}
        <p className="mb-5 text-lg leading-relaxed text-white/80">
          Ежовик гребенчатый (<em>Hericium erinaceus</em>), он же «львиная
          грива», «ямабушитаке», «бородатый зуб» — один из самых необычных
          грибов на планете. Белый, лохматый, похожий на коралл или бороду
          сказочного старца — в лесу его не перепутаешь ни с чем. Но внешность —
          далеко не главное. За последние 20 лет этот гриб стал объектом десятков
          клинических исследований, и результаты впечатляют: улучшение памяти,
          снижение тревоги, защита нервной системы.
        </p>
        <p className="mb-5 text-lg leading-relaxed text-white/80">
          В интернете вокруг ежовика много маркетинга и мало конкретики. Одни
          продавцы продвигают порошок из плодовых тел, другие — экстракт мицелия,
          третьи — настойки. Кто прав? Что на самом деле подтверждено наукой?
          Какие вещества работают и где они содержатся? В этой статье мы
          разбираем{" "}
          <strong className="text-white">
            только рецензированные клинические исследования на людях
          </strong>{" "}
          — никаких «мышиных» данных и рекламных обещаний.
        </p>
        <p className="mb-8 text-lg leading-relaxed text-white/80">
          Для любителей тихой охоты ежовик гребенчатый — особая находка. Он
          встречается в лиственных и смешанных лесах России и Беларуси, растёт на
          стволах и пнях дуба, бука, берёзы. Правда, найти его непросто — вид
          редкий и во многих регионах занесён в Красную книгу. Но знать о нём
          стоит каждому грибнику.
        </p>

        {/* SECTION 1: Two compounds */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Два класса веществ: эринацины и герициноны
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Главная научная интрига ежовика — в его химии. Гриб производит два
          принципиально разных класса биоактивных терпеноидов, и они
          распределены по разным частям организма.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          <strong className="text-white">Эринацины</strong> — цианатные
          дитерпеноиды, которые содержатся{" "}
          <strong className="text-white">преимущественно в мицелии</strong>{" "}
          (грибнице). Это ключевой момент.{" "}
          <a
            href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11969743/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline decoration-emerald-400/30 hover:text-emerald-300"
          >
            Геномное исследование 2025 года (PMC11969743)
          </a>{" "}
          подтвердило: гены биосинтеза эринацинов (eri-гены) активны
          в мицелиальной фазе, но подавлены в плодовых телах. В плодовых телах
          ежовика эринацины практически не обнаруживаются. Мицелий —
          единственный значимый источник этих соединений.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          <strong className="text-white">Герициноны</strong> — другой класс
          терпеноидов, содержащийся в{" "}
          <strong className="text-white">плодовых телах</strong> (то, что мы
          видим как «гриб» в лесу). Герициноны тоже стимулируют синтез фактора
          роста нервов (NGF), обладают иммуномодулирующей и противоопухолевой
          активностью.           Но — и это принципиально —{" "}
          <strong className="text-white">
            клинических доказательств их влияния на когнитивные функции пока нет
          </strong>
          , в отличие от эринацинов из мицелия. Прямых данных о проникновении
          герициновов через гематоэнцефалический барьер тоже недостаточно.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Почему это важно? Потому что подавляющее большинство добавок на рынке
          — это порошок из <em>плодовых тел</em>. Он содержит герициноны,
          полисахариды, бета-глюканы — полезные вещества для иммунитета. Но
          если ваша цель — улучшение памяти, концентрации, защита нейронов — вам
          нужен{" "}
          <strong className="text-white">мицелий, обогащённый эринацинами</strong>
          . Именно мицелий использовался в ключевых клинических испытаниях на
          людях.
        </p>

        {/* Comparison table */}
        <div className="my-8 overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 font-semibold text-white">
                  Параметр
                </th>
                <th className="px-4 py-3 font-semibold text-white">
                  Эринацины (мицелий)
                </th>
                <th className="px-4 py-3 font-semibold text-white">
                  Герициноны (плодовое тело)
                </th>
              </tr>
            </thead>
            <tbody className="text-white/70">
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 text-white/90">Источник</td>
                <td className="px-4 py-3">Мицелий (грибница)</td>
                <td className="px-4 py-3">Плодовое тело</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 text-white/90">Стимуляция NGF</td>
                <td className="px-4 py-3">Да, мощная</td>
                <td className="px-4 py-3">Да, умеренная</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 text-white/90">
                  Когнитивные функции
                </td>
                <td className="px-4 py-3 text-emerald-400">
                  Подтверждено клинически
                </td>
                <td className="px-4 py-3 text-white/50">
                  Не подтверждено
                </td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 text-white/90">
                  Антидепрессивный эффект
                </td>
                <td className="px-4 py-3 text-emerald-400">
                  Подтверждено клинически
                </td>
                <td className="px-4 py-3">Частичные данные</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 text-white/90">Иммунитет</td>
                <td className="px-4 py-3">Да</td>
                <td className="px-4 py-3 text-emerald-400">Да, выраженный</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-white/90">
                  Противоопухолевая активность
                </td>
                <td className="px-4 py-3">Данные ограничены</td>
                <td className="px-4 py-3 text-emerald-400">Подтверждена</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SECTION 2: Clinical studies */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Клинические исследования на людях
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Перейдём к конкретике. Ниже — только{" "}
          <strong className="text-white">
            рандомизированные контролируемые испытания с участием людей
          </strong>
          , опубликованные в рецензируемых научных журналах. Никаких крыс,
          пробирок и «традиционной медицины».
        </p>

        {/* Study 1 */}
        <h3 className="mb-3 mt-8 text-xl font-bold text-white">
          Улучшение когнитивных функций при лёгких нарушениях
        </h3>
        <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          Mori K. et al. (2009). Phytotherapy Research, 23(3), 367–372.{" "}
          <a
            href="https://pubmed.ncbi.nlm.nih.gov/18844328/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300"
          >
            PubMed: 18844328
          </a>
        </div>
        <p className="mb-5 leading-relaxed text-white/80">
          Двойное слепое плацебо-контролируемое исследование. 30 японцев в
          возрасте 50–80 лет с диагностированными лёгкими когнитивными
          нарушениями. Одна группа получала таблетки с порошком ежовика
          (4 × 250 мг, три раза в день — итого 3000 мг/день), другая — плацебо.
          Курс — 16 недель.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Результат: уже на 8-й неделе группа ежовика показала{" "}
          <strong className="text-white">
            статистически значимое улучшение когнитивных функций
          </strong>{" "}
          по шкале HDS-R (модифицированная шкала деменции Хасегавы). Показатели
          продолжали расти к 12-й и 16-й неделям. Побочных эффектов не
          зафиксировано. Но вот важный момент: через 4 недели после отмены
          препарата показатели начали снижаться. Это значит, что ежовик
          работает, пока вы его принимаете — это не «вылечил и забыл».
        </p>

        {/* Study 2 */}
        <h3 className="mb-3 mt-8 text-xl font-bold text-white">
          Снижение депрессии и тревоги
        </h3>
        <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          Nagano M. et al. (2010). Biomedical Research, 31(4), 231–237.{" "}
          <a
            href="https://pubmed.ncbi.nlm.nih.gov/20834180/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300"
          >
            PubMed: 20834180
          </a>
        </div>
        <p className="mb-5 leading-relaxed text-white/80">
          Рандомизированное двойное слепое исследование. 30 женщин в течение 4
          недель употребляли печенье с порошком ежовика (500 мг на печенье,
          4 штуки в день) или плацебо-печенье. Оценивались показатели депрессии
          (CES-D) и неопределённых жалоб (ICI).
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Результат:{" "}
          <strong className="text-white">
            значимое снижение депрессии и тревожности
          </strong>{" "}
          в группе ежовика. Особенно заметно улучшились показатели по
          раздражительности, тревоге и концентрации. Авторы отмечают, что
          механизм может быть связан не только со стимуляцией NGF, но и с другими
          нейротропными эффектами — в частности, с влиянием на уровни серотонина
          и дофамина.
        </p>

        {/* Study 3 */}
        <h3 className="mb-3 mt-8 text-xl font-bold text-white">
          Улучшение настроения и сна у людей с лишним весом
        </h3>
        <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          Vigna L. et al. (2019). Evidence-Based Complementary and Alternative
          Medicine.{" "}
          <a
            href="https://pubmed.ncbi.nlm.nih.gov/31118969/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300"
          >
            PubMed: 31118969
          </a>
        </div>
        <p className="mb-5 leading-relaxed text-white/80">
          77 добровольцев с избыточным весом или ожирением, у которых наблюдались
          нарушения настроения и/или сна. 8 недель приёма ежовика на фоне
          низкокалорийной диеты.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Результат:{" "}
          <strong className="text-white">
            уменьшение депрессии, тревоги и улучшение качества сна
          </strong>
          . Также зафиксировано повышение уровня pro-BDNF (предшественник
          мозгового нейротрофического фактора) — белка, критически важного для
          роста и выживания нейронов. Что интересно: эффект сохранялся в течение
          8 недель после прекращения приёма, что может говорить о структурных
          изменениях в нейронных связях.
        </p>

        {/* Study 4 */}
        <h3 className="mb-3 mt-8 text-xl font-bold text-white">
          Профилактика болезни Альцгеймера
        </h3>
        <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          Li I-C. et al. (2020). Frontiers in Aging Neuroscience, 12, 155.{" "}
          <a
            href="https://www.frontiersin.org/articles/10.3389/fnagi.2020.00155/full"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300"
          >
            Frontiers
          </a>
        </div>
        <p className="mb-5 leading-relaxed text-white/80">
          Пилотное двойное слепое плацебо-контролируемое исследование
          длительностью 49 недель. Пациенты с лёгкой формой болезни Альцгеймера
          получали{" "}
          <strong className="text-white">
            мицелий ежовика, обогащённый эринацином А
          </strong>{" "}
          (3 капсулы по 350 мг в день, содержание эринацина А — 5 мг/г).
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Результат: группа ежовика показала{" "}
          <strong className="text-white">
            значимое улучшение баллов по шкале MMSE
          </strong>{" "}
          и показателей повседневной активности (IADL). В плацебо-группе,
          напротив, зафиксировано снижение уровня BDNF и рост маркеров,
          ассоциированных с Альцгеймером (бета-амилоид 1–40). Нейровизуализация
          выявила защитные изменения белого вещества мозга в группе лечения. Это
          одно из наиболее убедительных клинических исследований эринацинов при
          нейродегенерации.
        </p>

        {/* Study 5 */}
        <h3 className="mb-3 mt-8 text-xl font-bold text-white">
          Восстановление слуха у пожилых пациентов
        </h3>
        <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          Li I-C. et al. (2022). Journal of Functional Foods, 97, 105247.{" "}
          <a
            href="https://www.sciencedirect.com/science/article/pii/S1756464622002900"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300"
          >
            ScienceDirect
          </a>
        </div>
        <p className="mb-5 leading-relaxed text-white/80">
          Двойное слепое рандомизированное плацебо-контролируемое испытание.
          80 пациентов с нарушениями слуха в возрасте 50–79 лет. Группа лечения
          получала{" "}
          <strong className="text-white">
            мицелий ежовика, обогащённый эринацином А
          </strong>{" "}
          (2000 мг/день) в течение 8 месяцев.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Результат: у пациентов старше 65 лет наблюдалось{" "}
          <strong className="text-white">
            значимое улучшение слуха
          </strong>{" "}
          — как на высоких частотах, так и в распознавании речи. Также
          зафиксировано{" "}
          <strong className="text-white">
            повышение уровня NGF (фактора роста нервов)
          </strong>{" "}
          и BDNF в сыворотке крови. Это исследование — одно из первых,
          показавших, что эринацины из мицелия могут восстанавливать функцию
          слухового нерва у пожилых людей.
        </p>

        {/* Study 6 */}
        <h3 className="mb-3 mt-8 text-xl font-bold text-white">
          Когнитивные функции у здоровых людей
        </h3>
        <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          Li I-C. et al. (2024). Journal of Functional Foods.{" "}
          <a
            href="https://www.sciencedirect.com/science/article/pii/S1756464624001221"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300"
          >
            ScienceDirect
          </a>
        </div>
        <p className="mb-5 leading-relaxed text-white/80">
          8-недельное двойное слепое рандомизированное плацебо-контролируемое
          исследование. 33 здоровых добровольца получали мицелий ежовика,
          обогащённый эринацином А.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Результат:{" "}
          <strong className="text-white">
            значимое повышение скорости когнитивной обработки информации
          </strong>
          , рост уровня BDNF в сыворотке крови и улучшение разнообразия
          кишечной микробиоты. Это исследование важно тем, что показало: эринацины
          могут улучшать когнитивные функции не только у пациентов с нарушениями,
          но и у здоровых людей.
        </p>

        {/* Study 7 */}
        <h3 className="mb-3 mt-8 text-xl font-bold text-white">
          Систематический обзор: болезнь Альцгеймера и пищевые добавки
        </h3>
        <div className="mb-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          Kang Y. et al. (2022). Systematic Review.{" "}
          <a
            href="https://pubmed.ncbi.nlm.nih.gov/35686376/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300"
          >
            PubMed: 35686376
          </a>
        </div>
        <p className="mb-5 leading-relaxed text-white/80">
          Масштабный систематический обзор, в котором было проанализировано более
          22 000 исследований, посвящённых пищевым добавкам при болезни
          Альцгеймера. Из всех изученных веществ лишь несколько показали
          доказанное положительное влияние на когнитивный и функциональный
          прогноз.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          В числе эффективных были названы:{" "}
          <strong className="text-white">мицелий ежовика гребенчатого</strong>,
          ресвератрол, витамин D и бетаин. Эти четыре вещества улучшили
          когнитивные показатели, функциональный прогноз и качество жизни
          пациентов — в отличие от десятков других добавок, которые не показали
          значимого эффекта. Обратите внимание: речь идёт именно о{" "}
          <strong className="text-white">мицелии</strong>, а не о плодовых телах.
        </p>

        {/* Evidence caveat */}
        <h3 className="mb-3 mt-8 text-xl font-bold text-white">
          Важная оговорка о доказательной базе
        </h3>
        <p className="mb-5 leading-relaxed text-white/80">
          Все перечисленные исследования имеют ограничения: небольшие выборки
          (от 30 до 80 человек), различные стандарты экстрактов и формы
          гриба. Говорить о твёрдом научном консенсусе пока рано. Тем не менее
          направление результатов последовательно: мицелий, обогащённый
          эринацинами, демонстрирует положительное влияние на когнитивные
          функции в каждом из проведённых испытаний. Отдельно стоит отметить,
          что{" "}
          <a
            href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12018234/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline decoration-emerald-400/30 hover:text-emerald-300"
          >
            исследование 2025 года (Frontiers in Nutrition)
          </a>
          , в котором здоровые молодые люди однократно принимали экстракт
          плодовых тел (3 г, 10:1), не выявило значимого улучшения когнитивных
          функций — что косвенно подтверждает ключевую роль эринацинов из
          мицелия.
        </p>

        {/* SECTION 3: Why mycelium */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Почему мицелий, а не плодовое тело
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Этот вопрос вызывает горячие споры в грибном сообществе. Одни эксперты
          настаивают на превосходстве плодовых тел — мол, в них больше
          бета-глюканов и «настоящего гриба». Другие — и среди них Пол Стеметс
          (Paul Stamets), один из ведущих микологов мира — отстаивают мицелий как
          более ценный источник нейроактивных соединений.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Имеющиеся данные указывают в одном направлении. Эринацины —
          единственные вещества ежовика, для которых{" "}
          <strong className="text-white">
            в клинических испытаниях показано влияние на когнитивные функции,
            депрессию и нейрорегенерацию
          </strong>
          . И эринацины содержатся в мицелии. В плодовых телах их практически
          нет — это подтверждено{" "}
          <a
            href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11969743/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline decoration-emerald-400/30 hover:text-emerald-300"
          >
            геномным исследованием 2025 года (PMC11969743)
          </a>
          .
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Это не значит, что плодовые тела бесполезны. Герициноны из плодовых
          тел стимулируют NGF, обладают иммуномодулирующими и противоопухолевыми
          свойствами. Если ваша цель — общее укрепление иммунитета, порошок
          плодовых тел — вполне рабочий вариант. Но если вы ищете{" "}
          <strong className="text-white">
            ноотропный эффект, улучшение памяти и защиту от нейродегенерации
          </strong>{" "}
          — выбирайте добавки на основе мицелия, обогащённого эринацинами.
          Именно такой мицелий использовался во всех ключевых клинических
          испытаниях.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Однако здесь есть практическая ловушка. Большинство коммерческих
          добавок с пометкой «mycelium» — это{" "}
          <strong className="text-white">мицелий, выращенный на зерне</strong>{" "}
          (рис, овёс, пшеница). В таком порошке до 40–60% массы составляет
          крахмал от субстрата, а содержание бета-глюканов падает до 1–5%.
          Эринацинов в таких продуктах может быть мало или не быть вовсе. Это
          принципиально другой продукт по сравнению с мицелием из клинических
          исследований, где использовалась жидкая ферментация с контролируемым
          содержанием эринацина А.
        </p>

        {/* SECTION 4: NGF */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Фактор роста нервов (NGF) — почему это важно
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          NGF (Nerve Growth Factor) — белок, открытый нобелевским лауреатом
          Ритой Леви-Монтальчини в 1952 году. Он критически важен для роста,
          поддержания и выживания нейронов. С возрастом выработка NGF снижается,
          что связано с ухудшением памяти, когнитивными нарушениями и
          нейродегенеративными заболеваниями.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Ежовик гребенчатый — один из немногих природных источников веществ,
          способных{" "}
          <strong className="text-white">
            стимулировать синтез NGF в организме
          </strong>
          . Эринацины из мицелия проникают через гематоэнцефалический барьер
          (что крайне редко для природных соединений) и напрямую индуцируют
          выработку NGF в центральной нервной системе. Исследование на пожилых
          пациентах с нарушениями слуха{" "}
          <a
            href="https://www.sciencedirect.com/science/article/pii/S1756464622002900"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline decoration-emerald-400/30 hover:text-emerald-300"
          >
            (Li et al., 2022)
          </a>{" "}
          подтвердило: 8 месяцев приёма мицелия, обогащённого эринацином А,
          значимо повысили уровни NGF и BDNF в сыворотке крови.
        </p>

        {/* SECTION 5: Where to find */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Где растёт ежовик гребенчатый
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Ежовик гребенчатый — сапротроф и слабый паразит лиственных деревьев.
          Он растёт на стволах и пнях дуба, бука, клёна, берёзы, реже — на
          вязе и ясене. Предпочитает старые, ослабленные или уже погибшие
          деревья. В России встречается в Приморском крае, на Кавказе, в
          Крыму, реже — в средней полосе. В Беларуси фиксируется в Беловежской
          пуще и Полесских лесах.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Найти его — настоящая удача. Ежовик занесён в Красные книги многих
          регионов России и в Красную книгу Республики Беларусь. Если вы
          встретите его в лесу — сфотографируйте, запомните место и дерево.
          Плодовое тело появляется на одном и том же стволе годами, обычно в
          августе–октябре при температуре 15–20°C и высокой влажности.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Для грибника, который отслеживает свои лесные маршруты, ежовик — ещё
          один повод сохранять координаты интересных находок. В SkyForest можно
          отметить на карте место, где вы видели ежовик, привязать его к типу
          леса и отслеживать погодные условия — чтобы вернуться в нужный момент.
        </p>

        {/* SECTION 6: How to choose */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Как выбрать добавку с ежовиком
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Если вы хотите получить нейропротекторный эффект ежовика, но не
          планируете собирать его в лесу (и правильно — он в Красной книге),
          вот на что обращать внимание при выборе добавки:
        </p>
        <ul className="mb-5 list-inside space-y-2 text-white/80">
          <li className="leading-relaxed">
            <strong className="text-white">Состав:</strong> ищите продукты на
            основе мицелия, а не только плодовых тел. Идеально — с указанием
            содержания эринацинов (erinacine A, C). Мицелий должен быть
            получен методом жидкой ферментации, а не выращен на зерне.
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Дозировка:</strong> в клинических
            исследованиях использовались дозы от 750 мг до 3000 мг в день.
            Добавки с дозировкой 250–500 мг могут быть недостаточны.
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Длительность:</strong> эффекты
            нарастают к 4–8 неделе приёма. Принимать менее месяца — вряд ли
            почувствуете разницу.
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Сертификат анализа (COA):</strong>{" "}
            запрашивайте у производителя данные по содержанию бета-глюканов
            и альфа-глюканов (крахмала). Хороший показатель:
            бета-глюканы &gt; 20%, альфа-глюканы &lt; 10%. Если крахмала
            больше 30% — перед вами в основном зерно, а не гриб.
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Красные флаги:</strong> надписи
            «mycelium on grain», «myceliated grain», отсутствие указания
            содержания эринацинов, стоимость значительно ниже рынка.
          </li>
        </ul>

        {/* Summary */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Итого
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Ежовик гребенчатый — один из немногих грибов, чьё влияние на нервную
          систему подтверждено клиническими испытаниями на людях, а не только
          экспериментами на клеточных культурах. Улучшение памяти, снижение
          тревоги, улучшение сна, повышение NGF, восстановление слуха — всё это
          зафиксировано в рецензированных научных журналах.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Ключевой вывод: для когнитивных целей выбирайте{" "}
          <strong className="text-white">
            мицелий, обогащённый эринацинами
          </strong>{" "}
          (жидкая ферментация, не на зерне). Плодовые тела хороши для
          иммунитета, но клинических данных об их влиянии на когнитивные функции
          нет. Эффект накопительный: минимум 4 недели регулярного приёма, а при
          прекращении показатели могут снижаться.
        </p>
        <p className="mb-8 leading-relaxed text-white/80">
          Важно понимать: доказательная база по ежовику ещё формируется.
          Исследований мало, выборки небольшие, а продукты на рынке сильно
          отличаются от экстрактов, использованных учёными. Не стоит
          воспринимать ежовик как лекарство — но как перспективный объект
          нейронауки он заслуживает внимания.
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

        {/* Related */}
        <h2 className="mb-6 mt-16 text-2xl font-bold text-white">
          Читайте также
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {RELATED.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="group rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/10"
            >
              <h3 className="mb-2 text-sm font-semibold text-white transition-colors group-hover:text-emerald-400">
                {r.title}
              </h3>
              <p className="mb-2 text-xs leading-relaxed text-white/50">
                {r.desc}
              </p>
              <span className="text-xs text-white/40">{r.time}</span>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl sm:p-12">
          <h2 className="mb-4 text-2xl font-bold text-white">
            Отслеживайте погоду для ваших грибных мест
          </h2>
          <p className="mb-6 text-white/70">
            SkyForest анализирует осадки, температуру и влажность — и
            подсказывает лучший день для тихой охоты. Сохраняйте координаты
            находок, включая редкие виды вроде ежовика.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-primary-dark hover:shadow-xl"
          >
            Попробовать SkyForest →
          </Link>
        </div>
      </article>
    </>
  );
}
