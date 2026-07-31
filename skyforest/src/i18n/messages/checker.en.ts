/**
 * Mushroom Checker — «Soft Product» redesign.
 *
 * Отдельный неймспейс: экраны флейвора переписаны целиком, а старые ключи
 * (`identify.*`, `auth.*`, `account.*`) продолжают обслуживать SkyForest и
 * WayBack без изменений.
 */

/**
 * Тексты про задачу приложения для общих мест (splash, экран блокировки,
 * метаданные, документы). Попадают в словарь как `flavor.checker.*` —
 * см. src/lib/useFlavorBrand.ts и src/i18n/messages/en.ts.
 */
export const checkerBrand = {
  tagline: "Check your find",
  metaDescription:
    "Mushroom Checker identifies mushrooms from a photo: the species with a confidence score, dangerous lookalikes and a self-check list.",
  authSubtitle: "Sign in to identify mushrooms from a photo.",
  accountSubtitle: "Profile, subscription and account settings.",
  accountDeleteHint:
    "Deleting your account is irreversible: your profile and identification history will be removed. A store subscription has to be cancelled separately in App Store or Google Play.",
  lockBody: "Unlock with Face ID to open Mushroom Checker.",
  deletedItems: [
    "Profile (name and email address)",
    "Photos you sent for identification and their results",
    "Push notification tokens of your devices",
    "Subscription records kept on our side",
  ],
} as const;

