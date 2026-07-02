import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { RelatedArticles } from "@/components/marketing/RelatedArticles";
import { BlogArticleHeader } from "@/components/marketing/BlogArticleHeader";

export const metadata: Metadata = {
  title: "When It's Time to Head to the Forest: 7 Signs the Mushrooms Are Out",
  description:
    "How do you know when it's time to go mushroom picking? 7 proven signs that the mushroom season has begun. A month-by-month mushroom calendar, scientific data, and tips from experienced foragers.",
  keywords: [
    "when to go mushroom picking",
    "when to pick mushrooms",
    "mushroom season",
    "when it's time to head to the forest for mushrooms",
    "signs the mushrooms are out",
    "mushroom season 2025",
    "when does mushroom season start",
    "mushroom foraging",
    "mushroom season by month",
  ],
  openGraph: {
    title: "When It's Time to Head to the Forest: 7 Signs the Mushrooms Are Out",
    description:
      "How do you know when it's time to go mushroom picking? 7 proven signs that the mushroom season has begun. A month-by-month mushroom calendar, scientific data, and tips from experienced foragers.",
    url: "https://www.skyforest.by/blog/kogda-pora-v-les",
    siteName: "SkyForest",
    type: "article",
    images: [{ url: "https://www.skyforest.by/images/blog/blog-kogda-pora-v-les.jpg", width: 1792, height: 1024, alt: "Orange-cap boletes in an autumn forest in the morning with mist and dew" }],
    publishedTime: "2025-09-10T00:00:00+03:00",
    modifiedTime: "2025-09-10T00:00:00+03:00",
    authors: ["SkyForest"],
    section: "Mushrooms",
  },
  alternates: { canonical: "https://www.skyforest.by/blog/kogda-pora-v-les" },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline: "When It's Time to Head to the Forest: 7 Signs the Mushrooms Are Out",
      description:
        "How do you know when it's time to go mushroom picking? 7 proven signs that the mushroom season has begun. A month-by-month mushroom calendar, scientific data, and tips from experienced foragers.",
      author: { "@type": "Organization", name: "SkyForest", url: "https://www.skyforest.by" },
      publisher: {
        "@type": "Organization",
        name: "SkyForest",
        url: "https://www.skyforest.by",
        logo: { "@type": "ImageObject", url: "https://www.skyforest.by/images/logo-square.png" },
      },
      datePublished: "2025-09-10",
      dateModified: "2025-09-10",
      mainEntityOfPage: "https://www.skyforest.by/blog/kogda-pora-v-les",
      image: {
        "@type": "ImageObject",
        url: "https://www.skyforest.by/images/blog/blog-kogda-pora-v-les.jpg",
        width: 1792,
        height: 1024,
      },
      inLanguage: "en",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.skyforest.by" },
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.skyforest.by/blog" },
        { "@type": "ListItem", position: 3, name: "When It's Time to Head to the Forest" },
      ],
    },
  ],
};

const CALENDAR = [
  {
    month: "May",
    mushrooms: "Morels, false morels, early slippery jacks",
    conditions: "Soil warms to +10 °C, first warm rains",
  },
  {
    month: "June",
    mushrooms: "Birch boletes, slippery jacks, chanterelles (late in the month)",
    conditions: "Steady warmth of +15–20 °C, plentiful rain",
  },
  {
    month: "July",
    mushrooms: "Porcini, orange-cap boletes, chanterelles, slippery jacks",
    conditions: "Warm downpours, high humidity, frost-free nights",
  },
  {
    month: "August",
    mushrooms: "Porcini, birch boletes, orange-cap boletes, saffron milk caps, milk caps",
    conditions: "Peak of the season: warm rains + mist, temperatures of 15–22 °C",
  },
  {
    month: "September",
    mushrooms: "Honey fungus, saffron milk caps, milk caps, porcini (second wave)",
    conditions: "Temperatures drop to 10–15 °C, morning dew and mist",
  },
  {
    month: "October",
    mushrooms: "Autumn honey fungus, tricholoma, man on horseback, oyster mushrooms",
    conditions: "Cool (+5–12 °C), frequent rain, first frosts",
  },
  {
    month: "November",
    mushrooms: "Oyster mushrooms, winter enoki, wood blewit",
    conditions: "Cold, but without lasting snow; mushrooms until the first hard frosts",
  },
];

