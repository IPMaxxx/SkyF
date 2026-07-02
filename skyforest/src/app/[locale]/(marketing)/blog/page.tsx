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
  const title = "Mushroom picking blog";
  const description =
    "Articles for mushroom pickers: weather, timing, forest types, and mushroom identification tips.";
  return marketingPageMetadata({ title, description, path: "/blog", locale });
}

const ARTICLES = [
  {
    href: "/blog/kak-opredelit-grib",
    title: "How to identify a mushroom from a photo: apps, neural networks and key features",
    description:
      "How mushroom identifiers work, how accurate they are, what to photograph and which features to check by hand. Plus the free SkyForest identifier on Telegram.",
    icon: ScanSearch,
    image: "/images/blog/blog-kak-opredelit-grib.jpg",
    readTime: "11 min",
    gradient: "from-sky-500/30 to-cyan-600/20",
  },
  {
    href: "/blog/pervye-majskie-boroviki",
    title: "The first May porcini: where and when to find the early cep",
    description:
      "The summer cep is the earliest porcini. When it appears, which forests to search, what weather it needs and how to tell it from look-alikes.",
    icon: Sprout,
    image: "/images/blog/blog-pervye-majskie-boroviki.jpg",
    readTime: "10 min",
    gradient: "from-emerald-500/30 to-lime-600/20",
  },
  {
    href: "/blog/pogoda-dlya-gribov",
    title: "Weather for mushrooms: at what temperature and humidity mushrooms grow",
    description:
      "We break down which weather conditions are ideal for mushroom growth. Temperature, air and soil humidity — what to know before heading into the forest.",
    icon: CloudSun,
    image: "/images/blog/blog-pogoda-dlya-gribov.jpg",
    readTime: "12 min",
    gradient: "from-amber-500/30 to-orange-600/20",
  },
  {
    href: "/blog/griby-posle-dozhdya",
    title: "How many days after rain do mushrooms appear",
    description:
      "Learn the best windows after rainfall for different mushroom species. Ceps, birch boletes and chanterelles each have their own timing after rain.",
    icon: Droplets,
    image: "/images/blog/blog-griby-posle-dozhdya.jpg",
    readTime: "8 min",
    gradient: "from-sky-500/30 to-blue-600/20",
  },
  {
    href: "/blog/kogda-pora-v-les",
    title: "When it's time to head to the forest: 7 signs the mushrooms are up",
    description:
      "Practical signs that experienced foragers use to know the season has begun. Soil temperature, grass, first finds and other clues.",
    icon: TreePine,
    image: "/images/blog/blog-kogda-pora-v-les.jpg",
    readTime: "6 min",
    gradient: "from-emerald-500/30 to-green-600/20",
  },
  {
    href: "/blog/v-kakom-lesu-iskat-griby",
    title: "Which forest to search for mushrooms: coniferous, deciduous or mixed",
    description:
      "Which mushrooms grow where: ceps in pine forests, birch boletes near birches, slippery jacks in young spruce stands. A guide to forest types and their inhabitants.",
    icon: Trees,
    image: "/images/blog/blog-v-kakom-lesu-iskat-griby.jpg",
    readTime: "10 min",
    gradient: "from-lime-500/30 to-green-600/20",
  },
  {
    href: "/blog/gde-rastut-griby",
    title: "Where mushrooms grow in Russia and Belarus: a complete guide to species and places",
    description:
      "Regions, forests and specific spots for mushroom foraging. A map of mushroom locations, seasonality by region and tips for planning trips.",
    icon: MapPin,
    image: "/images/blog/blog-gde-rastut-griby.jpg",
    readTime: "12 min",
    gradient: "from-rose-500/30 to-pink-600/20",
  },
  {
    href: "/blog/ezhovik-grebenchatyj",
    title: "Lion's Mane: the mushroom for the brain — what science says",
    description:
      "We review the clinical research on Lion's Mane: erinacines vs hericenones, mycelium vs fruiting body. Only data from peer-reviewed journals.",
    icon: Brain,
    image: "/images/blog/blog-ezhovik-grebenchatyj.jpg",
    readTime: "15 min",
    gradient: "from-violet-500/30 to-purple-600/20",
  },
] as const;

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "header" });
  const pageTitle = "Mushroom picking blog";
  const pageLead =
    "Tips on weather, timing, forests, and mushroom identification";

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
                      Read →
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
              SkyForest — your smart assistant for mushroom foraging
            </h2>
            <p className="mb-8 text-white/70">
              {`${BRAND.name} analyzes weather and suggests the best time to pick mushrooms. Free registration.`}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-primary-dark"
              >
                Sign up
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-4 text-base font-medium text-white transition-colors hover:bg-white/10"
              >
                Services
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
