import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { RelatedArticles } from "@/components/marketing/RelatedArticles";
import { BlogArticleHeader } from "@/components/marketing/BlogArticleHeader";

export const metadata: Metadata = {
  title: "Which Forest to Search for Mushrooms: Coniferous, Deciduous or Mixed",
  description:
    "Learn which mushrooms grow in coniferous, deciduous and mixed forests. A mushroom-and-tree compatibility table. Mycorrhiza and tips for finding good mushroom spots.",
  keywords: [
    "which forest do mushrooms grow in",
    "mushrooms in coniferous forest",
    "mushrooms in deciduous forest",
    "mushrooms in mixed forest",
    "where to look for mushrooms",
    "best forest for mushrooms",
    "mushroom mycorrhiza",
    "mushrooms under birch",
    "mushrooms under pine",
    "mushrooms under spruce",
    "mushroom spots in the forest",
    "mushroom foraging",
  ],
  openGraph: {
    title: "Which Forest to Search for Mushrooms: Coniferous, Deciduous or Mixed",
    description:
      "Learn which mushrooms grow in coniferous, deciduous and mixed forests. A mushroom-and-tree compatibility table. Mycorrhiza and tips for finding good mushroom spots.",
    url: "https://www.skyforest.by/blog/v-kakom-lesu-iskat-griby",
    siteName: "SkyForest",
    type: "article",
    images: [{ url: "https://www.skyforest.by/images/blog/blog-v-kakom-lesu-iskat-griby.jpg", width: 1792, height: 1024, alt: "Different forest types — pine, birch and mixed woodland with mushrooms" }],
    publishedTime: "2025-09-15T00:00:00+03:00",
    modifiedTime: "2025-09-15T00:00:00+03:00",
    authors: ["SkyForest"],
    section: "Mushrooms",
  },
  alternates: {
    canonical: "https://www.skyforest.by/blog/v-kakom-lesu-iskat-griby",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline:
        "Which Forest to Search for Mushrooms: Coniferous, Deciduous or Mixed",
      description:
        "Learn which mushrooms grow in coniferous, deciduous and mixed forests. A mushroom-and-tree compatibility table. Mycorrhiza and tips for finding good mushroom spots.",
      author: { "@type": "Organization", name: "SkyForest", url: "https://www.skyforest.by" },
      publisher: {
        "@type": "Organization",
        name: "SkyForest",
        url: "https://www.skyforest.by",
        logo: { "@type": "ImageObject", url: "https://www.skyforest.by/images/logo-square.png" },
      },
      datePublished: "2025-09-15",
      dateModified: "2025-09-15",
      mainEntityOfPage: "https://www.skyforest.by/blog/v-kakom-lesu-iskat-griby",
      image: {
        "@type": "ImageObject",
        url: "https://www.skyforest.by/images/blog/blog-v-kakom-lesu-iskat-griby.jpg",
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
        { "@type": "ListItem", position: 3, name: "Which Forest to Search for Mushrooms" },
      ],
    },
  ],
};

const COMPATIBILITY_TABLE = [
  { tree: "Pine", mushrooms: "Slippery jacks, saffron milk caps, king bolete (pine), bay bolete, chanterelles, man-on-horseback" },
  { tree: "Spruce", mushrooms: "King bolete (spruce), spruce milk cap, slimy spike-cap, chanterelles, russulas" },
  { tree: "Birch", mushrooms: "Birch bolete, king bolete (birch), woolly milk cap, true milk cap, chanterelles, russulas" },
  { tree: "Aspen", mushrooms: "Aspen bolete, aspen milk cap, russulas" },
  { tree: "Oak", mushrooms: "King bolete (oak), bay bolete, milk-white brittlegill, oak bolete, chanterelles" },
  { tree: "Alder", mushrooms: "Brown roll-rim, pink woolly milk cap, milk cap" },
  { tree: "Hazel", mushrooms: "White truffle, chanterelles, russulas" },
  { tree: "Linden", mushrooms: "Black milk cap, oak bolete, russulas" },
];