const FAQ = [
  {
    q: "How many days after rain do mushrooms appear?",
    a: "Most species appear 5–10 days after a heavy, warm rain. Slippery jacks and russulas react the fastest — they need just 3–5 days. Porcini and orange-cap boletes are more leisurely: they usually take 7–12 days. It's important that heat above +28 °C doesn't set in after the rain — otherwise the moisture evaporates quickly and the mycelium doesn't have time to form fruiting bodies.",
  },
  {
    q: "Can you pick mushrooms after frost?",
    a: "A light frost (down to −2 °C) doesn't kill the mycelium — it sits in the soil, protected by a layer of leaf litter. Fruiting bodies that have already grown may look fine, but they quickly turn mushy once they thaw. Honey fungus and oyster mushrooms tolerate frost better than most and keep growing at +3–5 °C. Porcini, birch boletes, and slippery jacks, on the other hand, don't like frost — their season usually ends with the first lasting subzero temperatures.",
  },
  {
    q: "When does mushroom season start in Belarus?",
    a: "The first mushrooms (morels and false morels) appear as early as late April to early May. The main season for the prized \"noble\" mushrooms kicks off in late June to early July with the first birch boletes and slippery jacks. The peak of foraging falls in August and September: during this time you can find practically every species in the forest. The season continues until the end of October, and oyster mushrooms and winter enoki are picked right up until the hard frosts of November.",
  },
  {
    q: "What temperature is best for mushroom growth?",
    a: "The optimal range for most edible mushrooms is +10 to +20 °C. What matters is not only the air temperature but also the soil temperature at a depth of 5–10 cm: it should be above +8 °C. That's exactly why mushrooms grow more slowly after a cold night, even if the day is warm. Mycologists note that porcini grow most actively at an average daily temperature of +14–17 °C combined with high soil moisture.",
  },
  {
    q: "How does SkyForest help you find the best time to pick mushrooms?",
    a: "SkyForest remembers the weather from the 14 days leading up to your successful mushroom trip and builds a \"weather fingerprint.\" Then the service compares the current conditions with this benchmark every day and gives you a match percentage. When the percentage climbs above 80%, it means the weather right now is the same as it was before your best day. This is the most reliable way not to miss a mushroom flush, because it's based on your personal experience rather than general forecasts.",
  },
];


