export default {
  home: {
    mapLoading: "Loading map...",
    title: "Home",
    subtitle:
      "See when the weather is ideal for mushrooms. Add a location, save a successful day — the system will tell you when conditions repeat.",
    addLocation: "Add location",
    addBestDay: "Add mushroom day",
    cardWeatherTitle: "Weather",
    cardWeatherDesc:
      "See if the weather was right for mushrooms. Check rain, temperature, and humidity for any period",
    cardWeatherBlocked:
      "To check the weather, first mark your mushroom spot on the map. It’s free and takes about 30 seconds.",
    cardCompareTitle: "Weather monitoring",
    cardCompareDesc:
      "The system watches the weather and notifies you when conditions match your best mushroom days",
    cardCompareBlocked:
      "To enable monitoring, first add a successful mushroom day. The system will remember the weather and look for similar conditions.",
    cardForestTitle: "Forest search",
    cardForestDesc:
      "Find new spots by forest type, tree species, and satellite data",
    cardMarketTitle: "Marketplace",
    cardMarketDesc:
      "Buy verified spots from others or sell your own finds",
    mainBadge: "Featured",
    bestDaysTitle: "My mushroom days",
    bestDaysDesc:
      "A mushroom day links a location, a successful pick date, and a 14-day weather “fingerprint”. It’s your reference: the system compares current weather to this data and alerts you when conditions repeat.",
    bestDaysAdd: "Add mushroom day",
    bestDaysAddShort: "Add",
    collapse: "Show less",
    showAllDays: "Show all {count} mushroom days",
    locationsTitle: "My locations",
    locationsDesc:
      "Your mushroom spots on the map. Each location has weather checks, mushroom days, and monitoring. Click to view or edit.",
    locationsAdd: "Add",
    diffEasy: "Easy",
    diffMedium: "Medium",
    diffHard: "Hard",
    tokensTitle: "Tokens",
    topUp: "Top up",
    topUpShort: "+",
    lastOps: "Recent activity",
  },
  onboarding: {
    title: "Getting started",
    subtitle: "Three simple steps to put SkyForest to work for you",
    stepPrefix: "Step",
    start: "Start",
    free: "Free",
    step1Title: "Add a location",
    step1Desc: "Mark on the map where you usually pick mushrooms.",
    step2Title: "Add a mushroom day",
    step2Desc:
      "Remember a successful harvest date. We’ll load the weather for that period (2 tokens). Saving is free.",
    step2Cost: "2 tokens",
    step3Title: "Enable monitoring",
    step3Desc:
      "The system watches the weather and notifies you when conditions repeat.",
    step3Cost: "6 tokens",
  },
} as const;
