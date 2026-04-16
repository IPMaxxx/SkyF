import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { RelatedArticles } from "@/components/marketing/RelatedArticles";

export const metadata: Metadata = {
  title: "Погода для грибов: при какой температуре и влажности растут грибы",
  description:
    "Узнайте, какая погода нужна для роста грибов. Оптимальная температура, влажность и осадки для белых грибов, опят, лисичек. Научные данные и советы опытных грибников.",
  keywords: [
    "погода для грибов",
    "при какой температуре растут грибы",
    "влажность для грибов",
    "условия роста грибов",
    "когда растут грибы",
    "оптимальная температура для грибов",
    "грибная погода",
    "погода для белых грибов",
    "погода для опят",
    "погода для лисичек",
    "тихая охота",
    "грибной сезон",
    "грибы после дождя",
  ],
  openGraph: {
    title: "Погода для грибов: при какой температуре и влажности растут грибы",
    description:
      "Узнайте, какая погода нужна для роста грибов. Оптимальная температура, влажность и осадки для белых грибов, опят, лисичек.",
    url: "https://www.skyforest.by/blog/pogoda-dlya-gribov",
    siteName: "SkyForest",
    type: "article",
    images: [{ url: "https://www.skyforest.by/images/blog/blog-pogoda-dlya-gribov.jpg", width: 1792, height: 1024, alt: "Погода для грибов — боровики в лесу после дождя" }],
    publishedTime: "2025-09-01T00:00:00+03:00",
    modifiedTime: "2025-09-01T00:00:00+03:00",
    authors: ["SkyForest"],
    section: "Грибы",
  },
  alternates: { canonical: "https://www.skyforest.by/blog/pogoda-dlya-gribov" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline:
        "Погода для грибов: при какой температуре и влажности растут грибы",
      description:
        "Узнайте, какая погода нужна для роста грибов. Оптимальная температура, влажность и осадки для белых грибов, опят, лисичек. Научные данные и советы опытных грибников.",
      author: { "@type": "Organization", name: "SkyForest", url: "https://www.skyforest.by" },
      publisher: {
        "@type": "Organization",
        name: "SkyForest",
        url: "https://www.skyforest.by",
        logo: { "@type": "ImageObject", url: "https://www.skyforest.by/images/logo-square.png" },
      },
      datePublished: "2025-09-01",
      dateModified: "2025-09-01",
      mainEntityOfPage: "https://www.skyforest.by/blog/pogoda-dlya-gribov",
      image: {
        "@type": "ImageObject",
        url: "https://www.skyforest.by/images/blog/blog-pogoda-dlya-gribov.jpg",
        width: 1792,
        height: 1024,
      },
      inLanguage: "ru",
      keywords:
        "погода для грибов, при какой температуре растут грибы, влажность для грибов, условия роста грибов",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная", item: "https://www.skyforest.by" },
        { "@type": "ListItem", position: 2, name: "Блог", item: "https://www.skyforest.by/blog" },
        { "@type": "ListItem", position: 3, name: "Погода для грибов" },
      ],
    },
  ],
};

