/** /dashboard/identify — mushroom photo identification */
export default {
  back: "Back",
  title: "Identify a mushroom by photo",
  subtitle:
    "Take a photo of a mushroom — we'll show likely species with a confidence score and reference data from biological databases.",

  tipsTitle: "How to take a good photo",
  tips: [
    "Whole mushroom, in focus, in daylight",
    "Cap visible from above and gills/pores from below",
    "Stem and its base visible",
    "Several angles if possible",
  ],

  takePhoto: "Take photo",
  chooseFromGallery: "Choose from gallery",
  retake: "Retake",
  identify: "Identify",
  costSuffix: "1 token",

  confirmTitle: "Identify mushroom by photo",
  confirmDesc: "The photo will be sent for recognition. 1 token is charged only on a successful result.",

  analyzing: "Analyzing the photo…",
  analyzingHint: "This can take 5 to 30 seconds.",

  resultsTitle: "Possible matches",
  resultsHint: "In descending probability",
  lowConfidence:
    "Model confidence is low — the result is unreliable. Below are only possible similar species; do not rely on this result.",
  referencePhotosNote:
    "Below are reference photos of the species from biological databases for comparison (not your photo). Compare details carefully: similar species are easy to confuse.",
  matchLabel: "match",
  moreLink: "more about the species",
  toxicYes: "marked as toxic per {source}",
  toxicNo: "not marked as toxic per {source}",

  detailsTitle: "Details — {name}",
  taxonomyLabel: "Taxonomy",
  familyLabel: "fam.",
  genusLabel: "genus",

  habitatTitle: "Where to look?",
  habitatZone: "Zone",
  habitatWeather: "Weather for growth",

  // "Where to look?" reference by species/genus. Key is the stable code from the server.
  habitatData: {
    "Boletus edulis": {
      zone:
        "Coniferous and mixed forests; forms mycorrhiza with pine, spruce, oak and birch. " +
        "Usually on well-drained soil, along forest edges and paths and on warm slopes, " +
        "often near moss and blueberry.",
      weather:
        "Warm +15…+20 °C and high humidity; typically 5–10 days after warm rains. " +
        "Peak from mid-summer to mid-autumn.",
    },
    Boletus: {
      zone:
        "Coniferous and mixed forests; mycorrhiza with pine, spruce, oak, birch. " +
        "Edges, roadside paths, warm spots.",
      weather: "Warm +15…+20 °C, humid, a few days after rain; summer–autumn.",
    },
    Leccinum: {
      zone:
        "Birch and aspen and mixed forests; mycorrhiza with birch and aspen. " +
        "Edges, young plantings, roadsides.",
      weather: "Warm humid weather after rain; from early summer to autumn.",
    },
    Suillus: {
      zone: "Young pine forests and pine plantings; sandy and sandy-loam soils, edges.",
      weather: "After rain in warm weather; summer and especially autumn.",
    },
    Cantharellus: {
      zone:
        "Coniferous and deciduous forests; in moss, among grass and fallen leaves, on acidic " +
        "soils. Often in large groups.",
      weather: "Humid after rain, +15…+20 °C; from summer to autumn.",
    },
    Armillaria: {
      zone: "On stumps, deadwood and at the base of trunks (living and dead); in large clusters.",
      weather: "In autumn during cooling +10…+15 °C and high humidity after rain.",
    },
    Pleurotus: {
      zone: "On trunks and stumps of deciduous trees (poplar, willow, beech, aspen); in tiers.",
      weather: "Cool humid weather; late autumn and even winter thaws.",
    },
    Agaricus: {
      zone: "Open places: meadows, pastures, fields, roadsides, lawns; soil rich in organic matter.",
      weather: "Warm humid weather after rain; from summer to autumn.",
    },
    Macrolepiota: {
      zone: "Edges, glades, meadows, open woodland and pastures; in sunlit spots.",
      weather: "Warm humid weather; late summer and autumn.",
    },
    Russula: {
      zone: "A wide range of forests; mycorrhiza with conifers and broadleaf trees, in moss and grass.",
      weather: "Warm and humid; from summer to autumn.",
    },
    Lactarius: {
      zone: "Coniferous and deciduous forests; in moss, in grass, often in groups; mycorrhizal species.",
      weather: "Humid, moderate warmth; from mid-summer to autumn.",
    },
    Amanita: {
      zone:
        "Forests of various types; mycorrhiza with birch, pine, spruce, oak. On the ground, " +
        "singly and in groups.",
      weather: "Warm humid weather after rain; summer–autumn.",
    },
    Imleria: {
      zone: "Coniferous (especially pine) and mixed forests; mycorrhizal, on acidic soil and in moss.",
      weather: "Warm humid weather after rain; summer–autumn.",
    },
  },

  lookalikesTitle: "Dangerous lookalikes",
  lookalikesNote:
    "Check the features carefully — similar species are easy to confuse. Photos below.",

  // Lookalike captions by binomial (stable code from the server).
  lookalikeLabels: {
    "Tylopilus felleus": "bitter bolete — very bitter, inedible",
    "Rubroboletus satanas": "Satan's bolete — poisonous",
    "Hygrophoropsis aurantiaca": "false chanterelle",
    "Omphalotus olearius": "jack-o'-lantern mushroom — poisonous",
    "Chlorophyllum molybdites": "false parasol — causes poisoning",
    "Amanita phalloides": "death cap — deadly poisonous",
    "Amanita virosa": "destroying angel — deadly poisonous",
    "Galerina marginata": "funeral bell — deadly poisonous",
    "Hypholoma fasciculare": "sulphur tuft — poisonous",
    "Amanita muscaria": "fly agaric — poisonous",
    "Lactarius torminosus": "woolly milkcap — acrid milky latex",
    "Russula emetica": "the sickener — acrid",
  },

  checklistTitle: "What to check so you don't confuse them",
  checklist: [
    "Ring on the stem and volva (sac/bulb) at the base",
    "Colour of gills/pores and spore print",
    "Flesh colour change when cut or pressed",
    "Smell, place and manner of growth (on ground, on wood)",
  ],

  disclaimer:
    "Important. This is automatic recognition from a photo and it can be wrong. The service gives no edibility advice and is not a basis for collecting or eating mushrooms. Many edible and deadly poisonous mushrooms look alike. Never eat a mushroom identified from a photo alone. When in doubt, consult a mycologist.",

  newPhoto: "Identify another mushroom",
  toastCharged: "1 token charged",

  errNotMushroom:
    "There seems to be no mushroom in the photo, or it's hard to make out. Please send a clearer photo.",
  errNoResult:
    "Couldn't recognize a mushroom in this photo. Try shooting in daylight, in focus, with the cap from above and below.",
  errInsufficient: "Not enough tokens. Please top up your balance.",
  errTooLarge: "File is too large (max 10 MB).",
  errUnsupported: "Unsupported format. Use JPEG, PNG or WebP.",
  errTimeout: "Recognition took too long. Please try again.",
  errUnavailable: "Recognition is temporarily unavailable. Please try later.",
  errGeneric: "An error occurred while processing. Please try again a bit later.",
  errCapture:
    "Could not get the photo. Check camera and photo library permissions in Settings and try again.",
  topUp: "Top up",
} as const;
