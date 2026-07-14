/** /dashboard/track — return to the forest entry point */
export default {
  title: "Return to entry point",
  subtitle:
    "Mark where you entered the forest — we'll show the direction and distance back so you don't get lost.",

  startButton: "I'm entering the forest",
  starting: "Getting your location…",
  geoError:
    "Could not determine your location. Check GPS permission in settings and try again.",

  howTitle: "How it works",
  how1: "Tap the button at the forest edge — we'll remember your entry point.",
  how2: "While the app is open, we continuously record your path on the map. Points are not recorded in the background — those stretches are shown as a dashed line.",
  how3: "When it's time to head back, the arrow shows the direction and distance to the entry point.",
  offlineHint:
    "Works without internet: the map may not load, but the arrow and distance always work. Data is stored on this device only.",

  distanceLabel: "To entry point",
  durationLabel: "Time in forest",
  activeSince: "since {time}",
  waitingGps: "Determining your location…",

  compassEnable: "Enable compass",
  compassUnavailable:
    "Compass is unavailable on this device — use the direction text and the dashed line on the map.",
  courseHint:
    "Direction from GPS: arrow up means go straight, sideways means turn that way.",
  compassHint: "Direction from the phone compass — hold the phone flat.",
  moveToDetect: "Walk a few steps — we'll detect your direction of travel from GPS.",
  movementLegend:
    "Blue line — where you're heading, emerald dashes — to the entry point. Steer blue onto the dashes.",
  directionText: "Entry point: {dir}, {dist}",
  dir: {
    n: "north",
    ne: "north-east",
    e: "east",
    se: "south-east",
    s: "south",
    sw: "south-west",
    w: "west",
    nw: "north-west",
  },

  distM: "{value} m",
  distKm: "{value} km",

  anchorTitle: "Entry point",
  fitAll: "Show whole path",
  gapHint: "Dashed line — stretches with no recording (the app was in the background).",

  finishButton: "I'm out of the forest",
  finishConfirmTitle: "Finish the trip?",
  finishConfirmBody: "The trip will be saved to history and the active track will be cleared.",
  finishConfirmYes: "Yes, finish",
  finishCancel: "Cancel",

  autoName: "Track {date}",
  savedToast: "Trip saved to history",
  savedLocalToast: "Trip saved on this device",

  historyTitle: "History",
  historyLocalBadge: "on this device",
  historyDelete: "Delete track",
  historyDeleted: "Track deleted",
  historyDeleteError: "Could not delete the track. Please try again.",
} as const;