export default function PogodaDlyaGribovPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        {/* Back link */}
        <Link
          href="/blog"
          className="mb-10 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white/80"
        >
          <ArrowLeft className="h-4 w-4" />
          Блог
        </Link>

        {/* Title */}
        <h1 className="mb-6 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          Погода для грибов: при&nbsp;какой температуре и&nbsp;влажности растут
          грибы
        </h1>

        <p className="mb-8 text-sm text-white/40">
          Обновлено: 1 сентября 2025 · Время чтения: 12 мин
        </p>

        <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-2xl">
          <Image
            src="/images/blog/blog-pogoda-dlya-gribov.jpg"
            alt="Боровики растут на мшистой поляне в лесу после дождя — лучи солнца пробиваются сквозь тучи"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        {/* --- INTRO --- */}
        <p className="mb-5 text-lg leading-relaxed text-white/80">
          Каждый опытный грибник знает: можно обойти десять километров леса и
          вернуться с пустым лукошком, а можно заглянуть в знакомый ельник на
          полчаса — и набрать полную корзину. Разница не в везении и не в
          секретных местах. Разница — в&nbsp;
          <strong className="text-white">погоде для грибов</strong>. Именно
          погодные условия определяют, проснётся ли грибница, начнёт ли мицелий
          формировать плодовые тела, и хватит ли им влаги, чтобы вырасти до
          размера, который стоит класть в корзину.
        </p>
        <p className="mb-5 text-lg leading-relaxed text-white/80">
          Согласно публикации в журнале{" "}
          <em>Mycological Research</em>, плодоношение базидиомицетов (к которым
          относится большинство съедобных грибов) запускается комбинацией трёх
          ключевых факторов: температура почвы, влажность субстрата и перепад
          между дневными и ночными температурами. Ни один из этих факторов сам по
          себе не «включает» грибной слой — работает только их сочетание.
        </p>
        <p className="mb-8 text-lg leading-relaxed text-white/80">
          В этой статье мы разберём{" "}
          <strong className="text-white">
            при какой температуре растут грибы
          </strong>
          , какая влажность нужна для разных видов, сколько дождя должно
          выпасть и когда именно ждать грибной слёт. Все данные подкреплены
          научными источниками и проверены практикой тихой охоты.
        </p>

        {/* --- SECTION 1: TEMPERATURE --- */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Температура воздуха и почвы
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Когда грибники говорят «пошли грибы», за этим стоит вполне конкретная
          физика: температура почвы на глубине 5–10 см стабильно держится в
          определённом диапазоне. Как отмечает профессор Л.Г. Переведенцева в
          работе «Микология: грибы и грибоподобные организмы», мицелий
          большинства лесных грибов начинает активный рост при температуре почвы
          от +8°C, а оптимальная температура для формирования плодовых тел — от
          +10 до +20°C.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Но у каждого вида свой «любимый» диапазон. Белый гриб (боровик)
          предпочитает тёплую, но не жаркую погоду — +15…+20°C воздуха. Стоит
          термометру перевалить за +25°C, и боровик «засыпает»: мицелию слишком
          жарко и сухо. Лисички, наоборот, стартуют раньше и терпимее к
          прохладе — им комфортно уже при +10…+16°C. А опята осенние вообще любят
          холод: массовое плодоношение начинается, когда ночные температуры
          опускаются до +5…+10°C.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Важен не только абсолютный показатель, но и{" "}
          <strong className="text-white">
            перепад между дневной и ночной температурой
          </strong>
          . По данным исследований микологов МГУ, разница в 8–12 градусов между
          днём и ночью — один из самых мощных триггеров плодоношения. Это
          объясняет, почему грибы массово появляются в конце августа — начале
          сентября, когда дни ещё тёплые, а ночи уже по-осеннему свежие.
        </p>

        {/* Temperature table */}
        <div className="my-8 overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 font-semibold text-white">Вид гриба</th>
                <th className="px-4 py-3 font-semibold text-white">
                  Оптимальная t° воздуха
                </th>
                <th className="px-4 py-3 font-semibold text-white">
                  Мин. t° почвы
                </th>
                <th className="px-4 py-3 font-semibold text-white">Сезон</th>
              </tr>
            </thead>
            <tbody className="text-white/70">
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">Белый гриб (боровик)</td>
                <td className="px-4 py-3">+15…+20°C</td>
                <td className="px-4 py-3">+10°C</td>
                <td className="px-4 py-3">Июль — сентябрь</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">Подберёзовик</td>
                <td className="px-4 py-3">+14…+20°C</td>
                <td className="px-4 py-3">+9°C</td>
                <td className="px-4 py-3">Июнь — октябрь</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">Подосиновик</td>
                <td className="px-4 py-3">+14…+22°C</td>
                <td className="px-4 py-3">+9°C</td>
                <td className="px-4 py-3">Июнь — октябрь</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">Лисички</td>
                <td className="px-4 py-3">+10…+16°C</td>
                <td className="px-4 py-3">+8°C</td>
                <td className="px-4 py-3">Июнь — октябрь</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">Маслята</td>
                <td className="px-4 py-3">+12…+18°C</td>
                <td className="px-4 py-3">+8°C</td>
                <td className="px-4 py-3">Июнь — октябрь</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">Опята осенние</td>
                <td className="px-4 py-3">+8…+14°C</td>
                <td className="px-4 py-3">+5°C</td>
                <td className="px-4 py-3">Сентябрь — ноябрь</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">Грузди</td>
                <td className="px-4 py-3">+10…+16°C</td>
                <td className="px-4 py-3">+8°C</td>
                <td className="px-4 py-3">Июль — октябрь</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">Рыжики</td>
                <td className="px-4 py-3">+10…+18°C</td>
                <td className="px-4 py-3">+7°C</td>
                <td className="px-4 py-3">Август — октябрь</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Сыроежки</td>
                <td className="px-4 py-3">+12…+22°C</td>
                <td className="px-4 py-3">+8°C</td>
                <td className="px-4 py-3">Июнь — октябрь</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mb-8 text-sm leading-relaxed text-white/50">
          * Данные обобщены по материалам кафедры микологии и альгологии
          биологического факультета МГУ и справочнику «Грибы Беларуси»
          (Гапиенко О.С., 2012).
        </p>

        {/* --- SECTION 2: HUMIDITY --- */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Влажность — главный союзник грибника
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Если температура — это «включатель» грибного сезона, то{" "}
          <strong className="text-white">влажность для грибов</strong> — это
          топливо. Плодовое тело гриба на 85–95% состоит из воды. Без
          достаточного увлажнения мицелий просто не сможет «вытолкнуть» гриб на
          поверхность, даже если температура идеальна.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Оптимальная относительная влажность воздуха для большинства съедобных
          грибов — <strong className="text-white">70–90%</strong>. При влажности
          ниже 60% даже начавшие расти грибы останавливаются, подсыхают и
          становятся червивыми быстрее обычного. По данным исследований,
          опубликованных в журнале <em>Fungal Ecology</em>, снижение влажности
          субстрата ниже 40% полностью блокирует образование примордиев (зачатков
          плодовых тел).
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Влажность почвы не менее важна, чем влажность воздуха. Идеальный
          показатель — когда лесная подстилка влажная на ощупь, но вода не стоит
          лужами. Опытные грибники проверяют просто: берут горсть мха или хвои и
          сжимают — если между пальцами выступают капли, влаги достаточно. Если
          подстилка рассыпается как пыль — ждать грибов бессмысленно, даже если
          неделю назад шёл дождь.
        </p>
        <p className="mb-8 leading-relaxed text-white/80">
          Отдельно стоит упомянуть{" "}
          <strong className="text-white">росу и туманы</strong>. Утренние туманы —
          верный признак того, что влажность в лесу на нужном уровне. Не зря в
          народе говорят: «Туман над лесом — грибы на месте». Тёплые ночи с
          обильной росой поддерживают влажность приземного слоя воздуха даже в
          периоды без осадков.
        </p>

        {/* --- SECTION 3: RAINFALL --- */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Осадки: сколько дождя нужно грибам
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          «Грибной дождь» — не просто красивое выражение. Тип осадков напрямую
          влияет на условия роста грибов. Идеальный сценарий —{" "}
          <strong className="text-white">
            тёплый умеренный дождь, 10–20 мм за сутки, продолжающийся 2–3 дня
          </strong>
          , после которого следует 5–7 дней тёплой погоды без экстремальной жары.
          Именно такой паттерн запускает массовое плодоношение.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Короткий ливень в 30–50 мм за час — почти бесполезен для грибов.
          Такой дождь не успевает впитаться: вода скатывается по поверхности,
          уходит в ручьи, а верхний слой почвы, где расположена грибница,
          остаётся сухим уже через день. Затяжные моросящие дожди куда полезнее —
          они пропитывают лесную подстилку равномерно и надолго.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Ключевое правило:{" "}
          <strong className="text-white">
            основной слой грибов появляется через 7–14 дней после обильных осадков
          </strong>
          . Этот срок нужен мицелию, чтобы «напитаться» влагой, сформировать
          примордии и вырастить их до заметного размера. Быстрее всех
          реагируют сыроежки и маслята (5–7 дней), дольше всех «раскачиваются»
          белые грибы и грузди (10–14 дней).
        </p>
        <p className="mb-8 leading-relaxed text-white/80">
          Как отмечает профессор Л.Г. Переведенцева, для устойчивого
          плодоношения необходимо, чтобы сумма осадков за предшествующие 2–3
          недели составила не менее 30–50 мм. Если за этот период выпало менее
          20 мм — на массовый грибной слёт рассчитывать не стоит, хотя единичные
          экземпляры в низинах и вдоль ручьёв могут появиться.
        </p>

        {/* --- SECTION 4: WIND & PRESSURE --- */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Ветер и атмосферное давление
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Температура, влажность и осадки — три главных кита грибной погоды. Но
          есть и вторичные факторы, которые опытные грибники тоже учитывают.
          Сильный ветер (более 7–8 м/с) высушивает верхний слой почвы и лесную
          подстилку, снижая влажность в зоне грибницы. После нескольких ветреных
          дней даже хорошо увлажнённый лес может «подсохнуть» настолько, что
          грибы перестают расти.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Атмосферное давление — фактор спорный, но многие грибники клянутся, что
          грибы лучше растут при{" "}
          <strong className="text-white">
            стабильном или слегка пониженном давлении (740–755 мм рт. ст.)
          </strong>
          . Научных подтверждений этому немного, однако косвенная связь есть:
          пониженное давление обычно сопровождается облачностью, высокой
          влажностью и осадками — а это уже прямые условия роста грибов.
        </p>
        <p className="mb-8 leading-relaxed text-white/80">
          Резкие скачки давления (более 5 мм рт. ст. за сутки), как правило,
          совпадают со сменой погодных фронтов. Если после тёплого фронта с
          дождями приходит холодный фронт с прояснением — это часто «запирает»
          грибной рост на несколько дней. Поэтому идеальное окно для тихой
          охоты — стабильная тёплая погода через неделю-полторы после обильных
          дождей, без резких барометрических колебаний.
        </p>

        {/* --- SECTION 5: SPECIES-SPECIFIC --- */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Погодные условия для разных видов грибов
        </h2>

        <h3 className="mb-3 mt-8 text-xl font-bold text-white">
          Белый гриб (боровик)
        </h3>
        <p className="mb-5 leading-relaxed text-white/80">
          Король тихой охоты требователен к погоде. Оптимальная{" "}
          <strong className="text-white">погода для белых грибов</strong> — это
          температура воздуха +15…+20°C, влажность 75–85%, отсутствие
          сильного ветра. Боровик не любит ни жару, ни холод: при +25°C и выше
          рост замедляется, при +8°C и ниже — прекращается. Белый гриб
          предпочитает хорошо прогретую почву, поэтому первые «слои» появляются
          не раньше середины июня, а пик приходится на август — начало
          сентября. После обильного тёплого дождя ждите боровиков через 10–14
          дней. Ищите их в сосновых борах с моховой подстилкой, в ельниках и
          смешанных лесах с берёзой.
        </p>

        <h3 className="mb-3 mt-8 text-xl font-bold text-white">Опята</h3>
        <p className="mb-5 leading-relaxed text-white/80">
          <strong className="text-white">Погода для опят</strong> — отдельная
          история. Осенний опёнок (Armillaria mellea) — один из немногих грибов,
          которому нужен холод для старта. Массовое плодоношение начинается, когда
          среднесуточная температура опускается ниже +12…+14°C, а ночами бывает
          +5…+8°C. Первые заморозки опятам не страшны — они продолжают расти даже
          после кратковременных минусов. Влажность для опят критична: при
          пересыхании древесного субстрата (пни, стволы) рост быстро
          прекращается. Зато один хороший дождь — и через 5–7 дней на знакомых
          пнях появляются целые «семьи».
        </p>

        <h3 className="mb-3 mt-8 text-xl font-bold text-white">Лисички</h3>
        <p className="mb-5 leading-relaxed text-white/80">
          <strong className="text-white">Погода для лисичек</strong> — самая
          «демократичная». Лисички начинают расти раньше многих других грибов
          (уже в июне) и заканчивают позже (до октября). Оптимальная
          температура — +10…+16°C, но они терпят и более тёплую погоду, если
          влажность достаточна. Лисичка практически не бывает червивой благодаря
          содержанию хиноманнозы, поэтому даже в засушливый период можно
          найти пригодные экземпляры. Главное условие — стабильная влажность
          лесной подстилки. Лисички растут волнами: после каждого серьёзного дождя
          через 5–10 дней появляется новый «слой».
        </p>

        <h3 className="mb-3 mt-8 text-xl font-bold text-white">Маслята</h3>
        <p className="mb-5 leading-relaxed text-white/80">
          Маслята — одни из самых быстро реагирующих на дождь грибов. Оптимальная
          температура — +12…+18°C. Они тесно связаны с сосной и елью, образуют
          микоризу с хвойными. После тёплого дождя маслята могут «выскочить» уже
          через 3–5 дней. Однако они крайне чувствительны к пересыханию: стоит
          лесной подстилке высохнуть — и маслята исчезают до следующих осадков.
          Также маслята не любят сильную жару — при +25°C и выше быстро
          становятся червивыми.
        </p>

        <h3 className="mb-3 mt-8 text-xl font-bold text-white">Грузди</h3>
        <p className="mb-8 leading-relaxed text-white/80">
          Грузди — грибы позднего лета и осени. Оптимальная температура —
          +10…+16°C. Грузди требовательны к влажности: им нужна хорошо
          пропитанная водой почва и высокая влажность воздуха (80–90%). Сухое
          лето — враг груздей. Зато после затяжных сентябрьских дождей
          берёзовые рощи и смешанные леса могут порадовать обильным урожаем.
          Белый груздь (настоящий) встречается реже и капризнее, чёрный груздь —
          более неприхотлив. Для груздей также важна толщина лиственного опада:
          они часто прячутся под слоем листвы, и без достаточной влаги просто не
          пробиваются наверх.
        </p>

        {/* --- SECTION 6: HOW TO TRACK --- */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Как отслеживать погоду для грибов
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Итак, мы выяснили: чтобы определить{" "}
          <strong className="text-white">условия роста грибов</strong>, нужно
          одновременно отслеживать температуру воздуха и почвы, влажность,
          количество осадков за последние 2–3 недели, ветер и барометрическое
          давление. Для каждого вида — свои диапазоны и тайминги. Делать это
          вручную, сверяя прогнозы с календарём осадков, — можно, но
          утомительно.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Сервис{" "}
          <Link
            href="/"
            className="text-emerald-400 hover:text-emerald-300"
          >
            SkyForest
          </Link>{" "}
          автоматически анализирует все эти параметры для ваших грибных
          локаций. Вы сохраняете координаты своего места и дату лучшего
          сбора — система запоминает погодный паттерн и каждый день проверяет,
          повторяются ли условия. Когда все показатели совпадают — вы получаете
          уведомление: пора собираться в лес.
        </p>
        <p className="mb-8 leading-relaxed text-white/80">
          Больше не нужно каждое утро открывать три приложения с прогнозом,
          вспоминать, когда последний раз шёл дождь, и гадать, прогрелась ли
          почва. SkyForest делает всё это за вас — а вам остаётся только взять
          корзину и нож.
        </p>

        {/* --- FAQ --- */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Часто задаваемые вопросы
        </h2>

        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <h3 className="mb-2 font-semibold text-white">
              При какой температуре начинают расти грибы?
            </h3>
            <p className="leading-relaxed text-white/70">
              Большинство съедобных грибов начинают расти при температуре почвы от
              +8°C. Оптимальная температура воздуха для основных видов — +10…+20°C.
              Опята могут расти при более низких температурах — от +5°C.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <h3 className="mb-2 font-semibold text-white">
              Через сколько дней после дождя появляются грибы?
            </h3>
            <p className="leading-relaxed text-white/70">
              В среднем через 7–14 дней после обильного тёплого дождя. Быстрее
              всех появляются сыроежки и маслята (5–7 дней), дольше
              «раскачиваются» белые грибы и грузди (10–14 дней). Многое зависит
              от температуры и предшествующего увлажнения почвы.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <h3 className="mb-2 font-semibold text-white">
              Какая влажность нужна для роста грибов?
            </h3>
            <p className="leading-relaxed text-white/70">
              Оптимальная относительная влажность воздуха — 70–90%. Влажность
              почвы и лесной подстилки должна быть достаточной, чтобы при сжатии
              мха или хвои между пальцами выступала влага. При влажности ниже 60%
              плодоношение замедляется или прекращается.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <h3 className="mb-2 font-semibold text-white">
              Могут ли грибы расти в жару?
            </h3>
            <p className="leading-relaxed text-white/70">
              При температуре выше +25–28°C рост большинства грибов замедляется
              или прекращается. В жаркую и сухую погоду грибница «засыпает».
              Исключение — некоторые виды сыроежек, которые терпят более высокие
              температуры при достаточной влажности. Однако жара выше +30°C
              губительна практически для всех лесных грибов.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <h3 className="mb-2 font-semibold text-white">
              Как понять, что условия для грибов подходящие?
            </h3>
            <p className="leading-relaxed text-white/70">
              Обратите внимание на три фактора: 1) за последние 1–2 недели шли
              умеренные дожди (суммарно 30–50 мм); 2) температура воздуха
              держится в диапазоне +10…+20°C; 3) по утрам в лесу стоит туман или
              обильная роса. Если все три условия совпали — самое время на тихую
              охоту. Или доверьте анализ{" "}
              <Link
                href="/"
                className="text-emerald-400 hover:text-emerald-300"
              >
                SkyForest
              </Link>{" "}
              — сервис проверяет это автоматически.
            </p>
          </div>
        </div>

        {/* --- CTA --- */}
        <div className="my-16 rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center backdrop-blur-xl sm:px-10 sm:py-14">
          <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">
            Не гадайте — знайте, когда идти за грибами
          </h2>
          <p className="mb-8 leading-relaxed text-white/70">
            SkyForest анализирует температуру, влажность, осадки и давление
            для ваших грибных мест. Зарегистрируйтесь — и получайте
            уведомления, когда грибная погода наступит.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 hover:shadow-xl"
          >
            Зарегистрироваться бесплатно
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <RelatedArticles currentSlug="pogoda-dlya-gribov" />
      </article>
    </>
  );
}
