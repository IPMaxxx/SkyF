import { Link } from "@/i18n/navigation";
import Image from "next/image";

const ALL_ARTICLES = [
  {
    href: "/blog/kak-opredelit-grib",
    title: "Как определить гриб по фото: приложения, нейросети и признаки",
    description:
      "Точность определителей, что фотографировать и какие признаки проверять. Плюс определитель SkyForest в Telegram.",
    image: "/images/blog/blog-kak-opredelit-grib.jpg",
    readTime: "11 мин",
  },
  {
    href: "/blog/pervye-majskie-boroviki",
    title: "Первые майские боровики: где и когда искать ранний белый гриб",
    description:
      "Боровик сетчатый — самый ранний белый гриб. Сроки, места, погода и отличия от двойников.",
    image: "/images/blog/blog-pervye-majskie-boroviki.jpg",
    readTime: "10 мин",
  },
  {
    href: "/blog/pogoda-dlya-gribov",
    title: "Погода для грибов: при какой температуре и влажности растут грибы",
    description:
      "Какие погодные условия идеальны для роста грибов. Температура, влажность, осадки — что важно знать.",
    image: "/images/blog/blog-pogoda-dlya-gribov.jpg",
    readTime: "12 мин",
  },
  {
    href: "/blog/griby-posle-dozhdya",
    title: "Через сколько дней после дождя появляются грибы",
    description:
      "Оптимальные сроки после осадков для разных видов. Белые, лисички, опята — у каждого свои «окна».",
    image: "/images/blog/blog-griby-posle-dozhdya.jpg",
    readTime: "8 мин",
  },
  {
    href: "/blog/kogda-pora-v-les",
    title: "Когда пора в лес: 7 признаков, что грибы пошли",
    description:
      "Практические признаки начала сезона. Температура почвы, первые находки и другие подсказки.",
    image: "/images/blog/blog-kogda-pora-v-les.jpg",
    readTime: "6 мин",
  },
  {
    href: "/blog/v-kakom-lesu-iskat-griby",
    title: "В каком лесу искать грибы: хвойный, лиственный или смешанный",
    description:
      "Какие грибы где растут: белые в сосняках, подберёзовики у берёз. Гид по типам лесов.",
    image: "/images/blog/blog-v-kakom-lesu-iskat-griby.jpg",
    readTime: "10 мин",
  },
  {
    href: "/blog/gde-rastut-griby",
    title: "Где растут грибы в России и Беларуси",
    description:
      "Регионы, леса и конкретные места для тихой охоты. Карта грибных мест и советы по планированию.",
    image: "/images/blog/blog-gde-rastut-griby.jpg",
    readTime: "12 мин",
  },
];

export function RelatedArticles({ currentSlug }: { currentSlug: string }) {
  const articles = ALL_ARTICLES.filter(
    (a) => a.href !== `/blog/${currentSlug}`
  );

  return (
    <section className="mt-14">
      <h2 className="mb-6 text-2xl font-bold text-white">Читайте также</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {articles.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:border-white/20 hover:bg-white/10"
          >
            <div className="relative hidden h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg sm:block">
              <Image
                src={a.image}
                alt={a.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110"
                sizes="80px"
              />
            </div>
            <div className="flex flex-1 flex-col justify-center">
              <h3 className="mb-1 text-sm font-semibold leading-snug text-white transition-colors group-hover:text-emerald-400">
                {a.title}
              </h3>
              <p className="text-xs leading-relaxed text-white/50">
                {a.description}
              </p>
              <span className="mt-1.5 text-[11px] text-white/30">
                {a.readTime}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
