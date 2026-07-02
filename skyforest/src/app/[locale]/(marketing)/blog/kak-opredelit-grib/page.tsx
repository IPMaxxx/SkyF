import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Bot, ScanSearch } from "lucide-react";
import { RelatedArticles } from "@/components/marketing/RelatedArticles";
import { BRAND } from "@/lib/brand";
import { BlogArticleHeader } from "@/components/marketing/BlogArticleHeader";

const BOT_URL = BRAND.mushroomBotUrl || "https://t.me/skyforest_mushroom_bot";

export const metadata: Metadata = {
  title: "How to Identify a Mushroom from a Photo: Apps, Neural Networks and Key Features",
  description:
    "How to identify a mushroom from a photo without making mistakes: how apps and neural networks work, how accurate they are, what exactly to photograph and which features to check by hand. A guide for foragers.",
  keywords: [
    "how to identify a mushroom",
    "mushroom identification by photo",
    "mushroom identification app",
    "identify a mushroom from a photo",
    "neural network mushroom identification",
    "mushroom identifier",
    "how to tell what mushroom this is",
    "identify a mushroom by photo online",
    "is this mushroom edible",
    "dangerous mushroom lookalikes",
    "features of edible mushrooms",
    "telegram bot mushroom identification",
  ],
  openGraph: {
    title: "How to Identify a Mushroom from a Photo: Apps, Neural Networks and Key Features",
    description:
      "How to identify a mushroom from a photo without making mistakes: how accurate apps are, what to photograph and which features to check by hand.",
    url: "https://www.skyforest.by/blog/kak-opredelit-grib",
    siteName: "SkyForest",
    type: "article",
    images: [
      {
        url: "https://www.skyforest.by/images/blog/blog-kak-opredelit-grib.jpg",
        width: 1536,
        height: 1024,
        alt: "A forager identifying a mushroom from a photo in a smartphone app in the forest",
      },
    ],
    publishedTime: "2026-06-15T00:00:00+03:00",
    modifiedTime: "2026-06-15T00:00:00+03:00",
    authors: ["SkyForest"],
    section: "Mushrooms",
  },
  alternates: { canonical: "https://www.skyforest.by/blog/kak-opredelit-grib" },
};