export default {
  /** Нижнее меню: четыре вкладки («Распознать» по центру) и кнопка панели «Ещё». */
  nav: {
    tabBar: "Main navigation",
    identify: "Identify",
    history: "History",
    quests: "Quests",
    questsNew: "New quest progress",
    account: "Account",
    more: "More",
    openMore: "Open more",
    back: "Back",
  },

  /** Панель «Ещё» — то, что не поместилось во вкладки. */
  menu: {
    brandShort: "Mushroom Checker",
    /** Имя ссылки-марки в шапке: она ведёт на экран распознавания. */
    brandHome: "Mushroom Checker — go to Identify",
    close: "Close",
    moreTitle: "More",
    subscription: "Subscription",
    premiumPill: "PREMIUM",
    shareApp: "Share the app",
    shareAppHint: "Send friends a link",
    /** Текст в системном листе «поделиться» — рядом со ссылкой на сайт. */
    shareAppText: "Mushroom Checker — identify a mushroom from a photo",
    theme: "Appearance",
    themeDark: "Dark",
    themeLight: "Light",
    language: "Language",
    support: "Support",
    otherApps: "OTHER SKYFOREST APPS",
    waybackName: "WayBack",
    waybackHint: "Find your way back to where you started",
    skyforestName: "SkyForest",
    skyforestHint: "Forest map, mushroom forecast and more",
    logout: "Log out",
  },

  home: {
    titleLine1: "Found a mushroom?",
    titleLine2: "Let's check it!",
    quotaTrialLeft: "identifications left in your free trial, out of {limit}",
    quotaTrialEnded: "Trial identifications used up — subscribe to continue",
    quotaNoSub:
      "{days, plural, one {day} other {days}} free — tap to start your trial",
    takePhoto: "Take photo",
    fromGallery: "From gallery",
    /** Предупреждение над кнопками — видно без прокрутки, это требование. */
    safetyTitle: "Never eat a mushroom based on the result.",
    safetyBody:
      "The app identifies from a photo and can be wrong. It is not a substitute for an expert.",
    /** Полоса подсказок внизу главного экрана и лист с подробностями. */
    tipsStrip: "How to photograph a mushroom",
    tipsTitle: "How to photograph a mushroom",
    tipsIntro:
      "Five things that decide whether the answer is right. Half a minute of work.",
    tipsClose: "Got it",
    tips: [
      {
        title: "The whole cap, from above",
        body: "Hold the camera straight above the mushroom so the entire top of the cap fits in the frame. Its colour and shape are the first thing the model looks at.",
      },
      {
        title: "The stem all the way down",
        body: "Brush the leaves aside and show the stem to the very bottom. A bulb, a sac or a ring down there is what separates deadly species from edible ones.",
      },
      {
        title: "The underside of the cap",
        body: "Turn the mushroom over and photograph what is under the cap — plates, tubes or spines. It is the single most telling feature.",
      },
      {
        title: "Daylight, no flash",
        body: "Shoot in natural light. Flash washes the colour out, and colour is often the whole difference between two species.",
      },
      {
        title: "One mushroom, close up",
        body: "One specimen filling most of the frame, in focus. A photo of the whole clearing gives the model nothing to work with.",
      },
    ],
  },

  /** Вкладка «История»: топ-1 результат каждого распознавания. */
  history: {
    title: "History",
    /**
     * Ветка `=0` говорит, для чего вкладка, а не «находок нет»: заголовок
     * пустой карточки ниже произносит это и так, и две одинаковые фразы
     * подряд читались как ошибка.
     */
    subtitle:
      "{count, plural, =0 {Every identification you make lands here} one {# identification · top match} other {# identifications · the top match of each}}",
    subtitleLoading: "Loading your finds…",
    readMoreOf: "{name} — read about the species",
    emptyTitle: "No finds yet",
    emptyBody:
      "Identify a mushroom from a photo and it shows up here — with your photo, the date and a link to read about the species.",
    emptyCta: "Identify a mushroom",
    note: "Every entry is the top match of one identification. Links go to the Wikipedia or GBIF page from that result; if the result had neither, to an iNaturalist search by the scientific name.",
    failedTitle: "Could not load the history",
    failedBody: "Check the connection and try again — nothing is lost.",
    retry: "Try again",
  },

  /** Вкладка «Квесты»: коллекция из трёх уровней по пять видов. */
  quests: {
    title: "Quests",
    subtitle: "Fifteen species to photograph and identify.",
    rankLabel: "YOUR RANK",
    /** Ранги аккаунта — пороги в src/lib/checker/achievements.ts. */
    ranks: {
      start: "Not started",
      spotter: "Spotter",
      naturalist: "Field naturalist",
      mycophile: "Mycophile",
      master: "Master identifier",
    },
    toNextRank:
      "{count, plural, one {# more species} other {# more species}} to {rank}",
    rankMax: "Every species identified — nothing left to prove.",
    nextUp: "NEXT UP",
    takePhoto: "Take photo",
    readMore: "Read about the species",
    shareFind: "Share this find",
    shareProgress: "Share progress",
    /** Подписи к системному листу «поделиться». Ссылка ведёт на нашу карточку. */
    shareTextFind: "{name} — identified with Mushroom Checker",
    shareTextLevel:
      "Level {level} complete in Mushroom Checker — {found} of {total} species identified",
    shareTextRank:
      "{rank} in Mushroom Checker — {found} of {total} species identified",
    close: "Close",
    whereLabel: "WHERE AND WHEN",
    lookalikeTitle: "Dangerous lookalike",
    openFound: "{name} — identified. Open details",
    openTarget: "{name} — not identified yet. Open details",
    safetyTitle: "Never eat a mushroom based on the result.",
    safetyBody:
      "Quests are about photographing and identifying, not about filling a basket.",
    levelDone: "Complete · {date}",
    foundLabel: "Identified {date}",
    allDoneTitle: "All 15 species identified",
    allDoneBody:
      "Every level is complete. Keep identifying — history keeps all of your finds.",
    note: "Progress comes from your identification history: a species counts when it comes out first. Levels are not locked — a find counts at any level.",
    failedTitle: "Could not load your progress",
    failedBody: "Check the connection and try again — nothing is lost.",
    retry: "Try again",
    levels: {
      level1: {
        title: "Common finds",
        hint: "Parks, roadsides and forest edges — these turn up first.",
      },
      level2: {
        title: "Into the woods",
        hint: "The right forest and the right season, but well within reach.",
      },
      level3: {
        title: "Rare shots",
        hint: "Own season, own place and a little luck.",
      },
    },
    /** Названия целей квестов. Латынь берётся из src/lib/checker/quests.ts. */
    species: {
      cantharellusCibarius: "Golden chanterelle",
      boletusReticulatus: "Summer bolete",
      armillariaMellea: "Honey fungus",
      suillusLuteus: "Slippery jack",
      russulaAeruginea: "Green brittlegill",
      macrolepiotaProcera: "Parasol mushroom",
      leccinumScabrum: "Brown birch bolete",
      lactariusDeliciosus: "Saffron milkcap",
      leccinumVersipelle: "Orange birch bolete",
      tricholomaEquestre: "Yellow knight",
      morchellaEsculenta: "Common morel",
      boletusPinophilus: "Pine bolete",
      craterellusCornucopioides: "Black trumpet",
      leccinumAlbostipitatum: "White-stemmed orange bolete",
      flammulinaVelutipes: "Velvet shank",
    },
    /**
     * «Где и когда искать» — сезон и место, без указаний по сбору. Строка
     * показывается в карточке ближайшей цели и в шите вида.
     */
    where: {
      cantharellusCibarius:
        "July–October, moss and litter in conifer and mixed woods",
      boletusReticulatus: "June–September, oak and open broadleaf woods",
      armillariaMellea:
        "August–November, stumps and roots of broadleaf trees",
      suillusLuteus: "July–October, young pine stands and their edges",
      russulaAeruginea: "July–September, under birches in mixed woods",
      macrolepiotaProcera: "July–October, clearings, meadows and forest edges",
      leccinumScabrum: "June–October, birch woods and undergrowth",
      lactariusDeliciosus: "August–October, young pines and spruces",
      leccinumVersipelle: "July–October, birches in damp spots",
      tricholomaEquestre: "September–November, sandy pine forests",
      morchellaEsculenta: "April–May, floodplains, orchards and burned ground",
      boletusPinophilus: "June–October, pine forests on sandy soil",
      craterellusCornucopioides: "August–October, shady broadleaf woods",
      leccinumAlbostipitatum: "July–September, aspen groves",
      flammulinaVelutipes: "November–March, weakened broadleaf trees",
    },
    /**
     * Предупреждения для видов с флагом `warning` в конфиге квестов. Полный
     * текст показывается в шите вида и в результате распознавания, а на плитке
     * стоит амбровый значок — цель с опасным двойником нельзя показать без него.
     */
    warnings: {
      cantharellusCibarius:
        "Confused with the poisonous jack-o'-lantern (Omphalotus): it has true gills, the chanterelle only blunt folds.",
      armillariaMellea:
        "The deadly funeral bell (Galerina marginata) grows on the same stumps and looks alike.",
      russulaAeruginea:
        "A green cap is easy to confuse with the death cap (Amanita phalloides), which is deadly.",
      macrolepiotaProcera:
        "In North America it is confused with the green-spored parasol (Chlorophyllum molybdites) — the most common mushroom poisoning in the USA.",
      tricholomaEquestre:
        "After cases of rhabdomyolysis it is no longer considered unconditionally edible in many countries.",
      morchellaEsculenta:
        "Confused with the false morel (Gyromitra esculenta). Raw morels are poisonous.",
      flammulinaVelutipes:
        "The deadly funeral bell (Galerina marginata) fruits in winter on the same wood.",
    },
  },

  preview: {
    title: "Ready to identify",
    lighting: "Good lighting detected",
    beforeTitle: "Before you send",
    beforeBody:
      "One identification will be used from your trial allowance — only if we return a result.",
    beforeBodyUnlimited:
      "Your subscription has no limits — identify as many finds as you like.",
    identify: "Identify",
    counter: "· {used} of {limit}",
    retake: "Retake",
    gallery: "Gallery",
  },

  confirm: {
    title: "Identify this mushroom?",
    body: "We only count the identification if the analysis returns a result. Errors and “not a mushroom” are free.",
    thisScan: "This scan",
    leftInTrial: "Left in trial",
    afterScan: "After scan",
    cta: "Identify",
    cancel: "Cancel",
  },

  analyzing: {
    title: "Analyzing…",
    body: "Comparing your photo with reference species. This usually takes 5–15 seconds.",
    step1: "Photo uploaded",
    step2: "Features extracted",
    step3: "Matching against databases",
    cancel: "Cancel",
    photo: "PHOTO",
  },

  result: {
    back: "Back to home",
    /** Карточка закрытого квеста — только на новой находке. */
    questDone: "Quest complete — added to your collection",
    levelDone: "Level {level} complete",
    questProgress: "{found} of {total} species",
    rankUp: "new rank: {rank}",
    openQuests: "Quests",
    topMatch: "TOP MATCH · {pct}",
    lowConfidence:
      "Confidence is low — treat every match below as a guess, not an answer.",
    possibleMatches: "Possible matches",
    referenceNote:
      "Reference photos are illustrative and may differ from your specimen.",
    aboutTitle: "About the species",
    family: "Family",
    genus: "Genus",
    habitat: "Habitat",
    lookalikesTitle: "Dangerous lookalikes",
    checkTitle: "Check yourself",
    disclaimer:
      "Identification is probabilistic and provided for reference only. Never eat a wild mushroom based on this app — confirm with an experienced forager or mycologist.",
    newPhoto: "New photo",
    fromGallery: "From gallery",
    share: "Share result",
    sourceChip: "Source: {source}",
    toxicChip: "Toxic",
    edibleChip: "Not marked as toxic",
    moreLink: "Learn more",
  },

  errors: {
    nothingCounted: "Nothing was counted.",
    notMushroomTitle: "That doesn't look like a mushroom",
    notMushroomBody:
      "Nothing was counted. Try a closer shot of the whole fruiting body.",
    noResultTitle: "No confident match",
    noResultBody:
      "Nothing was counted. Shoot in daylight, in focus, with the cap from above and the gills from below.",
    limitTitle: "Trial limit reached",
    limitBody:
      "You've used all {limit} identifications of the free trial. A subscription removes the limit.",
    noSubTitle: "Subscription required",
    noSubBody:
      "Start a {days}-day free trial to identify mushrooms — {limit} identifications are included.",
    limitCta: "See subscription options",
    timeoutTitle: "Analysis took too long",
    timeoutBody: "Connection timed out after 35 seconds. Nothing was counted.",
    retry: "Try again",
    tooLargeTitle: "File is too large",
    tooLargeBody: "Maximum 10 MB, JPEG or PNG. Shoot again from the app camera.",
    unsupportedTitle: "Unsupported format",
    unsupportedBody: "Use JPEG, PNG or WebP — up to 10 MB. Nothing was counted.",
    unavailableTitle: "Recognition is unavailable",
    unavailableBody:
      "The service is temporarily down. Nothing was counted — please try again later.",
    genericTitle: "Something went wrong",
    genericBody: "Nothing was counted. Please try again in a moment.",
    captureTitle: "Could not get the photo",
    captureBody: "Try again, or pick a photo from the gallery instead.",
    cameraDeniedTitle: "Camera access is off",
    cameraDeniedBody:
      "Allow the camera for Mushroom Checker in Settings › Privacy › Camera, then take the photo again.",
    photosDeniedTitle: "Photo library access is off",
    photosDeniedBody:
      "Allow photos for Mushroom Checker in Settings › Privacy › Photos, then pick the photo again.",
    captureDetail: "Details: {reason}",
  },

  paywall: {
    close: "Close",
    title: "Mushroom Checker Premium",
    subtitle:
      "Unlimited identifications, full species data and lookalike warnings.",
    weekly: "Weekly",
    yearly: "Yearly",
    yearlyBadge: "−{percent}%",
    trialBadge: "{days}-DAY FREE TRIAL",
    perYear: "/ year",
    perWeek: "/ week",
    perWeekHint: "· {price} per week",
    feature1: "Unlimited identifications",
    feature2: "Dangerous lookalikes & toxicity notes",
    feature3: "Full taxonomy and habitat data",
    trialNote:
      "The free trial covers {limit} identifications over {days} days. After it starts billing, identifications are unlimited.",
    autoRenewYear:
      "{days} days free, then auto-renews at {price}/year. Cancel anytime in the {store}.",
    autoRenewWeek:
      "{days} days free, then auto-renews at {price}/week. Cancel anytime in the {store}.",
    cta: "Start free trial",
    ctaBusy: "Opening the {store}…",
    eula: "Terms of Use (EULA)",
    privacy: "Privacy Policy",
    billed: "Billed through your {store} account.",
    restore: "Restore purchase",
    restoring: "Restoring…",
    restoreFailed: "Nothing to restore on this account.",
    purchaseError: "Purchase could not be completed. Please try again.",
  },

  subscription: {
    title: "Subscription",
    back: "Back",
    activeTitle: "Premium is active",
    activeBody: "{plan} plan · renews {date}. Managed through your {store} account.",
    trialTitle: "Free trial is active",
    trialBody:
      "{plan} plan · billing starts {date}. Managed through your {store} account.",
    planWeekly: "Weekly",
    planYearly: "Yearly",
    quotaUnlimited: "Unlimited identifications",
    quotaUnlimitedNote: "no limit at all",
    quotaLine: "of {limit} trial identifications left",
    quotaReset: "trial ends {date}",
    manage: "Manage subscription",
    canceledTitle: "State · canceled",
    canceledBody:
      "Premium stays active until {date}, then identification stops. Resubscribe anytime.",
    webTitle: "Subscribe in the mobile app",
    webBody:
      "Purchases are handled by the App Store and Google Play, so the plan can only be started from the Mushroom Checker app.",
    appStore: "App Store",
    googlePlay: "Google Play",
  },

  account: {
    title: "My account",
    back: "Back",
    premiumPlan: "Premium · {plan}",
    trialPlan: "Free trial · {plan}",
    premiumWeekly: "Weekly",
    premiumYearly: "Yearly",
    idsUnlimited: "Unlimited identifications",
    idsTrialLeft: "{left} of {limit} trial identifications left",
    noSubscription: "No active subscription",
    noSubscriptionHint: "Start a {days}-day free trial",
    manage: "Manage",
    subscribe: "Subscribe",
    achievements: "ACHIEVEMENTS",
    achievementsHint: "{found} of {total} species identified",
    displayName: "Display name",
    displayNameEmpty: "Not set",
    changePassword: "Change password",
    appLock: "App Lock",
    appLockHint: "Biometrics on launch",
    twoFactor: "Two-factor auth",
    on: "On",
    off: "Off",
    eula: "Terms of Use (EULA)",
    privacy: "Privacy Policy",
    deleteAccount: "Delete account",
    logout: "Log out",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
  },

  deleteAccount: {
    scheduledTitle: "Deletion is scheduled",
    scheduledBody: "Your account will be removed on {date}. Sign in before then to keep it.",
    undo: "Keep my account",
    title: "Delete your account?",
    body: "Your profile, identification history and subscription record will be removed. You have <days>14 days</days> to undo — just sign in again.",
    storeNote:
      "An active store subscription is not canceled automatically — cancel it in the {store}.",
    confirmLabel: "Type your email to confirm",
    cta: "Delete account",
    keep: "Keep my account",
    mismatch: "The email doesn't match your account.",
    failed: "Could not delete the account. Please try again.",
  },

  auth: {
    signInTitle: "Welcome back",
    signInSubtitle: "Sign in to identify mushrooms from a photo.",
    google: "Continue with Google",
    apple: "Continue with Apple",
    orWithEmail: "OR WITH EMAIL",
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Password",
    minSix: "min 6",
    forgot: "Forgot password?",
    signInCta: "Sign in",
    noAccount: "No account?",
    createAccount: "Create account",

    backToSignIn: "Back to sign in",
    signIn: "Sign in",
    registerTitle: "Create account",
    repeatPassword: "Repeat password",
    consent: "I agree to the {eula} and the {privacy}.",
    consentRequired: "Please accept the terms to continue.",
    registerCta: "Create account",
    confirmEmailNote: "We'll email you a confirmation link.",
    passwordsDiffer: "Passwords do not match.",

    forgotTitle: "Reset your password",
    forgotBody: "Enter the email you signed up with — we'll send a reset link.",
    sendLink: "Send reset link",
    sentTitle: "Check your inbox",
    sentBody: "We sent a link to {email}. It expires in 60 minutes.",
    resend: "Resend email",

    resetTitle: "Set a new password",
    newPassword: "New password",
    repeatNewPassword: "Repeat new password",
    savePassword: "Save password",
    invalidLinkState: "STATE · INVALID / EXPIRED LINK",
    invalidTitle: "Link is no longer valid",
    invalidBody:
      "This reset link has expired or was already used. Request a new one — it takes a second.",
    requestNewLink: "Request new link",
    passwordSaved: "Password updated. Signing you in…",

    mfaTitle: "Two-factor authentication",
    mfaBody: "Enter the 6-digit code from your authenticator app.",
    mfaCode: "Code",
    mfaCta: "Confirm",
  },
} as const;
