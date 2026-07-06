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
  how2: "Keep this page open when you can: every couple of minutes we roughly mark your path on the map.",
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

  finishButton: "I'm out of the forest",
  finishConfirmTitle: "Finish the trip?",
  finishConfirmBody:
    "The entry point and the walked path will be deleted from this device.",
  finishConfirmYes: "Yes, finish",
  finishCancel: "Cancel",
} as const;