const FAQ_ITEMS = [
  {
    q: "Can you accurately identify a mushroom from a photo?",
    a: "A photo is a helpful aid, but not a guarantee. Independent studies show that even the best apps identify a mushroom correctly only about half the time, and poisonous species even less often. That is why the result of a photo-based identification should always be double-checked against key features, and you should never eat an unfamiliar mushroom while relying on an app alone.",
  },
  {
    q: "How should you take a photo to make identification more accurate?",
    a: "Photograph the mushroom from several angles: the cap from above, the underside of the cap (gills or pores), the entire stem and, crucially, its base, as well as a cut through the flesh. Shoot in daylight, in focus, and place a ruler or coin next to it for scale. The more details are visible, the higher the chance of correct identification.",
  },
  {
    q: "Which mushroom features should you check by hand?",
    a: "The type of hymenophore (gills or pores), the presence of a ring on the stem and a volva (sac) at the base, the color of the flesh when cut and how it changes, the smell, the type of forest and the partner tree. Many deadly species (for example, the death cap) give themselves away precisely by the volva and ring, details that are not visible in a top-down photo.",
  },
  {
    q: "How does the SkyForest mushroom identifier in Telegram work?",
    a: "You send the bot a photo of a mushroom, and the neural network suggests the most likely species. The first 3 identifications are free. After that, each identification costs 1 token; tokens are purchased on the SkyForest website and transferred to the bot's balance in your account.",
  },
  {
    q: "Should you eat a mushroom if the app identified it as edible?",
    a: "No. No app and no neural network gives a hundred percent guarantee. There have been cases of poisoning after an incorrect identification. If you have even the slightest doubt, do not pick the mushroom. If you suspect poisoning, seek medical help immediately.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline:
        "How to Identify a Mushroom from a Photo: Apps, Neural Networks and Key Features",
      description:
        "How to identify a mushroom from a photo without making mistakes: how apps and neural networks work, how accurate they are, what exactly to photograph and which features to check by hand.",
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
      inLanguage: "en",
      keywords:
        "how to identify a mushroom, mushroom identification by photo, mushroom identification app, neural network mushroom identification",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.skyforest.by" },
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.skyforest.by/blog" },
        { "@type": "ListItem", position: 3, name: "How to Identify a Mushroom" },
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
        <BlogArticleHeader title="How to Identify a Mushroom from a&nbsp;Photo: Apps, Neural Networks and&nbsp;Key Features" />

        <h1 className="mb-6 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          How to Identify a Mushroom from a&nbsp;Photo: Apps, Neural Networks and&nbsp;Key Features
        </h1>

        <p className="mb-8 text-sm text-white/40">
          Updated: June 15, 2026 · Reading time: 11 min
        </p>

        <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-2xl">
          <Image
            src="/images/blog/blog-kak-opredelit-grib.jpg"
            alt="A forager identifying a mushroom from a photo in a smartphone app in the middle of a sunlit forest"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        {/* INTRO */}
        <p className="mb-5 text-lg leading-relaxed text-white/80">
          &ldquo;What kind of mushroom is this?&rdquo; is probably the most
          common question in the forest. You&rsquo;ve found a beautiful, sturdy
          bolete&nbsp;&mdash; or is it an inedible lookalike? In the past, only
          experienced foragers and rare field guides knew the answer. Today all
          you need to do is take out your smartphone, photograph your find&nbsp;&mdash;
          and a couple of seconds later{" "}
          <strong className="text-white">a neural network suggests the species</strong>.
          It sounds like magic, but behind this simplicity lie important nuances
          worth understanding before you trust the algorithm.
        </p>
        <p className="mb-8 text-lg leading-relaxed text-white/80">
          In this article we&rsquo;ll take an honest look at how mushroom
          identification from a photo actually works, how accurate the popular
          apps really are, what and how to photograph correctly, which features
          you need to check by hand&nbsp;&mdash; and where the line lies beyond
          which trusting the algorithm becomes dangerous.
        </p>

        {/* SECTION 1 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          How a mushroom gets identified &ldquo;from a photo&rdquo; at all
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          At the core of every modern identifier is a{" "}
          <strong className="text-white">convolutional neural network (CNN)</strong>&nbsp;&mdash;
          the same type of algorithm used in facial recognition. Simplified, the
          process looks like this: your photo is turned into an array of pixels,
          the neural network extracts visual features from it&nbsp;&mdash; from
          simple contours and textures to the complex shapes of the cap and
          stem&nbsp;&mdash; and then compares them with a trained database and
          returns a list of the most likely species with a match percentage.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          The key word here is{" "}
          <strong className="text-white">&ldquo;likely&rdquo;</strong>. The
          algorithm doesn&rsquo;t &ldquo;know&rdquo; the mushroom; it only
          estimates how similar it is to what it saw during training. If the
          angle is unusual, the lighting is poor, and the species is rare, an
          error is almost inevitable. And the main limitation: a neural network
          works{" "}
          <strong className="text-white">only with what is visible in the photo</strong>.
          Smell, taste, changes in the color of the flesh, the type of soil&nbsp;&mdash;
          all of this stays out of frame, even though these are often the very
          features that distinguish an edible mushroom from a poisonous one.
        </p>

        {/* SECTION 2 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          How accurate the apps are: what the research says
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          This is where it gets really important. App marketing promises
          &ldquo;instant and accurate recognition,&rdquo; but independent
          scientific tests paint a far more restrained picture.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          In a{" "}
          <a
            href="https://pubmed.ncbi.nlm.nih.gov/36794335/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline decoration-emerald-400/30 hover:text-emerald-300"
          >
            study published in the journal Clinical Toxicology (PubMed
            36794335)
          </a>
          , three popular apps were tested on 78 samples submitted to a
          toxicology center. The best of them (Picture Mushroom) identified the
          species correctly only{" "}
          <strong className="text-white">49% of the time</strong>, and poisonous
          mushrooms&nbsp;&mdash; 44%. The other two managed roughly a third of
          the samples.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          A more recent test, described in{" "}
          <a
            href="https://www.nature.com/articles/s41538-026-00752-4"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline decoration-emerald-400/30 hover:text-emerald-300"
          >
            npj Science of Food (Nature, 2026)
          </a>
          , covered more than 100 photographs of nearly 60 species in real-world
          conditions. The conclusion: even the best-performing tool{" "}
          <strong className="text-white">was wrong in almost 15% of cases</strong>,
          and no app consistently gave a single correct answer.
        </p>

        <div className="my-8 overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 font-semibold text-white">App</th>
                <th className="px-4 py-3 font-semibold text-white">
                  Accuracy (all species)
                </th>
                <th className="px-4 py-3 font-semibold text-white">
                  Poisonous species
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
          According to the developers of the &ldquo;Gribok&rdquo; app, its
          database contains over 12,000 species, but reliability above 80% is
          claimed for only about 1,700 of them. In other words: neural networks
          do a decent job with common, easily recognizable mushrooms, but they
          easily make mistakes on rare and &ldquo;disputed&rdquo; species.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Psychologists call this the trap of{" "}
          <strong className="text-white">automation bias</strong>: people tend to
          overestimate a machine&rsquo;s decisions. The app delivered its answer
          in a confident tone&nbsp;&mdash; and you want to believe it. But with
          mushrooms, the cost of an error is far too high.
        </p>

        {/* SECTION 3 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Anatomy of a mushroom: what exactly to photograph
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          The main cause of errors is a photo of the cap from above only. From
          the cap alone, even an expert mycologist rarely identifies the
          species. For both the neural network and you to draw a conclusion, you
          need to capture all the key parts:
        </p>
        <ul className="mb-5 list-inside space-y-2 text-white/80">
          <li className="leading-relaxed">
            <strong className="text-white">Cap from above:</strong> shape, color,
            surface texture (smooth, scaly, slimy).
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Underside of the cap:</strong> gills or
            tubes (pores)&nbsp;&mdash; these are different groups of mushrooms.
            Take a close-up.
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">The whole stem:</strong> color, shape,
            the presence of a net or scales, and whether there is a ring (skirt).
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Base of the stem:</strong> carefully
            twist out the entire mushroom&nbsp;&mdash; there may be a volva (sac)
            at the base, characteristic of the deadly poisonous amanitas.
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">A cut through the flesh:</strong> the
            color at the cut and how it changes (turns blue, turns red, stays
            white).
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Surroundings:</strong> the type of
            forest and the nearby tree&nbsp;&mdash; many mushrooms form mycorrhiza
            with strictly specific tree species.
          </li>
        </ul>

        {/* SECTION 4 */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          How to take the photo correctly: a checklist
        </h2>
        <ul className="mb-5 list-inside space-y-2 text-white/80">
          <li className="leading-relaxed">
            Shoot in <strong className="text-white">daylight</strong>, without
            flash, in focus.
          </li>
          <li className="leading-relaxed">
            Take <strong className="text-white">3–5 shots</strong> from different
            angles, not just one.
          </li>
          <li className="leading-relaxed">
            Place a{" "}
            <strong className="text-white">ruler or coin</strong> next to it for
            scale.
          </li>
          <li className="leading-relaxed">
            Clean soil and leaves off the cap and stem, but do not damage the
            mushroom.
          </li>
          <li className="leading-relaxed">
            Shoot against a{" "}
            <strong className="text-white">neutral background</strong>{" "}
            (your palm, a sheet of paper) if the background is too busy.
          </li>
        </ul>

        {/* SECTION 5: bot promo */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          The SkyForest mushroom identifier in&nbsp;Telegram
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          So you don&rsquo;t have to install a separate app, we built a{" "}
          <strong className="text-white">free identifier right inside
          Telegram</strong>. You send the bot a photo of a mushroom&nbsp;&mdash; it
          recognizes the most likely species and sends you a summary. A handy way
          to check your find without leaving the messenger.
        </p>
        <div className="my-8 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-6 backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2">
            <Bot className="h-6 w-6 text-sky-300" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-white">
              How it works
            </h3>
          </div>
          <ul className="mb-5 list-inside space-y-2 text-sm text-white/80">
            <li className="leading-relaxed">
              <strong className="text-white">3 checks free</strong>&nbsp;&mdash;
              for every new user.
            </li>
            <li className="leading-relaxed">
              After that, <strong className="text-white">1 token = 1 identification</strong>.
              Tokens are purchased on the SkyForest website.
            </li>
            <li className="leading-relaxed">
              In your{" "}
              <Link
                href="/account"
                className="text-sky-300 underline decoration-sky-400/30 hover:text-sky-200"
              >
                account
              </Link>{" "}
              you transfer some of your tokens to the bot&rsquo;s balance&nbsp;&mdash;
              and identify mushrooms from photos.
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
              Open the bot in Telegram
            </a>
            <Link
              href="/account"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              Manage tokens
            </Link>
          </div>
        </div>
        <p className="mb-5 leading-relaxed text-white/80">
          Important: our bot, like any other identifier, is a{" "}
          <strong className="text-white">helper, not an expert</strong>. Use it to
          narrow down the possibilities and learn more about mushrooms, but always
          verify the final decision against the features.
        </p>

        {/* SECTION 6: safety */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Safety rules: when you can&rsquo;t trust it
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          No app and no bot should be the sole basis for putting a mushroom in
          your basket, let alone in the frying pan. Remember a few rules:
        </p>
        <ul className="mb-5 list-inside space-y-2 text-white/80">
          <li className="leading-relaxed">
            <strong className="text-white">When in doubt, leave it out.</strong>{" "}
            This is the forager&rsquo;s golden rule, older than any neural network.
          </li>
          <li className="leading-relaxed">
            Be especially careful with{" "}
            <strong className="text-white">gilled mushrooms</strong>: they include
            the most dangerous lookalikes (the death cap, the amanitas).
          </li>
          <li className="leading-relaxed">
            Check the <strong className="text-white">volva and ring</strong>&nbsp;&mdash;
            they aren&rsquo;t visible in a top-down photo, yet they are exactly
            what gives away deadly poisonous species.
          </li>
          <li className="leading-relaxed">
            When in doubt, show your find to an{" "}
            <strong className="text-white">experienced forager or mycologist</strong>.
          </li>
          <li className="leading-relaxed">
            At the first signs of poisoning (nausea, abdominal pain, weakness)&nbsp;&mdash;{" "}
            <strong className="text-white">see a doctor immediately</strong>,
            without waiting for things to get worse.
          </li>
        </ul>

        {/* Summary */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Bottom line
        </h2>
        <p className="mb-8 leading-relaxed text-white/80">
          Identifying mushrooms from photos is a great tool for learning,
          broadening your horizons and quickly checking your finds. Modern neural
          networks recognize common species fairly well, but make mistakes on
          rare and dangerous ones. Take high-quality photos from several angles,
          check the key features by hand and remember: the algorithm is a helper,
          and responsibility for the decision always rests with you. Use the{" "}
          <a
            href={BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline decoration-emerald-400/30 hover:text-emerald-300"
          >
            SkyForest identifier
          </a>{" "}
          as a convenient hint&nbsp;&mdash; but keep the final check for yourself.
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

        <RelatedArticles currentSlug="kak-opredelit-grib" />

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl sm:p-12">
          <h2 className="mb-4 text-2xl font-bold text-white">
            Identify mushrooms and find the best days to forage
          </h2>
          <p className="mb-6 text-white/70">
            SkyForest tells you when the weather is perfect for the quiet hunt,
            and the Telegram bot helps you recognize your find from a photo.
            Registration is free.
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
