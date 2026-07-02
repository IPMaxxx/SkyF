import { Link } from "@/i18n/navigation";
import Image from "next/image";

const ALL_ARTICLES = [
  {
    href: "/blog/kak-opredelit-grib",
    title: "How to identify a mushroom from a photo: apps, neural networks and key features",
    description:
      "How accurate identifiers are, what to photograph and which features to check. Plus the SkyForest identifier on Telegram.",
    image: "/images/blog/blog-kak-opredelit-grib.jpg",
    readTime: "11 min",
  },
  {
    href: "/blog/pervye-majskie-boroviki",
    title: "The first May porcini: where and when to find the early cep",
    description:
      "The summer cep is the earliest porcini. Timing, locations, weather and how to tell it from look-alikes.",
    image: "/images/blog/blog-pervye-majskie-boroviki.jpg",
    readTime: "10 min",
  },
  {
    href: "/blog/pogoda-dlya-gribov",
    title: "Weather for mushrooms: at what temperature and humidity mushrooms grow",
    description:
      "Which weather conditions are ideal for mushroom growth. Temperature, humidity and rainfall — what matters most.",
    image: "/images/blog/blog-pogoda-dlya-gribov.jpg",
    readTime: "12 min",
  },
  {
    href: "/blog/griby-posle-dozhdya",
    title: "How many days after rain do mushrooms appear",
    description:
      "The best windows after rainfall for different species. Ceps, chanterelles and honey mushrooms each have their own timing.",
    image: "/images/blog/blog-griby-posle-dozhdya.jpg",
    readTime: "8 min",
  },
  {
    href: "/blog/kogda-pora-v-les",
    title: "When it's time to head to the forest: 7 signs the mushrooms are up",
    description:
      "Practical signs that the season has started. Soil temperature, first finds and other clues.",
    image: "/images/blog/blog-kogda-pora-v-les.jpg",
    readTime: "6 min",
  },
  {
    href: "/blog/v-kakom-lesu-iskat-griby",
    title: "Which forest to search for mushrooms: coniferous, deciduous or mixed",
    description:
      "Which mushrooms grow where: ceps in pine forests, birch boletes near birches. A guide to forest types.",
    image: "/images/blog/blog-v-kakom-lesu-iskat-griby.jpg",
    readTime: "10 min",
  },
  {
    href: "/blog/gde-rastut-griby",
    title: "Where mushrooms grow in Russia and Belarus",
    description:
      "Regions, forests and specific spots for mushroom foraging. A map of mushroom locations and planning tips.",
    image: "/images/blog/blog-gde-rastut-griby.jpg",
    readTime: "12 min",
  },
];

export function RelatedArticles({ currentSlug }: { currentSlug: string }) {
  const articles = ALL_ARTICLES.filter(
    (a) => a.href !== `/blog/${currentSlug}`
  );

  return (
    <section className="mt-14">
      <h2 className="mb-6 text-2xl font-bold text-white">Read also</h2>
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
