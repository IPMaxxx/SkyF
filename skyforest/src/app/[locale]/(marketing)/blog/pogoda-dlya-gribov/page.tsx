import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { RelatedArticles } from "@/components/marketing/RelatedArticles";
import { BlogArticleHeader } from "@/components/marketing/BlogArticleHeader";

export const metadata: Metadata = {
  title: "Weather for mushrooms: at what temperature and humidity do mushrooms grow",
  description:
    "Find out what weather mushrooms need to grow. Optimal temperature, humidity, and rainfall for porcini, honey mushrooms, and chanterelles. Scientific data and tips from experienced foragers.",
  keywords: [
    "weather for mushrooms",
    "what temperature do mushrooms grow at",
    "humidity for mushrooms",
    "mushroom growing conditions",
    "when do mushrooms grow",
    "optimal temperature for mushrooms",
    "mushroom weather",
    "weather for porcini",
    "weather for honey mushrooms",
    "weather for chanterelles",
    "mushroom foraging",
    "mushroom season",
    "mushrooms after rain",
  ],
  openGraph: {
    title: "Weather for mushrooms: at what temperature and humidity do mushrooms grow",
    description:
      "Find out what weather mushrooms need to grow. Optimal temperature, humidity, and rainfall for porcini, honey mushrooms, and chanterelles.",
    url: "https://www.skyforest.by/blog/pogoda-dlya-gribov",
    siteName: "SkyForest",
    type: "article",
    images: [{ url: "https://www.skyforest.by/images/blog/blog-pogoda-dlya-gribov.jpg", width: 1792, height: 1024, alt: "Weather for mushrooms — porcini in the forest after rain" }],
    publishedTime: "2025-09-01T00:00:00+03:00",
    modifiedTime: "2025-09-01T00:00:00+03:00",
    authors: ["SkyForest"],
    section: "Mushrooms",
  },
  alternates: { canonical: "https://www.skyforest.by/blog/pogoda-dlya-gribov" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline:
        "Weather for mushrooms: at what temperature and humidity do mushrooms grow",
      description:
        "Find out what weather mushrooms need to grow. Optimal temperature, humidity, and rainfall for porcini, honey mushrooms, and chanterelles. Scientific data and tips from experienced foragers.",
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
      inLanguage: "en",
      keywords:
        "weather for mushrooms, what temperature do mushrooms grow at, humidity for mushrooms, mushroom growing conditions",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.skyforest.by" },
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.skyforest.by/blog" },
        { "@type": "ListItem", position: 3, name: "Weather for mushrooms" },
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
        <BlogArticleHeader title="Weather for mushrooms: at&nbsp;what temperature and&nbsp;humidity do
          mushrooms grow" />

        {/* Title */}
        <h1 className="mb-6 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          Weather for mushrooms: at&nbsp;what temperature and&nbsp;humidity do
          mushrooms grow
        </h1>

        <p className="mb-8 text-sm text-white/40">
          Updated: September 1, 2025 · Reading time: 12 min
        </p>

        <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-2xl">
          <Image
            src="/images/blog/blog-pogoda-dlya-gribov.jpg"
            alt="Porcini growing in a mossy forest clearing after rain — sunbeams break through the clouds"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        {/* --- INTRO --- */}
        <p className="mb-5 text-lg leading-relaxed text-white/80">
          Every experienced forager knows: you can walk ten kilometers through the
          forest and come back with an empty basket, or you can drop by a familiar
          spruce grove for half an hour — and fill your basket to the brim. The
          difference isn&rsquo;t luck or secret spots. The difference is the&nbsp;
          <strong className="text-white">weather for mushrooms</strong>. It&rsquo;s
          the weather conditions that determine whether the mycelium wakes up,
          whether it begins forming fruiting bodies, and whether it has enough
          moisture to grow them to a size worth putting in the basket.
        </p>
        <p className="mb-5 text-lg leading-relaxed text-white/80">
          According to a paper published in the journal{" "}
          <em>Mycological Research</em>, the fruiting of basidiomycetes (to which
          most edible mushrooms belong) is triggered by a combination of three
          key factors: soil temperature, substrate moisture, and the swing
          between daytime and nighttime temperatures. None of these factors
          &ldquo;switches on&rdquo; a flush of mushrooms on its own — only their
          combination does.
        </p>
        <p className="mb-8 text-lg leading-relaxed text-white/80">
          In this article we&rsquo;ll break down{" "}
          <strong className="text-white">
            at what temperature mushrooms grow
          </strong>
          , what humidity different species need, how much rain has to fall, and
          exactly when to expect a mushroom flush. All the data is backed by
          scientific sources and proven in the field.
        </p>

        {/* --- SECTION 1: TEMPERATURE --- */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Air and soil temperature
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          When foragers say &ldquo;the mushrooms are up,&rdquo; there is very
          specific physics behind it: the soil temperature at a depth of 5–10 cm
          holds steadily within a certain range. As Professor L.G. Perevedentseva
          notes in her work &ldquo;Mycology: Fungi and Fungus-like Organisms,&rdquo;
          the mycelium of most forest mushrooms begins active growth at a soil
          temperature of +8°C, while the optimal temperature for forming fruiting
          bodies is +10 to +20°C.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          But each species has its own &ldquo;favorite&rdquo; range. The porcini
          (king bolete) prefers warm but not hot weather — +15…+20°C air
          temperature. Once the thermometer climbs above +25°C, the porcini
          &ldquo;goes dormant&rdquo;: the mycelium is too hot and dry. Chanterelles,
          on the contrary, start earlier and tolerate cool weather better — they
          are comfortable already at +10…+16°C. And autumn honey mushrooms actually
          love the cold: mass fruiting begins when nighttime temperatures drop to
          +5…+10°C.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          It&rsquo;s not only the absolute reading that matters, but also the{" "}
          <strong className="text-white">
            swing between daytime and nighttime temperature
          </strong>
          . According to research by mycologists at Moscow State University, a
          difference of 8–12 degrees between day and night is one of the most
          powerful triggers of fruiting. This explains why mushrooms appear en
          masse in late August and early September, when the days are still warm
          but the nights are already crisp with autumn.
        </p>

        {/* Temperature table */}
        <div className="my-8 overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 font-semibold text-white">Mushroom species</th>
                <th className="px-4 py-3 font-semibold text-white">
                  Optimal air t°
                </th>
                <th className="px-4 py-3 font-semibold text-white">
                  Min. soil t°
                </th>
                <th className="px-4 py-3 font-semibold text-white">Season</th>
              </tr>
            </thead>
            <tbody className="text-white/70">
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">Porcini (king bolete)</td>
                <td className="px-4 py-3">+15…+20°C</td>
                <td className="px-4 py-3">+10°C</td>
                <td className="px-4 py-3">July — September</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">Birch bolete</td>
                <td className="px-4 py-3">+14…+20°C</td>
                <td className="px-4 py-3">+9°C</td>
                <td className="px-4 py-3">June — October</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">Aspen bolete</td>
                <td className="px-4 py-3">+14…+22°C</td>
                <td className="px-4 py-3">+9°C</td>
                <td className="px-4 py-3">June — October</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">Chanterelles</td>
                <td className="px-4 py-3">+10…+16°C</td>
                <td className="px-4 py-3">+8°C</td>
                <td className="px-4 py-3">June — October</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">Slippery jacks</td>
                <td className="px-4 py-3">+12…+18°C</td>
                <td className="px-4 py-3">+8°C</td>
                <td className="px-4 py-3">June — October</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">Autumn honey mushrooms</td>
                <td className="px-4 py-3">+8…+14°C</td>
                <td className="px-4 py-3">+5°C</td>
                <td className="px-4 py-3">September — November</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">Milk caps</td>
                <td className="px-4 py-3">+10…+16°C</td>
                <td className="px-4 py-3">+8°C</td>
                <td className="px-4 py-3">July — October</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3">Saffron milk caps</td>
                <td className="px-4 py-3">+10…+18°C</td>
                <td className="px-4 py-3">+7°C</td>
                <td className="px-4 py-3">August — October</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Russulas</td>
                <td className="px-4 py-3">+12…+22°C</td>
                <td className="px-4 py-3">+8°C</td>
                <td className="px-4 py-3">June — October</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mb-8 text-sm leading-relaxed text-white/50">
          * Data compiled from materials of the Department of Mycology and Algology
          of the Faculty of Biology at Moscow State University and the reference
          guide &ldquo;Mushrooms of Belarus&rdquo; (Gapienko O.S., 2012).
        </p>

        {/* --- SECTION 2: HUMIDITY --- */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Humidity — the forager&rsquo;s main ally
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          If temperature is the &ldquo;switch&rdquo; for the mushroom season, then{" "}
          <strong className="text-white">humidity for mushrooms</strong> is the
          fuel. A mushroom&rsquo;s fruiting body is 85–95% water. Without enough
          moisture, the mycelium simply can&rsquo;t &ldquo;push&rdquo; a mushroom
          up to the surface, even if the temperature is perfect.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          The optimal relative air humidity for most edible mushrooms is{" "}
          <strong className="text-white">70–90%</strong>. At humidity below 60%,
          even mushrooms that have already started growing stop, dry out, and
          become wormy faster than usual. According to research published in the
          journal <em>Fungal Ecology</em>, a drop in substrate moisture below 40%
          completely blocks the formation of primordia (the beginnings of fruiting
          bodies).
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Soil moisture is no less important than air humidity. The ideal state is
          when the forest litter is moist to the touch, but water isn&rsquo;t
          pooling in puddles. Experienced foragers check it simply: they grab a
          handful of moss or needles and squeeze — if droplets appear between their
          fingers, there&rsquo;s enough moisture. If the litter crumbles like dust,
          it&rsquo;s pointless to expect mushrooms, even if it rained a week ago.
        </p>
        <p className="mb-8 leading-relaxed text-white/80">
          Dew and fog deserve a special mention.{" "}
          <strong className="text-white">Morning fog</strong> is a sure sign that
          humidity in the forest is at the right level. It&rsquo;s no wonder the
          old saying goes: &ldquo;Fog over the forest — mushrooms in place.&rdquo;
          Warm nights with heavy dew keep the moisture of the near-ground air
          layer up even during dry spells.
        </p>

        {/* --- SECTION 3: RAINFALL --- */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Rainfall: how much rain mushrooms need
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          A &ldquo;mushroom rain&rdquo; is more than a pretty phrase. The type of
          rainfall directly affects mushroom growing conditions. The ideal
          scenario is{" "}
          <strong className="text-white">
            warm, moderate rain, 10–20 mm per day, lasting 2–3 days
          </strong>
          , followed by 5–7 days of warm weather without extreme heat. It&rsquo;s
          exactly this pattern that triggers mass fruiting.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          A short downpour of 30–50 mm in an hour is almost useless for mushrooms.
          Such rain doesn&rsquo;t have time to soak in: the water runs off the
          surface into streams, and the topsoil layer, where the mycelium lives,
          stays dry within a day. Prolonged drizzling rains are far more useful —
          they soak the forest litter evenly and for a long time.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          The key rule:{" "}
          <strong className="text-white">
            the main flush of mushrooms appears 7–14 days after heavy rainfall
          </strong>
          . The mycelium needs this time to &ldquo;drink up&rdquo; the moisture,
          form primordia, and grow them to a noticeable size. The fastest to
          react are russulas and slippery jacks (5–7 days); the slowest to get
          going are porcini and milk caps (10–14 days).
        </p>
        <p className="mb-8 leading-relaxed text-white/80">
          As Professor L.G. Perevedentseva notes, for sustained fruiting the total
          rainfall over the preceding 2–3 weeks needs to reach at least 30–50 mm.
          If less than 20 mm fell during that period, you shouldn&rsquo;t count on a
          mass mushroom flush, though a few specimens may appear in hollows and
          along streams.
        </p>

        {/* --- SECTION 4: WIND & PRESSURE --- */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Wind and atmospheric pressure
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Temperature, humidity, and rainfall are the three pillars of mushroom
          weather. But there are also secondary factors that experienced foragers
          take into account. Strong wind (more than 7–8 m/s) dries out the topsoil
          and the forest litter, lowering the humidity in the mycelium zone. After
          several windy days, even a well-moistened forest can &ldquo;dry out&rdquo;
          enough that mushrooms stop growing.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Atmospheric pressure is a debatable factor, but many foragers swear that
          mushrooms grow better at{" "}
          <strong className="text-white">
            stable or slightly low pressure (740–755 mmHg)
          </strong>
          . There isn&rsquo;t much scientific proof of this, but there is an indirect
          link: low pressure is usually accompanied by cloud cover, high humidity,
          and rainfall — and those are already direct conditions for mushroom
          growth.
        </p>
        <p className="mb-8 leading-relaxed text-white/80">
          Sharp pressure swings (more than 5 mmHg per day) usually coincide with a
          change of weather fronts. When a warm front with rain is followed by a
          cold front with clearing skies, it often &ldquo;locks up&rdquo; mushroom
          growth for several days. That&rsquo;s why the ideal window for foraging is
          stable, warm weather a week or a week and a half after heavy rains,
          without sharp barometric fluctuations.
        </p>

        {/* --- SECTION 5: SPECIES-SPECIFIC --- */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Weather conditions for different mushroom species
        </h2>

        <h3 className="mb-3 mt-8 text-xl font-bold text-white">
          Porcini (king bolete)
        </h3>
        <p className="mb-5 leading-relaxed text-white/80">
          The king of foraging is demanding about the weather. The optimal{" "}
          <strong className="text-white">weather for porcini</strong> is an air
          temperature of +15…+20°C, humidity of 75–85%, and no strong wind. The
          porcini likes neither heat nor cold: at +25°C and above, growth slows;
          at +8°C and below, it stops. Porcini prefers well-warmed soil, so the
          first &ldquo;flushes&rdquo; appear no earlier than mid-June, with the peak
          in August and early September. After a heavy, warm rain, expect porcini
          in 10–14 days. Look for them in pine forests with mossy litter, in
          spruce groves, and in mixed forests with birch.
        </p>

        <h3 className="mb-3 mt-8 text-xl font-bold text-white">Honey mushrooms</h3>
        <p className="mb-5 leading-relaxed text-white/80">
          <strong className="text-white">Weather for honey mushrooms</strong> is a
          story of its own. The autumn honey mushroom (Armillaria mellea) is one of
          the few mushrooms that needs cold to get started. Mass fruiting begins
          when the average daily temperature drops below +12…+14°C, with nights
          around +5…+8°C. The first frosts don&rsquo;t scare honey mushrooms — they
          keep growing even after brief sub-zero spells. Humidity is critical for
          them: if the woody substrate (stumps, trunks) dries out, growth quickly
          stops. But one good rain, and within 5–7 days whole &ldquo;families&rdquo;
          appear on familiar stumps.
        </p>

        <h3 className="mb-3 mt-8 text-xl font-bold text-white">Chanterelles</h3>
        <p className="mb-5 leading-relaxed text-white/80">
          <strong className="text-white">Weather for chanterelles</strong> is the
          most &ldquo;easygoing.&rdquo; Chanterelles start growing earlier than many
          other mushrooms (already in June) and finish later (through October). The
          optimal temperature is +10…+16°C, but they tolerate warmer weather too if
          humidity is sufficient. The chanterelle is almost never wormy thanks to
          its quinomannose content, so even during a dry spell you can find usable
          specimens. The main requirement is steady moisture in the forest litter.
          Chanterelles grow in waves: after each significant rain, a new
          &ldquo;flush&rdquo; appears within 5–10 days.
        </p>

        <h3 className="mb-3 mt-8 text-xl font-bold text-white">Slippery jacks</h3>
        <p className="mb-5 leading-relaxed text-white/80">
          Slippery jacks are among the mushrooms that respond fastest to rain. The
          optimal temperature is +12…+18°C. They are closely tied to pine and
          spruce, forming mycorrhiza with conifers. After a warm rain, slippery
          jacks can &ldquo;pop up&rdquo; in as little as 3–5 days. However, they are
          extremely sensitive to drying out: once the forest litter dries, slippery
          jacks disappear until the next rainfall. They also dislike intense heat —
          at +25°C and above they quickly become wormy.
        </p>

        <h3 className="mb-3 mt-8 text-xl font-bold text-white">Milk caps</h3>
        <p className="mb-8 leading-relaxed text-white/80">
          Milk caps are mushrooms of late summer and autumn. The optimal
          temperature is +10…+16°C. Milk caps are demanding about humidity: they
          need well-soaked soil and high air humidity (80–90%). A dry summer is the
          enemy of milk caps. But after prolonged September rains, birch groves and
          mixed forests can reward you with an abundant harvest. The white (true)
          milk cap is rarer and more finicky, while the black milk cap is more
          undemanding. The thickness of the leaf litter also matters for milk caps:
          they often hide under a layer of leaves, and without enough moisture they
          simply can&rsquo;t push their way up.
        </p>

        {/* --- SECTION 6: HOW TO TRACK --- */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          How to track the weather for mushrooms
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          So, we&rsquo;ve established that to determine{" "}
          <strong className="text-white">mushroom growing conditions</strong>, you
          need to track the air and soil temperature, humidity, the amount of
          rainfall over the last 2–3 weeks, wind, and barometric pressure all at
          once. Each species has its own ranges and timings. You can do this by
          hand, cross-checking forecasts against a rainfall calendar — but it&rsquo;s
          tedious.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          The{" "}
          <Link
            href="/"
            className="text-emerald-400 hover:text-emerald-300"
          >
            SkyForest
          </Link>{" "}
          service automatically analyzes all these parameters for your mushroom
          spots. You save the coordinates of your location and the date of your best
          harvest — the system remembers the weather pattern and checks every day
          whether the conditions are repeating. When all the indicators line up, you
          get a notification: it&rsquo;s time to head to the forest.
        </p>
        <p className="mb-8 leading-relaxed text-white/80">
          No more opening three forecast apps every morning, trying to remember when
          it last rained, and guessing whether the soil has warmed up. SkyForest
          does all of this for you — all you have to do is grab a basket and a knife.
        </p>

        {/* --- FAQ --- */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Frequently asked questions
        </h2>

        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <h3 className="mb-2 font-semibold text-white">
              At what temperature do mushrooms start to grow?
            </h3>
            <p className="leading-relaxed text-white/70">
              Most edible mushrooms start growing at a soil temperature of +8°C.
              The optimal air temperature for the main species is +10…+20°C. Honey
              mushrooms can grow at lower temperatures — from +5°C.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <h3 className="mb-2 font-semibold text-white">
              How many days after rain do mushrooms appear?
            </h3>
            <p className="leading-relaxed text-white/70">
              On average 7–14 days after a heavy, warm rain. The fastest to appear
              are russulas and slippery jacks (5–7 days); the slowest to get going
              are porcini and milk caps (10–14 days). Much depends on the
              temperature and prior soil moisture.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <h3 className="mb-2 font-semibold text-white">
              What humidity do mushrooms need to grow?
            </h3>
            <p className="leading-relaxed text-white/70">
              The optimal relative air humidity is 70–90%. The moisture of the soil
              and forest litter should be sufficient so that when you squeeze moss
              or needles, moisture appears between your fingers. At humidity below
              60%, fruiting slows down or stops.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <h3 className="mb-2 font-semibold text-white">
              Can mushrooms grow in the heat?
            </h3>
            <p className="leading-relaxed text-white/70">
              At temperatures above +25–28°C, the growth of most mushrooms slows or
              stops. In hot, dry weather the mycelium &ldquo;goes dormant.&rdquo;
              The exception is some species of russula, which tolerate higher
              temperatures given sufficient humidity. However, heat above +30°C is
              fatal to almost all forest mushrooms.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <h3 className="mb-2 font-semibold text-white">
              How can you tell that the conditions for mushrooms are right?
            </h3>
            <p className="leading-relaxed text-white/70">
              Pay attention to three factors: 1) over the last 1–2 weeks there have
              been moderate rains (30–50 mm in total); 2) the air temperature holds
              in the range of +10…+20°C; 3) in the mornings there is fog or heavy
              dew in the forest. If all three conditions line up, it&rsquo;s the
              perfect time to go foraging. Or leave the analysis to{" "}
              <Link
                href="/"
                className="text-emerald-400 hover:text-emerald-300"
              >
                SkyForest
              </Link>{" "}
              — the service checks it automatically.
            </p>
          </div>
        </div>

        {/* --- CTA --- */}
        <div className="my-16 rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center backdrop-blur-xl sm:px-10 sm:py-14">
          <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">
            Don&rsquo;t guess — know when to go mushroom hunting
          </h2>
          <p className="mb-8 leading-relaxed text-white/70">
            SkyForest analyzes temperature, humidity, rainfall, and pressure for
            your mushroom spots. Sign up — and get notified when the mushroom
            weather arrives.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 hover:shadow-xl"
          >
            Sign up for free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <RelatedArticles currentSlug="pogoda-dlya-gribov" />
      </article>
    </>
  );
}