const FAQ_ITEMS = [
  {
    q: "Which forest has the most mushrooms?",
    a: "The greatest variety and abundance of mushrooms is found in mixed forests. A diversity of trees creates more niches for mycorrhizal fungi. According to the Forest Institute of the National Academy of Sciences of Belarus, mushroom species diversity in mixed forests is 30–40% higher than in pure coniferous or deciduous stands.",
  },
  {
    q: "Which mushrooms grow only in coniferous forest?",
    a: "Strictly coniferous species include the slippery jack (only with pine), pine saffron milk cap, spruce saffron milk cap, slimy spike-cap and man-on-horseback. These mushrooms form mycorrhiza exclusively with conifers and are not found in pure deciduous forests.",
  },
  {
    q: "Why do birch boletes grow specifically under birches?",
    a: "The birch bolete (Leccinum scabrum) is an obligate mycorrhizal partner of birch. Its mycelium physically wraps around the birch's roots and exchanges nutrients with the tree. Without birch, the birch bolete cannot form a fruiting body — it simply has no source of carbohydrates.",
  },
  {
    q: "Can you find king bolete in any forest?",
    a: "The king bolete (Boletus edulis) is one of the most versatile mycorrhizal mushrooms. It forms a symbiosis with pine, spruce, birch, oak and beech. That is why king boletes are found in coniferous, deciduous and mixed forests alike — though in each forest type it is a distinct subspecies with minor visual differences.",
  },
  {
    q: "How can you identify the forest type by its trees?",
    a: "Coniferous forest: more than 80% of the trees are pine, spruce or fir. Deciduous: more than 80% are birch, aspen, oak, maple or linden. Mixed: neither conifers nor broadleaf trees fully dominate. The easiest cue is the forest floor: needles and cones mean coniferous, fallen leaves mean deciduous, and a mix of both means a mixed forest.",
  },
];


export default function VKakomLesuIskatGribyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <BlogArticleHeader title="Which&nbsp;forest to search for mushrooms: coniferous, deciduous
          or&nbsp;mixed" />

        <h1 className="mb-6 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          Which&nbsp;forest to search for mushrooms: coniferous, deciduous
          or&nbsp;mixed
        </h1>
        <p className="mb-8 text-sm text-white/40">
          Updated: September 15, 2025 · Reading time: 10 min
        </p>

        <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-2xl">
          <Image
            src="/images/blog/blog-v-kakom-lesu-iskat-griby.jpg"
            alt="Mushrooms in different forest types — slippery jacks under pines, birch boletes near birches, king boletes in mixed woodland"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        {/* === Intro === */}
        <p className="mb-6 text-lg leading-relaxed text-white/80">
          Not every forest is equally good for mushrooms — and any experienced
          forager will confirm it. You can wander for an hour through a
          beautiful pine wood without finding a single fruiting body, then turn
          into an unremarkable little birch grove and fill an entire basket with
          birch boletes in half an hour. The secret isn’t luck. The secret lies
          in the&nbsp;
          <strong className="text-white">forest type</strong> and the trees
          that grow in it. Mushrooms are not random inhabitants of the forest
          floor. They are connected to specific tree species by invisible
          threads of mycelium, and this connection determines{" "}
          <strong className="text-white">which forest the mushrooms
          of</strong> a given species grow in.
        </p>
        <p className="mb-6 text-lg leading-relaxed text-white/80">
          As described in I.&nbsp;I. Sidorova’s textbook &ldquo;Mycology&rdquo;
          (Moscow State University, 2020), about 90% of edible forest mushrooms
          are mycorrhiza-forming: they physically cannot grow without a partner
          tree. Understanding this simple fact transforms the whole approach to
          foraging. Instead of combing acres at random, the forager begins to{" "}
          <em>read the forest</em>: spots a pine and expects slippery jacks,
          notices a birch and looks closely for birch boletes, finds an oak edge
          and searches for king boletes.
        </p>
        <p className="mb-12 text-lg leading-relaxed text-white/80">
          In this article we’ll break down which mushrooms are characteristic of
          coniferous, deciduous and mixed forests, explain the science behind it
          (mycorrhiza — a lovely word, but what does it actually mean?), give you
          a mushroom-and-tree compatibility table, and explain how to find good
          spots by reading the&nbsp;microrelief. And at the end, we’ll show how
          technology helps you choose the right forest without&nbsp;leaving
          home.
        </p>

        {/* === Section 1: Mycorrhiza === */}
        <h2 className="mb-4 mt-12 text-2xl font-bold text-white sm:text-3xl">
          What mycorrhiza is and why it&nbsp;matters
        </h2>
        <p className="mb-6 leading-relaxed text-white/80">
          The word &ldquo;mycorrhiza&rdquo; translates literally from Greek
          as{" "}
          <em>fungus-root</em>. It is a symbiosis between a fungus’s mycelium and
          a tree’s roots. The fungal hyphae wrap around the fine rootlets (and
          sometimes penetrate the cells) and form a shared network. Through it,
          the tree gives the fungus carbohydrates — the products of
          photosynthesis, which the fungus cannot produce itself. In return, the
          mycelium &ldquo;mines&rdquo; water and mineral nutrients from the soil
          — above all phosphorus and nitrogen — and passes them to the tree.
        </p>
        <p className="mb-6 leading-relaxed text-white/80">
          According to the Forest Institute of the National Academy of Sciences
          of Belarus, mycorrhizal fungi increase the absorbing surface of a
          tree’s root system by a factor of 10–100. A tree without mycorrhiza is
          like a human without gut microflora: it will survive, but it will be
          sickly and grow poorly. This is precisely why foresters have long used
          mycorrhizal preparations when planting seedlings.
        </p>
        <p className="mb-6 leading-relaxed text-white/80">
          For the forager, this means one simple thing:{" "}
          <strong className="text-white">
            no partner tree, no mushroom
          </strong>
          . The slippery jack forms ectomycorrhiza exclusively with two-needled
          pines. The birch bolete — only with birch. The spruce saffron milk cap
          — only with spruce. A study in the journal{" "}
          <em>Forest Ecology and Management</em> (2019) showed that even a small
          change in a forest’s species composition (for example, cutting 30% of
          the birches) leads to a noticeable decline in the diversity of
          mycorrhizal fungi within 3–5 years.
        </p>
        <p className="mb-12 leading-relaxed text-white/80">
          There are also &ldquo;cosmopolitan&rdquo; mushrooms. The king bolete,
          for instance, forms mycorrhiza with pine, spruce, birch and oak —
          hence its widespread distribution. The chanterelle is not too fussy
          either: it partners with spruce, pine, birch and oak. But most species
          are still tied to one or two tree species. And by knowing that tie,
          you turn a random walk in the woods into a purposeful{" "}
          <strong className="text-white">mushroom hunt</strong>.
        </p>

        {/* === Section 2: Coniferous === */}
        <h2 className="mb-4 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Coniferous forest — the realm of slippery jacks and&nbsp;saffron milk
          caps
        </h2>
        <p className="mb-6 leading-relaxed text-white/80">
          A coniferous forest is first and foremost pine and spruce woods. The
          soil here is acidic (pH 3.5–5.5), covered with a thick layer of
          coniferous litter. Little sunlight reaches the forest floor — the dense
          canopy holds it back. The conditions might seem harsh. But for a whole
          range of species,{" "}
          <strong className="text-white">mushrooms in coniferous forest</strong>{" "}
          are the most natural of habitats.
        </p>
        <p className="mb-6 leading-relaxed text-white/80">
          <strong className="text-white">Slippery jacks</strong> are the calling
          card of the pine forest. The slippery jack (<em>Suillus luteus</em>)
          grows exclusively{" "}
          <strong className="text-white">under pine</strong>. It is especially
          fond of young plantings: pine stands 10–30 years old with sparse
          undergrowth and a moss cover. Slippery jacks are among the first to
          appear — as early as June — and fruit in waves until October. Look for
          them on sandy soils, along forest roads and at woodland edges, where
          the soil warms up better.
        </p>
        <p className="mb-6 leading-relaxed text-white/80">
          <strong className="text-white">Saffron milk caps</strong> are another
          &ldquo;coniferous&rdquo; mushroom. The pine saffron milk cap
          (<em>Lactarius deliciosus</em>) is found{" "}
          <strong className="text-white">under pines</strong> on sandy and
          sandy-loam soils, while the spruce saffron milk cap (<em>Lactarius
          deterrimus</em>) grows{" "}
          <strong className="text-white">under spruces</strong>, often among
          young spruce stands. As noted in the reference guide &ldquo;Mushrooms
          of Belarus&rdquo; (O.&nbsp;S. Gapienko, 2012), saffron milk caps prefer
          open, well-lit spots — not dark thickets, but bright clearings, edges
          and cuttings.
        </p>
        <p className="mb-6 leading-relaxed text-white/80">
          <strong className="text-white">The pine king bolete</strong>{" "}
          (<em>Boletus pinophilus</em>) is a dark-capped beauty with a
          reddish-brown cap. It prefers old pine woods with a mossy floor. It
          grows in small groups, often on higher ground. Unlike its birch
          counterpart, the pine king bolete chooses drier and more acidic spots.
        </p>
        <p className="mb-12 leading-relaxed text-white/80">
          <strong className="text-white">Bay boletes</strong> and{" "}
          <strong className="text-white">man-on-horseback</strong> round out the
          coniferous basket. The bay bolete loves pine stands with bilberry,
          while the man-on-horseback (<em>Tricholoma equestre</em>) is one of the
          few that can be gathered even at the end of October, when most
          mushrooms have already gone. It hides in the coniferous litter, and
          finding it without experience is not easy. Spruce stands are also home
          to the{" "}
          <strong className="text-white">slimy spike-cap</strong> — an
          unassuming mushroom, but edible and tasty after proper preparation.
        </p>

        {/* === Section 3: Deciduous === */}
        <h2 className="mb-4 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Deciduous forest — home of birch boletes and&nbsp;milk caps
        </h2>
        <p className="mb-6 leading-relaxed text-white/80">
          Deciduous forests — birch groves, oak woods, aspen stands — are a
          completely different world. The soil here is neutral or slightly
          acidic (pH 5.0–7.0), the litter is loose and rich in humus. Light
          penetrates the canopy better than in a spruce wood: broadleaf trees
          create a dynamic mosaic of light and shade. All of this forms the ideal
          environment for its own group of mycorrhizal fungi.
        </p>
        <p className="mb-6 leading-relaxed text-white/80">
          <strong className="text-white">The birch bolete</strong>{" "}
          (<em>Leccinum scabrum</em>) is the classic{" "}
          <strong className="text-white">mushroom under birch</strong>. The name
          speaks for itself: it won’t grow without birch. Birch boletes are found
          in pure birch groves, on the verges of forest roads, and in young birch
          stands. They love damp, slightly boggy spots — that is where the
          mycelium gets enough water. The season is long: from June through
          October, peaking in August.
        </p>
        <p className="mb-6 leading-relaxed text-white/80">
          <strong className="text-white">The aspen bolete</strong>{" "}
          (<em>Leccinum aurantiacum</em>) is another king of the deciduous
          forest. Despite its name, it forms mycorrhiza not only with aspen but
          also with birch, poplar and willow. The aspen bolete is large, fleshy
          and fast-growing. Experienced foragers know: if you find one, look
          nearby — they often grow in &ldquo;families&rdquo; of 3–7. It prefers
          damp spots with tall grass at the boundary between forest and clearing.
        </p>
        <p className="mb-6 leading-relaxed text-white/80">
          <strong className="text-white">Milk caps</strong> are inhabitants of
          birch and birch-aspen forests. The true milk cap{" "}
          (<em>Lactarius resimus</em>) forms mycorrhiza with birch and is found
          in pure birch groves with a litter of last year’s leaves. The aspen
          milk cap{" "}
          (<em>Lactarius controversus</em>) grows under aspens and poplars. Milk
          caps hide: you literally have to dig them out from under the layer of
          leaves. According to the Department of Mycology and Algology at Moscow
          State University, the true milk cap forms mycorrhiza only with birch on
          soils with a sufficient calcium content.
        </p>
        <p className="mb-12 leading-relaxed text-white/80">
          <strong className="text-white">Woolly milk caps</strong> — both pink
          and white — are also &ldquo;birch&rdquo; mushrooms. The pink woolly
          milk cap{" "}
          (<em>Lactarius torminosus</em>) appears in large numbers in birch
          forests from late July. It is less capricious than the true milk cap
          and often grows in huge patches — the main thing is that there’s a
          birch nearby and enough moisture. In oak woods, look for the{" "}
          <strong className="text-white">oak king bolete</strong>{" "}
          (<em>Boletus reticulatus</em>) with its pale cap and netted stem, as
          well as the <strong className="text-white">oak bolete</strong>{" "}
          — a robust mushroom with a dark cap and flesh that reddens when cut.
        </p>

        {/* === Section 4: Mixed === */}
        <h2 className="mb-4 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Mixed forest — the ideal choice for the&nbsp;forager
        </h2>
        <p className="mb-6 leading-relaxed text-white/80">
          If you want maximum species diversity in a single basket, head for a{" "}
          <strong className="text-white">mixed
          forest</strong>. There, pine stands beside birch, spruce beside aspen,
          and oak turns up at the edges. Each tree has &ldquo;brought along&rdquo;
          its own set of mycorrhizal partners, and as a result, a single hectare
          of mixed forest can hold mushrooms that would never have ended up side
          by side in a pure coniferous or deciduous forest.
        </p>
        <p className="mb-6 leading-relaxed text-white/80">
          In ecology this is called the{" "}
          <strong className="text-white">edge effect</strong> — at the boundary
          of two ecosystems, species diversity is always higher than inside
          either one. A study in the journal{" "}
          <em>Forest Ecology and Management</em> (2019) confirmed that in
          transition zones between coniferous and deciduous forest, the number of
          macrofungi species is 35–45% higher than in pure stands. For the
          forager, these boundaries are a genuine El Dorado.
        </p>
        <p className="mb-6 leading-relaxed text-white/80">
          The practical takeaway is simple. In a mixed forest you can find, in a
          single walk, slippery jacks under a pine, birch boletes near a birch,
          king boletes in a spruce stand and woolly milk caps at a birch edge.
          It’s harder to leave such a forest empty-handed — there is always at
          least one species for which conditions are right just now.
        </p>
        <p className="mb-12 leading-relaxed text-white/80">
          Especially prized are mixed forests dominated by pine and birch on
          moderately moist sandy soils — this is the typical landscape of central
          Belarus and central Russia. As specialists at the Forest Institute of
          the National Academy of Sciences of Belarus point out, it is precisely
          such forests that yield the largest harvest of edible mushrooms per
          hectare. People call such places &ldquo;a forest made for mushrooms.&rdquo;
        </p>

        {/* === Section 5: Compatibility Table === */}
        <h2 className="mb-4 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Mushrooms and trees: a compatibility table
        </h2>
        <p className="mb-6 leading-relaxed text-white/80">
          Below is a summary table that’s handy to save before heading into the
          forest. It shows which mushrooms form mycorrhiza with which trees. When
          you spot a particular tree species in the forest, you check the table
          and know exactly what to look for underfoot.
        </p>

        <div className="mb-8 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/20">
                <th className="px-4 py-3 text-left font-semibold text-white">
                  Tree
                </th>
                <th className="px-4 py-3 text-left font-semibold text-white">
                  Partner mushrooms
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPATIBILITY_TABLE.map((row) => (
                <tr key={row.tree} className="border-b border-white/10">
                  <td className="px-4 py-3 font-medium text-emerald-400">
                    {row.tree}
                  </td>
                  <td className="px-4 py-3 text-white/80">{row.mushrooms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mb-12 text-sm leading-relaxed text-white/50">
          * The table is compiled from the reference guide &ldquo;Mushrooms of
          Belarus&rdquo; (O.&nbsp;S. Gapienko, 2012) and I.&nbsp;I. Sidorova’s
          textbook &ldquo;Mycology&rdquo; (Moscow State University, 2020). The
          most common species are listed; the full range of mycorrhizal
          associations is considerably wider.
        </p>

        {/* === Section 6: How to Find a Spot === */}
        <h2 className="mb-4 mt-12 text-2xl font-bold text-white sm:text-3xl">
          How to find a mushroom spot in the&nbsp;forest
        </h2>
        <p className="mb-6 leading-relaxed text-white/80">
          Knowing <strong className="text-white">where to look for
          mushrooms</strong> by forest type is only half the job. The other half
          is being able to read the microrelief within the forest itself.
          Mushrooms are distributed unevenly: some patches are literally strewn
          with fruiting bodies, while a hundred meters away there isn’t a single
          one. Here’s what to watch for.
        </p>
        <p className="mb-6 leading-relaxed text-white/80">
          <strong className="text-white">Woodland edges and forest margins.</strong>{" "}
          The boundary between forest and open space is a classic mushroom spot.
          There’s more light here, the soil warms up better, and after rain the
          moisture lingers longer than in an open field. The edge effect works
          here too: at a woodland margin, the forest and meadow ecosystems meet,
          creating additional niches.
        </p>
        <p className="mb-6 leading-relaxed text-white/80">
          <strong className="text-white">Cuttings and forest roads.</strong>{" "}
          Along cuttings, conditions resemble those at woodland edges: more
          light, more warmth. Slippery jacks, for example, are especially fond of
          growing along dirt forest roads in pine plantings. The verges of paths
          are also a good spot, especially if the path runs along the boundary of
          a coniferous and a deciduous area.
        </p>
        <p className="mb-6 leading-relaxed text-white/80">
          <strong className="text-white">Moss and bilberry.</strong>{" "}
          A moss cover is a reliable companion of many mushrooms. Moss retains
          moisture, creates a stable microclimate and protects the mycelium from
          drying out. King boletes and chanterelles often grow in moss. Bilberry
          in a pine forest is another marker: if the bilberry bushes are fruiting
          abundantly, then conditions are right for the mycelium too.
        </p>
        <p className="mb-6 leading-relaxed text-white/80">
          <strong className="text-white">Low rises and
          slopes.</strong>{" "}
          Mushrooms don’t like standing water. Gentle slopes and low hills in the
          forest provide good drainage — moisture is present, but it doesn’t
          pool. King boletes are often found on exactly these
          &ldquo;knolls,&rdquo; especially if they’re covered with moss.
          Low-lying spots with stagnant water are, conversely, the domain of only
          a few species (slimy spike-caps, some russulas).
        </p>
        <p className="mb-12 leading-relaxed text-white/80">
          <strong className="text-white">Landmark trees.</strong>{" "}
          If you find a lone birch in the middle of a pine wood, be sure to
          examine a circle 5–10 meters in radius around it: birch boletes may
          grow there that you won’t find anywhere else in that forest. The same
          goes for lone pines in a deciduous forest — you may find slippery jacks
          beneath them. Such trees are points of anomalous diversity, and
          experienced foragers remember their coordinates for years.
        </p>

        {/* === Section 7: Technology === */}
        <h2 className="mb-4 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Finding a forest with the help of technology
        </h2>
        <p className="mb-6 leading-relaxed text-white/80">
          So, we’ve established: to find the mushrooms you want, you need to find
          the right forest — with the right trees, suitable soil and terrain. But
          how do you choose a forest in advance, especially if you’re looking for
          a new spot? In the past, all you could do was drive out on a hunch or
          rely on tips from friends.
        </p>
        <p className="mb-6 leading-relaxed text-white/80">
          The &ldquo;Forest Search&rdquo; feature in{" "}
          <Link
            href="/"
            className="text-emerald-400 underline decoration-emerald-400/30 underline-offset-2 transition-colors hover:text-emerald-300"
          >
            SkyForest
          </Link>{" "}
          analyzes satellite data and determines the forest type, tree species
          and forest cover for any point on the map. You can find a suitable
          forest without leaving home: you specify an area, and the system shows
          where there’s a pine wood, where a birch grove, and where a mixed
          forest with the combination of species you need. Knowing the
          mushroom-and-tree compatibility table, you know exactly what to look for
          in each particular forest.
        </p>
        <p className="mb-12 leading-relaxed text-white/80">
          And if you combine forest-type data with weather monitoring —
          precipitation, temperature, humidity — the picture becomes complete.
          You not only know <em>where</em> to go, but also{" "}
          <em>when</em>. That is exactly why we’re building SkyForest: so that
          every mushroom hunt ends with a full basket.
        </p>

        {/* === FAQ === */}
        <h2 className="mb-6 mt-12 text-2xl font-bold text-white sm:text-3xl">
          Frequently asked questions
        </h2>
        <div className="mb-12 space-y-6">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-white/5 p-5"
            >
              <h3 className="mb-2 font-semibold text-white">{item.q}</h3>
              <p className="leading-relaxed text-white/70">{item.a}</p>
            </div>
          ))}
        </div>

        {/* === CTA === */}
        <div className="my-16 rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center backdrop-blur-xl sm:px-10 sm:py-14">
          <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">
            Find your mushroom forest
          </h2>
          <p className="mb-8 leading-relaxed text-white/70">
            SkyForest determines the forest type, tree species and weather
            conditions for any point on the map. Choose a forest to match the
            mushrooms you want — and head out on your mushroom hunt with
            confidence.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 hover:shadow-xl"
          >
            Try SkyForest →
          </Link>
        </div>

        <RelatedArticles currentSlug="v-kakom-lesu-iskat-griby" />
      </article>
    </>
  );
}
