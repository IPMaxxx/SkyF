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

  lookalikesTitle: "Dangerous lookalikes",
  lookalikesNote:
    "Check the features carefully — similar species are easy to confuse. Photos below.",

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
