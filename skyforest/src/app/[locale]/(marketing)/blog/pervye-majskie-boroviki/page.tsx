import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { RelatedArticles } from "@/components/marketing/RelatedArticles";
import { BlogArticleHeader } from "@/components/marketing/BlogArticleHeader";

export const metadata: Metadata = {
  title: "The first May porcini: where and when to find the early cep",
  description:
    "The summer cep (Boletus reticulatus) is the earliest porcini. When it appears, which forests to search, what weather it needs and how to tell it from look-alikes. A guide for foragers.",
  keywords: [
    "May porcini",
    "first ceps",
    "porcini in May",
    "summer cep",
    "Boletus reticulatus",
    "early porcini",
    "when do porcini appear",
    "mushrooms in May",
    "where May porcini grow",
    "how to identify a cep",
    "May mushroom season",
  ],
  openGraph: {
    title: "The first May porcini: where and when to find the early cep",
    description:
      "The earliest porcini is the summer cep. When it appears, where to look, what weather it needs and how to tell it from look-alikes.",
    url: "https://www.skyforest.by/blog/pervye-majskie-boroviki",
    siteName: "SkyForest",
    type: "article",
    images: [
      {
        url: "https://www.skyforest.by/images/blog/blog-pervye-majskie-boroviki.jpg",
        width: 1536,
        height: 1024,
        alt: "May porcini growing in a bright spring oak grove in the sunlight",
      },
    ],
    publishedTime: "2026-06-15T00:00:00+03:00",
    modifiedTime: "2026-06-15T00:00:00+03:00",
    authors: ["SkyForest"],
    section: "Mushrooms",
  },
  alternates: {
    canonical: "https://www.skyforest.by/blog/pervye-majskie-boroviki",
  },
};