export default function KogdaPoraVLesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <article className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        {/* Back link */}
        <BlogArticleHeader title="When It's Time to Head to the Forest: 7&nbsp;Signs the Mushrooms Are Out" />

        {/* Title */}
        <h1 className="mb-6 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
          When It’s Time to Head to the Forest: 7&nbsp;Signs the Mushrooms Are Out
        </h1>

        <p className="mb-8 text-sm text-white/50">
          September 10, 2025 · 6 min read
        </p>

        <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-2xl">
          <Image
            src="/images/blog/blog-kogda-pora-v-les.jpg"
            alt="Orange-cap boletes in an autumn forest in the early morning — mist, dew on a spider web, golden light"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        {/* ── Intro ── */}
        <section className="space-y-5">
          <p className="text-lg leading-relaxed text-white/80">
            Every forager knows the feeling: summer is past its midpoint, a good
            rain has come and gone, and one question is already spinning in your
            head —{" "}
            <strong className="text-white">is it time to head to the forest?</strong> Is it too
            early to go? Have I missed it? Mushroom foraging is a subtle art. Show up a week
            too early and you’ll come home with an empty basket and disappointment. Be three days
            late and instead of firm porcini you’ll find nothing but worm-eaten caps.
          </p>

          <p className="leading-relaxed text-white/80">
            Over twenty years of mushroom trips I’ve learned to read nature like an
            open book. The weather, the smells in the forest, the first finds along
            the edge of the woods — it all comes together into a clear picture. Sometimes
            it’s enough to glance out the window in the morning and see mist over the
            field to know: today is a day to drop everything and grab a basket.
          </p>

          <p className="leading-relaxed text-white/80">
            In this article you’ll find seven proven signs that tell you the
            mushroom season has begun and it’s the perfect time to head out foraging.
            Each sign is backed by scientific data and many years of experience.
            Together they form a reliable system that rarely leads you astray.
          </p>
        </section>

        {/* ── Sign 1 ── */}
        <section className="mt-14 space-y-5">
          <h2 className="text-2xl font-bold text-white">
            Sign 1: Warm rains fell 5–10 days ago
          </h2>

          <p className="leading-relaxed text-white/80">
            Rain is the main trigger for the mycelium. But not just any rain — it has to be
            warm, heavy, and prolonged. A brief downpour during a heat wave only soaks
            the top layer of soil, while the mycelium needs deep, lasting
            moisture. The ideal scenario is two or three days of drizzle at an
            air temperature of +15–20&nbsp;°C.
          </p>

          <p className="leading-relaxed text-white/80">
            Mycologists at the Komarov Botanical Institute have established that the mycelium
            needs 5 to 12 days after significant soil moisture to
            form fruiting bodies. The exact timing depends on the species: slippery jacks
            and russulas are the “sprinters” and need just 3–5 days. Birch and porcini
            mushrooms put on mass more slowly and appear after 7–12 days. If
            heat above +28&nbsp;°C sets in after the rain, moisture evaporates
            quickly and the window narrows.
          </p>

          <p className="leading-relaxed text-white/80">
            A practical rule: note the date of a good rain and count out a
            week. If there was no scorching heat or overnight frost during that week,
            you can safely head out on the eighth or ninth day. Experienced foragers keep
            a rainfall journal — it’s one of the most useful habits for
            foraging.
          </p>
        </section>

        {/* ── Sign 2 ── */}
        <section className="mt-14 space-y-5">
          <h2 className="text-2xl font-bold text-white">
            Sign 2: Temperatures hold steady at 10–20&nbsp;°C
          </h2>

          <p className="leading-relaxed text-white/80">
            The mycelium is a living organism, and it has its own “comfort zone.”
            A study published in Mycological Progress (2018)
            showed that the optimal temperature for most edible
            macrofungi of the temperate zone is +12–18&nbsp;°C.
            The soil temperature at a depth of 5–10&nbsp;cm should be no
            lower than +8&nbsp;°C.
          </p>

          <p className="leading-relaxed text-white/80">
            Overnight frosts are the forager’s enemy at the start and end of the season. If the
            temperature drops below zero at night, the mycelium slows its growth, and
            fruiting bodies that have already emerged may die. But a light morning
            frost in October is not a death sentence: the mycelium in the soil is protected by a layer
            of fallen leaves, and when the warmth returns the mushrooms keep growing.
            Honey fungus and oyster mushrooms, for example, do just fine at +3–8&nbsp;°C.
          </p>

          <p className="leading-relaxed text-white/80">
            In practice, the best mushroom days fall on periods when
            the average daily temperature stays around +14–17&nbsp;°C: warm enough
            for active growth, but not so hot that the soil
            dries out. In central Russia and Belarus, such conditions usually
            develop in late July, August, and the first half of September.
          </p>
        </section>

        {/* ── Sign 3 ── */}
        <section className="mt-14 space-y-5">
          <h2 className="text-2xl font-bold text-white">
            Sign 3: High air humidity and morning mist
          </h2>

          <p className="leading-relaxed text-white/80">
            The old saying “mist in the forest means mushrooms are coming” has a scientific
            basis. According to the Belarusian ecologist V.&nbsp;V.&nbsp;Shaporov,
            air humidity above 80% in the surface layer over several
            days is one of the most reliable predictors of a mass appearance of
            fruiting bodies. Mist is the visible expression of that humidity.
          </p>

          <p className="leading-relaxed text-white/80">
            Mushrooms are 85–95% water, and to form a fruiting body
            the mycelium needs a constant supply of moisture not only from the soil but also from
            the air. When thick mist lies over the forest in the morning, evaporation from
            the soil surface is minimal, and the mycelium gets ideal conditions.
            That’s why the best mushroom spots are often located in hollows, by
            streams, and in ravines — places where mist lingers the longest.
          </p>

          <p className="leading-relaxed text-white/80">
            If you see mist or heavy dew on the grass three mornings in a row —
            that’s a strong signal. Check the forecast: humidity above 85% at
            a temperature of +12–18&nbsp;°C is almost a guarantee that the mushrooms are out.
          </p>
        </section>

        {/* ── Sign 4 ── */}
        <section className="mt-14 space-y-5">
          <h2 className="text-2xl font-bold text-white">
            Sign 4: Foragers on social media start showing off
          </h2>

          <p className="leading-relaxed text-white/80">
            It sounds unserious, but it’s one of the fastest and most reliable
            indicators. Mushroom chats on Telegram, groups on VKontakte, foragers’
            forums — as soon as photos of
            full baskets start appearing in them, it means the mushroom flush has begun. The first reports
            usually come from the most active and experienced foragers, who
            “scout” the forest before everyone else.
          </p>

          <p className="leading-relaxed text-white/80">
            But be careful: photos from one region don’t mean the
            mushrooms are out everywhere. Summer storms move in bands — one area may be
            drenched with rain while the next is passed over. Rely on reports
            from your own region or from places with similar conditions. Pay
            attention to the type of forest: if people are showing off porcini from a pine
            grove but your forest is a birch stand, your mushrooms may appear a couple of days
            later.
          </p>

          <p className="leading-relaxed text-white/80">
            A good approach is to follow 3–4 forager groups from your
            region and keep an eye on them from mid-June. The first photos
            of birch boletes and slippery jacks are a signal that the “noble”
            species will follow within a week.
          </p>
        </section>

        {/* ── Sign 5 ── */}
        <section className="mt-14 space-y-5">
          <h2 className="text-2xl font-bold text-white">
            Sign 5: The first “scouts” appear — russulas and slippery jacks
          </h2>

          <p className="leading-relaxed text-white/80">
            In mycology there’s a concept of “indicator species” — mushrooms that
            appear first and signal the start of a flush. Russulas, slippery jacks,
            and roll-rims are classic scouts. Their mycelium reacts to moisture
            and warmth faster than the mycelium of porcini or orange-cap boletes.
          </p>

          <p className="leading-relaxed text-white/80">
            If you step into the forest and see a scattering of young slippery jacks along the edge or
            bright russulas along the path — that’s a sure sign. Birch boletes usually appear 3–5 days
            after the slippery jacks, and a couple of days after that the
            porcini. Chanterelles occupy an intermediate position: they can appear
            almost at the same time as the slippery jacks, especially in mixed forests dominated by
            birch and spruce.
          </p>

          <p className="leading-relaxed text-white/80">
            This sign works especially well if you have a trusted
            mushroom spot near home. Pop in for half an hour and walk along
            the forest edge. See the scouts — plan a full trip for the
            weekend. Don’t even see russulas — then it’s early, the soil hasn’t
            warmed up yet, or there isn’t enough moisture.
          </p>
        </section>

        {/* ── Sign 6 ── */}
        <section className="mt-14 space-y-5">
          <h2 className="text-2xl font-bold text-white">
            Sign 6: The forest smells of mushrooms and decaying leaves
          </h2>

          <p className="leading-relaxed text-white/80">
            An experienced forager smells mushrooms before seeing them.
            The characteristic scent — a mix of damp earth, decaying leaves, and a faint
            mushroom aroma — appears when the mycelium in the leaf litter is actively
            breaking down organic matter and forming fruiting bodies. This isn’t mysticism
            but biochemistry: the mycelium releases volatile organic compounds
            (1-octen-3-ol and others) that we perceive as the “mushroom smell.”
          </p>

          <p className="leading-relaxed text-white/80">
            If you walk into the forest and breathe in that very aroma — heavy, earthy,
            with notes of dampness and decay — it means the mycelium is already at work
            beneath your feet. The fruiting bodies have either already broken through somewhere under the moss or
            will appear in the coming days. This smell is especially noticeable early in the morning,
            when the air is damp and cool.
          </p>

          <p className="leading-relaxed text-white/80">
            Seasoned foragers advise: step into the forest, crouch down, and listen
            to the smells. If it smells only of pine needles and dry earth — it’s early. But if
            a thick “mushroom spirit” hangs in the air, like a market in season — grab a
            basket and don’t waste any time.
          </p>
        </section>

        {/* ── Sign 7 ── */}
        <section className="mt-14 space-y-5">
          <h2 className="text-2xl font-bold text-white">
            Sign 7: The weather pattern repeats your best day
          </h2>

          <p className="leading-relaxed text-white/80">
            This is perhaps the most accurate of all the signs — and the hardest to
            track by hand. Every forager has “that one day”: when the
            basket filled up in an hour, the porcini stood in rows, and the orange-cap boletes
            reddened under every aspen. The question is what the weather was like a
            week or two before that day.
          </p>

          <p className="leading-relaxed text-white/80">
            Mushrooms are the result of the weather conditions not of a single day but of a whole
            two-week cycle. The amount of rainfall, temperature swings,
            humidity, wind — all these factors form the “weather fingerprint”
            that led to the harvest. If the current weather starts to resemble
            that pattern, the chance of repeating the result is very high.
          </p>

          <p className="leading-relaxed text-white/80">
            That’s exactly what SkyForest was built for. You save the date of your best
            mushroom day — the system remembers the weather from the 14 days before it. Then it
            compares the current conditions with that benchmark every day. When the match is
            above 80% — it’s time to head to the forest.
          </p>

          <p className="leading-relaxed text-white/80">
            It works because the mycelium in a specific spot reacts to
            the same weather patterns year after year. Your personal experience,
            backed by data, becomes the most accurate predictor there is.
            There’s no need to guess by old folk sayings — it’s enough to compare the numbers.
          </p>
        </section>

        {/* ── Mushroom calendar ── */}
        <section className="mt-14 space-y-5">
          <h2 className="text-2xl font-bold text-white">
            Month-by-month mushroom calendar
          </h2>

          <p className="leading-relaxed text-white/80">
            The mushroom season in central Russia and Belarus runs from May to
            November. Of course, the exact timing shifts depending on the
            region and the specific year, but the overall picture stays stable.
            Here is an approximate mushroom season by month:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="py-3 pr-4 text-left font-semibold text-white">
                    Month
                  </th>
                  <th className="py-3 pr-4 text-left font-semibold text-white">
                    Main species
                  </th>
                  <th className="py-3 text-left font-semibold text-white">
                    Conditions
                  </th>
                </tr>
              </thead>
              <tbody>
                {CALENDAR.map((row) => (
                  <tr
                    key={row.month}
                    className="border-b border-white/10"
                  >
                    <td className="py-3 pr-4 font-medium text-white">
                      {row.month}
                    </td>
                    <td className="py-3 pr-4 text-white/70">
                      {row.mushrooms}
                    </td>
                    <td className="py-3 text-white/70">{row.conditions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="leading-relaxed text-white/80">
            Remember: the calendar is a guide, not a schedule. Every year is
            unique. The spring of 2024 was late, and porcini around Moscow came out
            only by mid-July. But in 2023 the first porcini were found as early as the end of
            June. That’s exactly why observing the actual weather conditions
            matters more than any calendar.
          </p>
        </section>

        {/* ── FAQ ── */}
        <section className="mt-14 space-y-5">
          <h2 className="text-2xl font-bold text-white">
            Frequently asked questions
          </h2>

          <div className="space-y-8">
            {FAQ.map((item, i) => (
              <div key={i}>
                <h3 className="mb-2 text-lg font-bold text-white">
                  {item.q}
                </h3>
                <p className="leading-relaxed text-white/80">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Conclusion ── */}
        <section className="mt-14 space-y-5">
          <h2 className="text-2xl font-bold text-white">In summary</h2>

          <p className="leading-relaxed text-white/80">
            The seven signs aren’t a guarantee but a system of reference points. The more
            of them line up at once, the higher the chance that the forest will
            reward you. A warm rain a week ago, misty mornings, steady
            +15&nbsp;°C, scout slippery jacks along the forest edge, and a mushroom aroma in
            the air — if all of that comes together, drop everything and go.
          </p>

          <p className="leading-relaxed text-white/80">
            And if you’d like to take the guesswork out of the equation — give SkyForest a try.
            Record your best mushroom day, turn on monitoring, and the service
            will tell you when the conditions repeat. Foraging becomes even more
            rewarding when an algorithm does the counting for you.
          </p>
        </section>

        {/* ── CTA ── */}
        <div className="mt-14 rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl sm:p-12">
          <h2 className="mb-3 text-2xl font-bold text-white">
            Don’t miss your mushroom day
          </h2>
          <p className="mb-6 text-white/70">
            SkyForest compares the current weather with your best mushroom day
            and tells you when it’s time to head to the forest. Signing up is free.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 hover:shadow-xl"
          >
            Try it for free →
          </Link>
        </div>

        <RelatedArticles currentSlug="kogda-pora-v-les" />
      </article>
    </>
  );
}
