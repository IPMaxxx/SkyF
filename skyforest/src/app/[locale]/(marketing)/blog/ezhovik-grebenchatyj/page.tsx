import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { BlogArticleHeader } from "@/components/marketing/BlogArticleHeader";

export const metadata: Metadata = {
  title:
    "Lion's Mane: the brain mushroom — what the science says",
  description:
    "Lion's Mane (Hericium erinaceus) is a mushroom that supports cognitive function, memory and mood. We review the clinical research: erinacines vs hericenones, mycelium vs fruiting body.",
  keywords: [
    "lion's mane",
    "lion's mane mushroom",
    "hericium erinaceus",
    "brain mushroom",
    "lion's mane benefits",
    "erinacines",
    "hericenones",
    "nootropic mushroom",
    "lion's mane cognitive function",
    "lion's mane depression",
    "lion's mane memory",
    "lion's mane mycelium",
    "mushroom for the nervous system",
    "nerve growth factor NGF",
    "lion's mane clinical research",
  ],
  openGraph: {
    title: "Lion's Mane: the brain mushroom — what the science says",
    description:
      "We review the clinical research on Lion's Mane: its effects on memory, depression, anxiety and the nervous system. Mycelium vs fruiting body.",
    url: "https://www.skyforest.by/blog/ezhovik-grebenchatyj",
    siteName: "SkyForest",
    type: "article",
    images: [
      {
        url: "https://www.skyforest.by/images/blog/blog-ezhovik-grebenchatyj.jpg",
        width: 1792,
        height: 1024,
        alt: "Lion's Mane mushroom growing on a tree trunk in an autumn forest",
      },
    ],
  },
  alternates: {
    canonical: "https://www.skyforest.by/blog/ezhovik-grebenchatyj",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline:
    "Lion's Mane: the brain mushroom — what the science says",
  description:
    "We review the clinical research on Lion's Mane: its effects on memory, depression, anxiety and the nervous system. Erinacines, hericenones, mycelium and fruiting bodies.",
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
    "lion's mane, hericium erinaceus, brain mushroom, erinacines, hericenones, mycelium, cognitive function",
  inLanguage: "en",
};

const RELATED = [
  {
    href: "/blog/pogoda-dlya-gribov",
    title: "Weather for mushrooms: what temperature and humidity mushrooms grow in",
    desc: "Which weather conditions are ideal for mushroom growth. Temperature, humidity, rainfall — what you need to know.",
    time: "12 min",
  },
  {
    href: "/blog/v-kakom-lesu-iskat-griby",
    title: "Which forest to look for mushrooms in: coniferous, deciduous or mixed",
    desc: "Which mushrooms grow where: porcini in pine forests, birch boletes near birches. A guide to forest types.",
    time: "10 min",
  },
  {
    href: "/blog/gde-rastut-griby",
    title: "Where mushrooms grow in Russia and Belarus",
    desc: "Regions, forests and specific spots for mushroom foraging. A map of mushroom locations and tips.",
    time: "12 min",
  },
  {
    href: "/blog/kogda-pora-v-les",
    title: "When it's time to head to the forest: 7 signs the mushrooms are up",
    desc: "Practical signs that the season has started. Soil temperature, first finds and other clues.",
    time: "6 min",
  },
];

const FAQ_ITEMS = [
  {
    q: "How does Lion's Mane benefit the brain?",
    a: "Lion's Mane contains unique compounds — erinacines (in the mycelium) and hericenones (in the fruiting body) — that stimulate the production of nerve growth factor (NGF). Clinical studies in humans have shown improved cognitive function and reduced anxiety and depression with regular use. The evidence base is still limited to small samples, but the results are consistent.",
  },
  {
    q: "Which is better — Lion's Mane mycelium or fruiting body?",
    a: "It depends on your goal. For cognitive function and neuroprotection, choose mycelium enriched with erinacines (produced by liquid fermentation, not grown on grain). It is the erinacines that cross the blood-brain barrier and stimulate NGF in the brain. For immunity, choose a fruiting-body extract with a high beta-glucan content. Important: most commercial mycelium supplements are grown on grain and differ substantially from the extracts used in research.",
  },
  {
    q: "Can you find Lion's Mane in the forest?",
    a: "Yes, Lion's Mane occurs in the forests of Russia and Belarus — on the trunks and stumps of deciduous trees (oak, beech, birch). But it is rare and listed in the Red Data Books of many regions. More often it is cultivated under controlled conditions to produce supplements.",
  },
  {
    q: "How much Lion's Mane do you need to take to see an effect?",
    a: "In clinical studies, effects were observed with doses ranging from 750 mg to 3000 mg per day over 4–49 weeks. Cognitive improvement increased week by week, but could decline after the supplement was discontinued.",
  },
  {
    q: "Does Lion's Mane have any side effects?",
    a: "No serious side effects were recorded in the clinical trials conducted. A 2025 systematic review (Frontiers in Nutrition) notes possible side effects: stomach discomfort, headache and allergic reactions — but these are rare. It is advisable to consult a doctor before use.",
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
        <BlogArticleHeader title="Lion's Mane: the brain&nbsp;mushroom&nbsp;— what&nbsp;the science says" />

        <h1 className="mb-6 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          Lion’s Mane: the brain&nbsp;mushroom&nbsp;— what&nbsp;the science says
        </h1>

        <p className="mb-8 text-sm text-white/40">
          Updated: March 11, 2026 · 18 min read
        </p>

        <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-2xl">
          <Image
            src="/images/blog/blog-ezhovik-grebenchatyj.jpg"
            alt="Lion's Mane (Hericium erinaceus) growing on a tree trunk in a misty autumn forest"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        {/* INTRO */}
        <p className="mb-5 text-lg leading-relaxed text-white/80">
          Lion’s Mane (<em>Hericium erinaceus</em>), also known as
          &laquo;lion’s mane&raquo;, &laquo;yamabushitake&raquo; and
          &laquo;bearded tooth&raquo;, is one of the most unusual mushrooms on
          the planet. White, shaggy and resembling a coral or the beard of a
          fairy-tale elder, it is unmistakable in the forest. But its
          appearance is far from the main point. Over the past 20 years this
          mushroom has become the subject of dozens of clinical studies, and
          the results are striking: improved memory, reduced anxiety and
          protection of the nervous system.
        </p>
        <p className="mb-5 text-lg leading-relaxed text-white/80">
          Online, there is a lot of marketing around Lion’s Mane and few hard
          facts. Some sellers promote fruiting-body powder, others mycelium
          extract, and still others tinctures. Who is right? What has actually
          been confirmed by science? Which compounds work, and where are they
          found? In this article we review{" "}
          <strong className="text-white">
            only peer-reviewed clinical studies in humans
          </strong>{" "}
          — no &laquo;mouse&raquo; data and no advertising promises.
        </p>
        <p className="mb-8 text-lg leading-relaxed text-white/80">
          For fans of mushroom foraging, Lion’s Mane is a special find. It
          occurs in deciduous and mixed forests of Russia and Belarus, growing
          on the trunks and stumps of oak, beech and birch. It is not easy to
          find, though — the species is rare and listed in the Red Data Book in
          many regions. But every mushroom hunter should know about it.
        </p>

        {/* SECTION 1: Two compounds */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Two classes of compounds: erinacines and hericenones
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          The main scientific intrigue of Lion’s Mane lies in its chemistry.
          The mushroom produces two fundamentally different classes of
          bioactive terpenoids, and they are distributed across different parts
          of the organism.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          <strong className="text-white">Erinacines</strong> are cyathane
          diterpenoids found{" "}
          <strong className="text-white">predominantly in the mycelium</strong>.
          This is the key point.{" "}
          <a
            href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11969743/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline decoration-emerald-400/30 hover:text-emerald-300"
          >
            A 2025 genomic study (PMC11969743)
          </a>{" "}
          confirmed that the erinacine biosynthesis genes (eri genes) are
          active in the mycelial phase but suppressed in the fruiting bodies.
          Erinacines are practically undetectable in the fruiting bodies of
          Lion’s Mane. The mycelium is the only significant source of these
          compounds.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          <strong className="text-white">Hericenones</strong> are another class
          of terpenoids, found in the{" "}
          <strong className="text-white">fruiting bodies</strong> (what we see
          as the &laquo;mushroom&raquo; in the forest). Hericenones also
          stimulate the synthesis of nerve growth factor (NGF) and have
          immunomodulatory and antitumor activity. But — and this is crucial —{" "}
          <strong className="text-white">
            there is as yet no clinical evidence of their effect on cognitive
            function
          </strong>
          , unlike the erinacines from the mycelium. Direct evidence that
          hericenones cross the blood-brain barrier is also insufficient.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Why does this matter? Because the vast majority of supplements on the
          market are powder made from <em>fruiting bodies</em>. It contains
          hericenones, polysaccharides and beta-glucans — compounds beneficial
          for immunity. But if your goal is improved memory, concentration and
          neuronal protection, you need{" "}
          <strong className="text-white">mycelium enriched with erinacines</strong>
          . It was mycelium that was used in the key clinical trials in humans.
        </p>

        {/* Comparison table */}
        <div className="my-8 overflow-x-auto rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 font-semibold text-white">
                  Parameter
                </th>
                <th className="px-4 py-3 font-semibold text-white">
                  Erinacines (mycelium)
                </th>
                <th className="px-4 py-3 font-semibold text-white">
                  Hericenones (fruiting body)
                </th>
              </tr>
            </thead>
            <tbody className="text-white/70">
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 text-white/90">Source</td>
                <td className="px-4 py-3">Mycelium</td>
                <td className="px-4 py-3">Fruiting body</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 text-white/90">NGF stimulation</td>
                <td className="px-4 py-3">Yes, strong</td>
                <td className="px-4 py-3">Yes, moderate</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 text-white/90">
                  Cognitive function
                </td>
                <td className="px-4 py-3 text-emerald-400">
                  Clinically confirmed
                </td>
                <td className="px-4 py-3 text-white/50">
                  Not confirmed
                </td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 text-white/90">
                  Antidepressant effect
                </td>
                <td className="px-4 py-3 text-emerald-400">
                  Clinically confirmed
                </td>
                <td className="px-4 py-3">Partial data</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="px-4 py-3 text-white/90">Immunity</td>
                <td className="px-4 py-3">Yes</td>
                <td className="px-4 py-3 text-emerald-400">Yes, pronounced</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-white/90">
                  Antitumor activity
                </td>
                <td className="px-4 py-3">Limited data</td>
                <td className="px-4 py-3 text-emerald-400">Confirmed</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SECTION 2: Clinical studies */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Clinical studies in humans
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Let’s get specific. Below are only{" "}
          <strong className="text-white">
            randomized controlled trials in human participants
          </strong>
          , published in peer-reviewed scientific journals. No rats, no test
          tubes and no &laquo;traditional medicine&raquo;.
        </p>

        {/* Study 1 */}
        <h3 className="mb-3 mt-8 text-xl font-bold text-white">
          Improved cognitive function in mild impairment
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
          A double-blind, placebo-controlled study. 30 Japanese participants
          aged 50–80 with diagnosed mild cognitive impairment. One group
          received tablets containing Lion’s Mane powder
          (4 × 250 mg, three times a day — 3000 mg/day in total), the other a
          placebo. The course lasted 16 weeks.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Result: as early as week 8, the Lion’s Mane group showed a{" "}
          <strong className="text-white">
            statistically significant improvement in cognitive function
          </strong>{" "}
          on the HDS-R scale (the revised Hasegawa Dementia Scale). Scores
          continued to rise through weeks 12 and 16. No side effects were
          recorded. But here is an important point: four weeks after the
          supplement was stopped, scores began to decline. This means Lion’s
          Mane works while you are taking it — it is not a &laquo;cure and
          forget&raquo; remedy.
        </p>

        {/* Study 2 */}
        <h3 className="mb-3 mt-8 text-xl font-bold text-white">
          Reduced depression and anxiety
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
          A randomized, double-blind study. For 4 weeks, 30 women ate cookies
          containing Lion’s Mane powder (500 mg per cookie, 4 cookies a day) or
          placebo cookies. Measures of depression (CES-D) and indefinite
          complaints (ICI) were assessed.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Result: a{" "}
          <strong className="text-white">
            significant reduction in depression and anxiety
          </strong>{" "}
          in the Lion’s Mane group. Scores for irritability, anxiety and
          concentration improved especially markedly. The authors note that the
          mechanism may be linked not only to NGF stimulation but also to other
          neurotropic effects — in particular, effects on serotonin and
          dopamine levels.
        </p>

        {/* Study 3 */}
        <h3 className="mb-3 mt-8 text-xl font-bold text-white">
          Improved mood and sleep in people who are overweight
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
          77 volunteers who were overweight or obese and experienced mood
          and/or sleep disturbances. 8 weeks of Lion’s Mane supplementation
          alongside a low-calorie diet.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Result:{" "}
          <strong className="text-white">
            reduced depression and anxiety and improved sleep quality
          </strong>
          . An increase in pro-BDNF (the precursor of brain-derived
          neurotrophic factor) was also recorded — a protein critically
          important for the growth and survival of neurons. Interestingly, the
          effect persisted for 8 weeks after the supplement was stopped, which
          may indicate structural changes in neural connections.
        </p>

        {/* Study 4 */}
        <h3 className="mb-3 mt-8 text-xl font-bold text-white">
          Prevention of Alzheimer’s disease
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
          A pilot double-blind, placebo-controlled study lasting 49 weeks.
          Patients with mild Alzheimer’s disease received{" "}
          <strong className="text-white">
            Lion’s Mane mycelium enriched with erinacine A
          </strong>{" "}
          (3 capsules of 350 mg per day, erinacine A content — 5 mg/g).
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Result: the Lion’s Mane group showed a{" "}
          <strong className="text-white">
            significant improvement in MMSE scores
          </strong>{" "}
          and in measures of daily living activities (IADL). In the placebo
          group, by contrast, a decline in BDNF levels and a rise in markers
          associated with Alzheimer’s (beta-amyloid 1–40) were recorded.
          Neuroimaging revealed protective changes in the brain’s white matter
          in the treatment group. This is one of the most convincing clinical
          studies of erinacines in neurodegeneration.
        </p>

        {/* Study 5 */}
        <h3 className="mb-3 mt-8 text-xl font-bold text-white">
          Restored hearing in elderly patients
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
          A double-blind, randomized, placebo-controlled trial.
          80 patients with hearing impairment aged 50–79. The treatment group
          received{" "}
          <strong className="text-white">
            Lion’s Mane mycelium enriched with erinacine A
          </strong>{" "}
          (2000 mg/day) for 8 months.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Result: in patients over 65, a{" "}
          <strong className="text-white">
            significant improvement in hearing
          </strong>{" "}
          was observed — both at high frequencies and in speech recognition. An{" "}
          <strong className="text-white">
            increase in NGF (nerve growth factor)
          </strong>{" "}
          and BDNF levels in blood serum was also recorded. This study is one of
          the first to show that erinacines from mycelium can restore auditory
          nerve function in older people.
        </p>

        {/* Study 6 */}
        <h3 className="mb-3 mt-8 text-xl font-bold text-white">
          Cognitive function in healthy people
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
          An 8-week double-blind, randomized, placebo-controlled study.
          33 healthy volunteers received Lion’s Mane mycelium enriched with
          erinacine A.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Result: a{" "}
          <strong className="text-white">
            significant increase in cognitive processing speed
          </strong>
          , a rise in serum BDNF levels and improved gut microbiota diversity.
          This study is important because it showed that erinacines can improve
          cognitive function not only in patients with impairment but also in
          healthy people.
        </p>

        {/* Study 7 */}
        <h3 className="mb-3 mt-8 text-xl font-bold text-white">
          Systematic review: Alzheimer’s disease and dietary supplements
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
          A large-scale systematic review that analyzed more than 22,000
          studies on dietary supplements for Alzheimer’s disease. Of all the
          compounds examined, only a few showed a proven positive effect on
          cognitive and functional outcomes.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Among those found to be effective were:{" "}
          <strong className="text-white">Lion’s Mane mycelium</strong>,
          resveratrol, vitamin D and betaine. These four compounds improved
          cognitive scores, functional outcomes and patients’ quality of life —
          unlike dozens of other supplements that showed no significant effect.
          Note that this specifically refers to the{" "}
          <strong className="text-white">mycelium</strong>, not the fruiting
          bodies.
        </p>

        {/* Evidence caveat */}
        <h3 className="mb-3 mt-8 text-xl font-bold text-white">
          An important caveat about the evidence base
        </h3>
        <p className="mb-5 leading-relaxed text-white/80">
          All the studies listed have limitations: small samples (from 30 to 80
          people), varying extract standards and forms of the mushroom. It is
          still too early to speak of a firm scientific consensus.
          Nevertheless, the direction of the results is consistent: mycelium
          enriched with erinacines demonstrates a positive effect on cognitive
          function in every trial conducted. It is also worth noting separately
          that a{" "}
          <a
            href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12018234/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline decoration-emerald-400/30 hover:text-emerald-300"
          >
            2025 study (Frontiers in Nutrition)
          </a>
          , in which healthy young people took a single dose of fruiting-body
          extract (3 g, 10:1), found no significant improvement in cognitive
          function — which indirectly confirms the key role of erinacines from
          the mycelium.
        </p>

        {/* SECTION 3: Why mycelium */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Why mycelium, not the fruiting body
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          This question sparks heated debate in the mushroom community. Some
          experts insist on the superiority of fruiting bodies — arguing that
          they contain more beta-glucans and &laquo;real mushroom&raquo;.
          Others — among them Paul Stamets, one of the world’s leading
          mycologists — champion mycelium as the more valuable source of
          neuroactive compounds.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          The available data all point in one direction. Erinacines are the
          only compounds in Lion’s Mane for which{" "}
          <strong className="text-white">
            clinical trials have shown effects on cognitive function,
            depression and neuroregeneration
          </strong>
          . And erinacines are found in the mycelium. They are practically
          absent from the fruiting bodies — this was confirmed by a{" "}
          <a
            href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11969743/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline decoration-emerald-400/30 hover:text-emerald-300"
          >
            2025 genomic study (PMC11969743)
          </a>
          .
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          This does not mean fruiting bodies are useless. Hericenones from the
          fruiting bodies stimulate NGF and have immunomodulatory and antitumor
          properties. If your goal is general immune support, fruiting-body
          powder is a perfectly workable option. But if you are looking for a{" "}
          <strong className="text-white">
            nootropic effect, improved memory and protection against
            neurodegeneration
          </strong>
          , choose supplements based on mycelium enriched with erinacines. That
          is exactly the kind of mycelium used in all the key clinical trials.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          There is a practical trap here, however. Most commercial supplements
          labeled &laquo;mycelium&raquo; are{" "}
          <strong className="text-white">mycelium grown on grain</strong>{" "}
          (rice, oats, wheat). In such powder, up to 40–60% of the mass is
          starch from the substrate, and the beta-glucan content drops to 1–5%.
          These products may contain little to no erinacines. This is a
          fundamentally different product from the mycelium in the clinical
          studies, which used liquid fermentation with a controlled erinacine A
          content.
        </p>

        {/* SECTION 4: NGF */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Nerve growth factor (NGF) — why it matters
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          NGF (Nerve Growth Factor) is a protein discovered by Nobel laureate
          Rita Levi-Montalcini in 1952. It is critically important for the
          growth, maintenance and survival of neurons. NGF production declines
          with age, which is linked to worsening memory, cognitive impairment
          and neurodegenerative diseases.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Lion’s Mane is one of the few natural sources of compounds capable of{" "}
          <strong className="text-white">
            stimulating NGF synthesis in the body
          </strong>
          . Erinacines from the mycelium cross the blood-brain barrier (which is
          extremely rare for natural compounds) and directly induce NGF
          production in the central nervous system. A study in elderly patients
          with hearing impairment{" "}
          <a
            href="https://www.sciencedirect.com/science/article/pii/S1756464622002900"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline decoration-emerald-400/30 hover:text-emerald-300"
          >
            (Li et al., 2022)
          </a>{" "}
          confirmed that 8 months of taking mycelium enriched with erinacine A
          significantly raised NGF and BDNF levels in blood serum.
        </p>

        {/* SECTION 5: Where to find */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Where Lion’s Mane grows
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Lion’s Mane is a saprotroph and weak parasite of deciduous trees. It
          grows on the trunks and stumps of oak, beech, maple and birch, and
          more rarely on elm and ash. It prefers old, weakened or already dead
          trees. In Russia it occurs in Primorsky Krai, the Caucasus and
          Crimea, and more rarely in the central regions. In Belarus it is
          recorded in Belovezhskaya Pushcha and the forests of Polesia.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          Finding it is a real stroke of luck. Lion’s Mane is listed in the Red
          Data Books of many regions of Russia and in the Red Data Book of the
          Republic of Belarus. If you come across it in the forest, photograph
          it and remember the spot and the tree. The fruiting body appears on
          the same trunk for years, usually in August–October at temperatures of
          15–20°C and high humidity.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          For a forager who tracks their forest routes, Lion’s Mane is one more
          reason to save the coordinates of interesting finds. In SkyForest you
          can mark on the map the spot where you saw Lion’s Mane, link it to the
          forest type and track the weather conditions — so you can return at
          the right moment.
        </p>

        {/* SECTION 6: How to choose */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          How to choose a Lion’s Mane supplement
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          If you want to get the neuroprotective benefits of Lion’s Mane but
          don’t plan to forage for it in the forest (and rightly so — it’s in
          the Red Data Book), here is what to look for when choosing a
          supplement:
        </p>
        <ul className="mb-5 list-inside space-y-2 text-white/80">
          <li className="leading-relaxed">
            <strong className="text-white">Composition:</strong> look for
            products based on mycelium, not just fruiting bodies. Ideally, with
            a stated erinacine content (erinacine A, C). The mycelium should be
            produced by liquid fermentation, not grown on grain.
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Dosage:</strong> clinical studies
            used doses from 750 mg to 3000 mg per day. Supplements dosed at
            250–500 mg may be insufficient.
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Duration:</strong> effects build up
            by weeks 4–8 of use. Take it for less than a month and you’re
            unlikely to feel a difference.
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Certificate of Analysis (COA):</strong>{" "}
            ask the manufacturer for data on beta-glucan and alpha-glucan
            (starch) content. A good benchmark: beta-glucans &gt; 20%,
            alpha-glucans &lt; 10%. If starch exceeds 30%, you’re mostly looking
            at grain, not mushroom.
          </li>
          <li className="leading-relaxed">
            <strong className="text-white">Red flags:</strong> labels like
            &laquo;mycelium on grain&raquo; and &laquo;myceliated grain&raquo;,
            no stated erinacine content, and a price well below market.
          </li>
        </ul>

        {/* Summary */}
        <h2 className="mb-5 mt-12 text-2xl font-bold text-white sm:text-3xl">
          The bottom line
        </h2>
        <p className="mb-5 leading-relaxed text-white/80">
          Lion’s Mane is one of the few mushrooms whose effect on the nervous
          system has been confirmed by clinical trials in humans, not just by
          experiments on cell cultures. Improved memory, reduced anxiety, better
          sleep, higher NGF and restored hearing — all of this has been recorded
          in peer-reviewed scientific journals.
        </p>
        <p className="mb-5 leading-relaxed text-white/80">
          The key takeaway: for cognitive goals, choose{" "}
          <strong className="text-white">
            mycelium enriched with erinacines
          </strong>{" "}
          (liquid fermentation, not grown on grain). Fruiting bodies are good
          for immunity, but there is no clinical evidence of their effect on
          cognitive function. The effect is cumulative: at least 4 weeks of
          regular use, and scores may decline once you stop.
        </p>
        <p className="mb-8 leading-relaxed text-white/80">
          It’s important to understand: the evidence base on Lion’s Mane is
          still taking shape. There are few studies, the samples are small, and
          the products on the market differ greatly from the extracts scientists
          used. Lion’s Mane shouldn’t be seen as a medicine — but as a promising
          subject of neuroscience it deserves attention.
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

        {/* Related */}
        <h2 className="mb-6 mt-16 text-2xl font-bold text-white">
          Read also
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
            Track the weather for your mushroom spots
          </h2>
          <p className="mb-6 text-white/70">
            SkyForest analyzes rainfall, temperature and humidity — and suggests
            the best day for foraging. Save the coordinates of your finds,
            including rare species like Lion’s Mane.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-primary-dark hover:shadow-xl"
          >
            Try SkyForest →
          </Link>
        </div>
      </article>
    </>
  );
}
