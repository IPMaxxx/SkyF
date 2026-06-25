import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import {
  CloudSun,
  Droplets,
  TreePine,
  Trees,
  MapPin,
  Brain,
  ScanSearch,
  Sprout,
  ArrowRight,
} from "lucide-react";
import { MarketingPageHeader } from "@/components/marketing/MarketingPageHeader";
import { marketingPageMetadata } from "@/lib/marketingSeo";
import { BRAND } from "@/lib/brand";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === "en"
      ? "Mushroom picking blog"
      : "Блог о грибах — советы грибникам";
  const description =
    locale === "en"
      ? "Articles for mushroom pickers: weather, timing, forest types, and mushroom identification tips."
      : "Статьи для грибников: погода для грибов, когда идти в лес, где искать грибы и как определить вид.";
  return marketingPageMetadata({ title, description, path: "/blog", locale });
}

const ARTICLES = [
  {
    href: "/blog/kak-opredelit-grib",
    title: "Как определить гриб по фото: приложения, нейросети и признаки",
    description:
      "Как работают определители грибов, какая у них точность, что фотографировать и какие признаки проверять вручную. Плюс бесплатный определитель SkyForest в Telegram.",
    icon: ScanSearch,
    image: "/images/blog/blog-kak-opredelit-grib.jpg",
    readTime: "11 мин",
    gradient: "from-sky-500/30 to-cyan-600/20",
  },
  {
    href: "/blog/pervye-majskie-boroviki",
    title: "Первые майские боровики: где и когда искать ранний белый гриб",
    description:
      "Боровик сетчатый — самый ранний белый гриб. Когда появляется, в каких лесах искать, какая погода нужна и как отличить от двойников.",
    icon: Sprout,
    image: "/images/blog/blog-pervye-majskie-boroviki.jpg",
    readTime: "10 мин",
    gradient: "from-emerald-500/30 to-lime-600/20",
  },
  {
    href: "/blog/pogoda-dlya-gribov",
    title: "Погода для грибов: при какой температуре и влажности растут грибы",
    description:
      "Разбираемся, какие погодные условия идеальны для роста грибов. Температура, влажность воздуха и почвы — что важно знать перед походом в лес.",
    icon: CloudSun,
    image: "/images/blog/blog-pogoda-dlya-gribov.jpg",
    readTime: "12 мин",
    gradient: "from-amber-500/30 to-orange-600/20",
  },
  {
    href: "/blog/griby-posle-dozhdya",
    title: "Через сколько дней после дождя появляются грибы",
    description:
      "Узнайте оптимальные сроки после осадков для разных видов грибов. Белые, подберёзовики, лисички — у каждого свои «окна» после дождя.",
    icon: Droplets,
    image: "/images/blog/blog-griby-posle-dozhdya.jpg",
    readTime: "8 мин",
    gradient: "from-sky-500/30 to-blue-600/20",
  },
  {
    href: "/blog/kogda-pora-v-les",
    title: "Когда пора в лес: 7 признаков, что грибы пошли",
    description:
      "Практические признаки, по которым опытные грибники понимают, что сезон начался. Температура почвы, трава, первые находки и другие подсказки.",
    icon: TreePine,
    image: "/images/blog/blog-kogda-pora-v-les.jpg",
    readTime: "6 мин",
    gradient: "from-emerald-500/30 to-green-600/20",
  },
  {
    href: "/blog/v-kakom-lesu-iskat-griby",
    title: "В каком лесу искать грибы: хвойный, лиственный или смешанный",
    description:
      "Какие грибы где растут: белые в сосняках, подберёзовики у берёз, маслята в молодых ельниках. Гид по типам лесов и их обитателям.",
    icon: Trees,
    image: "/images/blog/blog-v-kakom-lesu-iskat-griby.jpg",
    readTime: "10 мин",
    gradient: "from-lime-500/30 to-green-600/20",
  },
  {
    href: "/blog/gde-rastut-griby",
    title: "Где растут грибы в России и Беларуси: полный гид по видам и местам",
    description:
      "Регионы, леса и конкретные места для тихой охоты. Карта грибных мест, сезонность по регионам и советы по планированию поездок.",
    icon: MapPin,
    image: "/images/blog/blog-gde-rastut-griby.jpg",
    readTime: "12 мин",
    gradient: "from-rose-500/30 to-pink-600/20",
  },
  {
    href: "/blog/ezhovik-grebenchatyj",
    title: "Ежовик гребенчатый: гриб для мозга — что говорит наука",
    description:
      "Разбираем клинические исследования Lion's Mane: эринацины vs герициноны, мицелий vs плодовое тело. Только данные из рецензированных журналов.",
    icon: Brain,
    image: "/images/blog/blog-ezhovik-grebenchatyj.jpg",
    readTime: "15 мин",
    gradient: "from-violet-500/30 to-purple-600/20",
  },
] as const;

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "header" });
  const pageTitle = locale === "en" ? "Mushroom picking blog" : "Блог для грибников";
  const pageLead =
    locale === "en"
      ? "Tips on weather, timing, forests, and mushroom identification"
      : "Советы по тихой охоте: погода, места, сроки и признаки удачного сезона";

  return (
    <div className="min-h-screen">
      <section className="relative px-4 pt-24 pb-16 sm:pt-28 sm:pb-20">
        <div className="mx-auto max-w-4xl">
          <MarketingPageHeader
            locale={locale}
            title={pageTitle}
            description={pageLead}
            breadcrumbs={[{ name: t("blog"), path: "/blog" }]}
          />
        </div>
      </section>

      {/* Article grid */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ARTICLES.map((article) => (
              <Link
                key={article.href}
                href={article.href}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/10"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                  <Image
                    src={article.image}
                    alt={article.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div
                    className={`absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${article.gradient} backdrop-blur-sm`}
                  >
                    <article.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="mb-2 text-lg font-semibold leading-snug text-white transition-colors group-hover:text-primary-light">
                    {article.title}
                  </h2>
                  <p className="mb-4 flex-1 text-sm leading-relaxed text-white/70">
                    {article.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">{article.readTime}</span>
                    <span className="text-sm font-medium text-primary-light transition-colors group-hover:text-primary-light/90">
                      Читать →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center backdrop-blur-xl sm:px-12 sm:py-16">
            <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">
              SkyForest — ваш умный помощник для тихой охоты
            </h2>
            <p className="mb-8 text-white/70">
              {locale === "en"
                ? `${BRAND.name} analyzes weather and suggests the best time to pick mushrooms. Free registration.`
                : "SkyForest анализирует погоду и подсказывает, когда условия идеальны для сбора грибов. Регистрация бесплатна."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-primary-dark"
              >
                {locale === "en" ? "Sign up" : "Зарегистрироваться"}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-4 text-base font-medium text-white transition-colors hover:bg-white/10"
              >
                {locale === "en" ? "Services" : "Услуги"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
