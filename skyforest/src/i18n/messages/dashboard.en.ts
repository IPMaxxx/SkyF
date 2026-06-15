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
    locationsSearch: "Search by name...",
    locationsEmpty: "No matches",
    diffEasy: "Easy",
    diffMedium: "Medium",
    diffHard: "Hard",
    tokensTitle: "Tokens",
    topUp: "Top up",
    topUpShort: "+",
    lastOps: "Recent activity",
    emptyWelcomeTitle: "Welcome to SkyForest",
    emptyWelcomeBody:
      "Set things up in 2 minutes: add your mushroom spot and save a successful day. After that, the system watches the weather for you.",
    blockedBadgeNeedsLocation: "Requires a location",
    blockedBadgeNeedsBestDay: "Requires a mushroom day",
  },
  mushroomBot: {
    title: "Mushroom ID bot",
    subtitle:
      "Identify mushrooms by photo in Telegram. New users get 3 free IDs, then 1 ID = 1 token.",
    balanceLabel: "IDs in the bot",
    statusLinked: "Telegram linked",
    statusNotLinked: "Telegram not linked",
    linkTitle: "1. Link Telegram",
    linkDesc:
      "Generate a code and send it to the bot to link your Telegram with this account.",
    generateCode: "Get a linking code",
    generating: "Generating…",
    codeTitle: "Your linking code",
    codeInstr: "Send to the bot: ",
    codeExpires: "The code is valid for 15 minutes.",
    openBot: "Open the bot in Telegram",
    relink: "Link a different Telegram",
    transferTitle: "2. Transfer tokens to the bot",
    transferDesc:
      "1 token = 1 ID. Only purchased tokens can be transferred (bonus tokens cannot).",
    available: "Tokens available: {amount}",
    amountPlaceholder: "Amount to transfer",
    transferBtn: "Transfer",
    transferring: "Transferring…",
    transferSuccess: "Transferred {amount} — now {balance} IDs in the bot",
    errorGeneric: "Something went wrong. Try again.",
    minAmount: "Minimum 1 token",
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