const FAQ_ITEMS = [
  {
    q: "In which month do the first ceps appear?",
    a: "The earliest porcini — the summer cep (also known as the oak cep, Boletus reticulatus) — appears as early as mid to late May, and in warm southern regions sometimes in early May. It is the earliest of all the boletes. It fruits in waves right through to October.",
  },
  {
    q: "Where should I look for May porcini?",
    a: "In bright deciduous forests, above all in oak groves, but also near beech, hornbeam, lime and chestnut. The mushroom likes well-warmed forest edges, rides and clearings, hilly terrain and dryish alkaline soils. In deep shade and damp hollows it is almost absent in May.",
  },
  {
    q: "What weather do May porcini need?",
    a: "Warm and humid: the best pickings come a few days after prolonged rain or short thunderstorms, when the soil has warmed up and the air stays humid (morning mists). The cep needs warmth — steady daytime temperatures and warm soil. In drought, early ceps barely grow.",
  },
  {
    q: "How does the May cep differ from the ordinary porcini?",
    a: "It is a close relative of the common porcini. The main difference is the pronounced pale net covering almost the entire stem (on the ordinary porcini the net is only near the top). The cap is often more matte, brownish, and frequently cracks in dry weather. When cut, the flesh stays white and does not turn blue.",
  },
  {
    q: "Which dangerous mushrooms can the cep be confused with?",
    a: "The main look-alikes are the bitter bolete (Tylopilus felleus), whose tube layer turns pink and which has a very bitter taste, and the rarer devil's bolete with reddening flesh and reddish pores. A true cep has white flesh that does not turn blue and is not bitter. If in any doubt, it is better not to pick the mushroom.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline:
        "The first May porcini: where and when to find the early cep",
      description:
        "May porcini (the oak cep, Boletus reticulatus) is the earliest porcini. When it appears, where to look, what weather it needs and how to tell it from look-alikes.",
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
      inLanguage: "en",
      keywords:
        "May porcini, porcini in May, summer cep, oak cep, Boletus reticulatus",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.skyforest.by" },
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.skyforest.by/blog" },
        { "@type": "ListItem", position: 3, name: "The first May porcini" },
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
        <BlogArticleHeader title="The first May porcini: where and&nbsp;when to find the early cep" />

        <h1 className="mb-6 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          The first May porcini: where and&nbsp;when to find the early cep
        </h1>

        <p className="mb-8 text-sm text-white/40">
          Updated: June 15, 2026 · Reading time: 10 min
        </p>

        <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-2xl">
          <Image
            src="/images/blog/blog-pervye-majskie-boroviki.jpg"
            alt="Several sturdy May porcini growing on the ground in a bright spring oak grove, with sunlight breaking through the trees"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        {/* INTRO */}
        <p className="mb-5 text-lg leading-relaxed text-white/80">
          For most foragers the porcini is a symbol of autumn. But experienced
          cep hunters know a secret: the first porcini can be gathered as early
          as{" "}
          <strong className="text-white">May</strong>, when the forest has only
          just put on fresh foliage and the classic season is still months
          away. These early sturdy mushrooms are a species of their own, and
          hunting them has its own rules.
        </p>
        <p className="mb-8 text-lg leading-relaxed text-white/80">
          We are talking about the{" "}
          <strong className="text-white">
            summer cep
          </strong>{" "}
          (also known as the oak cep, <em>Boletus reticulatus</em>) — the
          earliest of all porcini. Let&rsquo;s look at when it appears, which
          forests to search, what weather triggers its growth and how not to
          confuse your find with inedible look-alikes.
        </p>

        {/* SECTION 1 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          What the May cep is
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          The May cep is the common name for the{" "}
          <strong className="text-white">summer cep</strong> (
          <em>Boletus reticulatus</em>, synonyms — the oak cep, the netted cep,{" "}
          <em>Boletus aestivalis</em>). It belongs to the same Boletus genus as
          the classic porcini (<em>Boletus edulis</em>) and is considered one of
          the finest in flavor. Its main feature is{" "}
          <strong className="text-white">the earliest fruiting period</strong>{" "}
          among all the boletes.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Its &ldquo;calling card&rdquo; helps you recognize it — a pronounced
          pale{" "}
          <strong className="text-white">net covering almost the entire
          stem</strong> (on the ordinary porcini it appears only near the top).
          The cap is brownish, more often matte and velvety, and in dry weather
          frequently becomes covered with fine cracks — like parched earth. The
          flesh is white, does not change color when cut, and has a pleasant
          nutty smell.
        </p>

        {/* SECTION 2 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          When they appear: timing and signals
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          The summer cep starts{" "}
          <strong className="text-white">in mid to late May</strong>, and in
          warm southern regions it is found as early as the beginning of the
          month. It is the earliest porcini — it beats the classic
          summer-autumn flushes by several weeks. Over the season, which lasts
          until October, several &ldquo;waves&rdquo; (generations) manage to
          succeed one another in the same spot.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          The main signal is steady warmth. The cep needs warmed soil and warm
          nights. As soon as the May days are consistently warm and recent rain
          has soaked the ground with moisture — it&rsquo;s time to plan a first
          outing. Remember the rule of early ceps: <strong className="text-white">warmth +
          moisture after rain</strong>, not just one of the two on its own.
        </p>

        {/* SECTION 3 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Where to look for May porcini
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          The summer cep forms mycorrhiza mainly with trees of the beech
          family, so you should look for it in{" "}
          <strong className="text-white">bright deciduous forests</strong>:
        </p>
        <ul className="mb-5 list-inside space-y-2 text-white/80">
          <li className="leading-relaxed">
            <strong className="text-white">Oak groves</strong> — the main
            address. It&rsquo;s no accident the mushroom is called the oak cep.
          </li>
          <li className="leading-relaxed">
            Forests with <strong className="text-white">beech, hornbeam, lime</strong>,
            and in the south — near the <strong className="text-white">edible
            chestnut</strong>.
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Edges, rides, clearings</strong> —
            areas well warmed by the sun, not the deep thicket.
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Hilly terrain</strong> and
            dryish, rather alkaline soils.
          </li>
        </ul>
        <p className="mb-5 leading-relaxed text-white/80">
          The logic is simple: in May the soil in deep shade and hollows is
          still cold and damp. But the open, sun-warmed edges of the forest —
          where the ground is already warm — become the first points of growth.
          The species is widely distributed: from Belarus and central Russia to
          Crimea, the Caucasus and the Krasnodar region, across all of temperate
          Eurasia.
        </p>

        {/* SECTION 4 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          What weather triggers growth
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          The ideal scenario for the May cep is{" "}
          <strong className="text-white">prolonged warm rain</strong>, after
          which humid weather with morning mists sets in. Short thunderstorms
          followed by &ldquo;greenhouse&rdquo; humidity work well too. You
          shouldn&rsquo;t set out into the forest on the day of the rain, but a
          few days later — when the mycelium has received the signal and had
          time to form fruiting bodies.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          In drought, looking for early ceps is almost pointless: without
          moisture the mycelium does not start to grow, and the mushrooms that
          have already grown quickly wilt and crack. That is exactly why early
          foraging is largely{" "}
          <strong className="text-white">a game with the weather</strong>: you
          have to catch the window of warmth and moisture.
        </p>
        <div className="my-8 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <p className="text-sm leading-relaxed text-white/70">
            <strong className="text-white">SkyForest tip:</strong> mark your oak
            groves and edges on the map, and the service will track rainfall and
            temperature at those points — and let you know when, after the May
            rains, ideal conditions form for the first ceps. Read more about
            weather conditions in the article{" "}
            <Link
              href="/blog/pogoda-dlya-gribov"
              className="text-emerald-400 underline decoration-emerald-400/30 hover:text-emerald-300"
            >
              &ldquo;Weather for mushrooms&rdquo;
            </Link>
            .
          </p>
        </div>

        {/* SECTION 5 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          How to tell it from look-alikes
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          The good news: the cep has no deadly poisonous look-alikes. But there
          are inedible and bitter species that can ruin a whole dish. Check
          three features:
        </p>
        <div className="my-8 overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 font-semibold text-white">Feature</th>
                <th className="px-4 py-3 font-semibold text-white">
                  Summer cep
                </th>
                <th className="px-4 py-3 font-semibold text-white">
                  Bitter bolete
                </th>
              </tr>
            </thead>
            <tbody className="text-white/70">
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 text-white/90">Tube layer</td>
                <td className="px-4 py-3 text-emerald-400">White, then yellowish</td>
                <td className="px-4 py-3">Turns pink</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 text-white/90">Net on the stem</td>
                <td className="px-4 py-3 text-emerald-400">Pale, over the whole stem</td>
                <td className="px-4 py-3">Dark, coarse</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 text-white/90">Flesh when cut</td>
                <td className="px-4 py-3 text-emerald-400">White, unchanging</td>
                <td className="px-4 py-3">Turns slightly pink</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-white/90">Taste</td>
                <td className="px-4 py-3 text-emerald-400">Pleasant, nutty</td>
                <td className="px-4 py-3">Very bitter</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mb-5 leading-relaxed text-white/80">
          Less common is the devil&rsquo;s bolete — it has reddish pores and
          flesh that reddens or turns blue. A true cep keeps its flesh white. If
          you are unsure about a find, photograph it and check it with the{" "}
          <Link
            href="/blog/kak-opredelit-grib"
            className="text-emerald-400 underline decoration-emerald-400/30 hover:text-emerald-300"
          >
            mushroom identifier
          </Link>{" "}
          — but always make the final decision based on the combination of
          features.
        </p>

        {/* SECTION 6 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Tips for early foraging
        </h2>
        <ul className="mb-5 list-inside space-y-2 text-white/80">
          <li className="leading-relaxed">
            Walk along <strong className="text-white">warmed edges and
            rides</strong>, not deep into the damp forest.
          </li>
          <li className="leading-relaxed">
            The cep loves consistency:{" "}
            <strong className="text-white">remember your good spots</strong> —
            it returns to them year after year.
          </li>
          <li className="leading-relaxed">
            Cut the mushroom or gently twist it out without damaging the
            mycelium.
          </li>
          <li className="leading-relaxed">
            Early ceps are more prone to worms in the warmth —{" "}
            <strong className="text-white">check the cut</strong> right away.
          </li>
          <li className="leading-relaxed">
            Catch the <strong className="text-white">window after rain</strong>:
            3&ndash;6 warm, humid days is the best time.
          </li>
        </ul>

        {/* Summary */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          In summary
        </h2>
        <p className="mb-8 leading-relaxed text-white/80">
          The May cep is a pleasant bonus for those who don&rsquo;t want to wait
          for autumn. Look for the summer cep from mid-May in bright oak groves
          and on warmed edges, after warm rain. It&rsquo;s easy to identify by
          the net over the whole stem and the white flesh that neither turns
          blue nor bitter. And to avoid missing the perfect weather window, let
          SkyForest watch the rainfall and temperature for you — and head into
          the forest when your chances of a basket of the first porcini are at
          their highest.
        </p>

        {/* FAQ */}
        <h2 className="mb-6 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Frequently asked questions
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
            Don&rsquo;t miss the first wave of porcini
          </h2>
          <p className="mb-6 text-white/70">
            SkyForest analyzes the weather at your mushroom spots and suggests
            the best day to go foraging. Registration is free.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-primary-dark hover:shadow-xl"
          >
            Try SkyForest
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </article>
    </>
  );
}
