/**
 * WayBack — редизайн «Widget Board».
 *
 * Отдельный неймспейс: экраны флейвора переписаны целиком, а старые ключи
 * (`track.*`, `auth.*`, `account.*`) продолжают обслуживать SkyForest и
 * Checker без изменений. Копирайт короче прежнего — так задумано в дизайне:
 * тексты читают на ходу, в лесу, одной рукой.
 */
export default {
  /** Нижнее меню: четыре пункта, подписи должны быть короткими. */
  tabs: {
    label: "Main menu",
    home: "Track",
    offline: "Offline",
    history: "History",
    more: "More",
  },

  menu: {
    close: "Close",
    moreTitle: "More",
    subscription: "Subscription",
    account: "My account",
    otherApps: "our other apps",
    skyforestName: "SkyForest",
    skyforestHint: "Mushroom spots, forecast and maps",
    checkerName: "Mushroom Checker",
    checkerHint: "Identify a mushroom from a photo",
    language: "language",
    units: "units",
    unitsKm: "km",
    unitsMi: "mi",
    logout: "Log out",
    signIn: "Sign in",
    anonymous: "Not signed in",
    anonymousHint: "Tracking works without an account",
    trialLeft: "trial · {days, plural, one {# day} other {# days}} left",
    premium: "premium",
  },

  home: {
    /** Слово на главной кнопке. Капс задаёт CSS (.wb-start-word). */
    start: "Start",
    startButton: "I'm entering the forest",
    startingButton: "Getting your location…",
    pickOnMap: "Set entry point on the map",
    howTitle: "How it works",
    how1: "Tap at the forest edge — we drop an anchor by GPS",
    how2: "A point every couple of minutes — battery-friendly",
    how3: "Arrow and distance lead you back — no internet needed",
    localOnly: "Data stays on this device only.",
    mapLocating: "finding your position…",
    mapHere: "you are here · {coords}",
    mapLastKnown: "last known area · tap the target to locate",
    mapDenied: "location is off — allow it in settings",
    mapNoFix: "no position yet — tap the target to retry",
    mapLocate: "Show my location",
    mapSaveArea: "Save this area for offline use",
    offlineMap: "Offline map",
    offlineMapNone: "no areas yet",
    offlineMapDownload: "Download",
    offlineMapCount:
      "{count, plural, one {# area saved} other {# areas saved}}",
    history: "History",
    historyNone: "no walks yet",
    historyOpen: "Open",
    historyCount: "{count, plural, one {# walk} other {# walks}}",
    signInTitle: "Sign in to sync your walks",
    signInBody: "Optional — tracking works without an account",
    signInAction: "Sign in",
  },

  picker: {
    title: "Tap the map to place your entry point",
    lastKnown: "last known position used",
    noFix: "no position yet",
    accuracy: "±{m} m",
    confirm: "I entered here",
    cancel: "Cancel",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    locate: "Use my location",
  },

  active: {
    title: "In the forest",
    toEntry: "to entry",
    inForest: "in forest",
    atTheEntry: "at the entry",
    since: "since {time}",
    directionText: "Entry point: {dir}, {dist}",
    fromCourse: "direction from your GPS course",
    fromCompass: "direction from the phone compass — hold it flat",
    unknownLine1: "direction",
    unknownLine2: "not determined",
    unknownBody:
      "Walk a few steps — we read direction from your GPS course. Standing still? Turn on the compass.",
    enableCompass: "Enable compass",
    compassUnavailable:
      "No compass on this device — use the side of the world and the dashed line on the map.",
    anchorSafe:
      "The anchor is saved either way — with no compass we'll name the side of the world: “{example}”.",
    anchorSafeExample: "northwest, 850 m",
    map: "Map",
    layerTrails: "Trails",
    layerSatellite: "Satellite",
    expandMap: "Open the map full screen",
    gapHint:
      "dashed — stretches with no recording (app was in the background)",
    offlineMapTitle: "Offline map",
    offlineMapAround:
      "{count, plural, one {# area} other {# areas}} · {radius} km around the anchor",
    offlineMapNone: "no areas around the anchor",
    offlineMapManage: "Manage",
    finish: "I'm out of the forest",
  },

  finish: {
    title: "Finish this walk?",
    body: "We'll save it to your history with distance and duration. The arrow stops working after that.",
    stats: "{duration} · {distance} max · {points}",
    points: "{count, plural, one {# point} other {# points}}",
    confirm: "Yes, finish",
    cancel: "Cancel",
  },

  /**
   * Предсохранение карты по виду на экране: касание задаёт место, зум — охват
   * и детализацию. Второй вход рядом с «радиус × детализация» ниже.
   */
  area: {
    title: "Pick an area to save",
    hint: "tap the map to move the frame · zoom to change the area",
    hintLocked: "area locked while downloading",
    selection: "selected area",
    size: "{width} × {height} km · zoom {minZoom}–{maxZoom}",
    measuring: "measuring the area…",
    estimate: "≈ {tiles} tiles · {size} to download",
    layers: "trails + satellite layers",
    reused:
      "{count, plural, one {# tile already saved — not downloaded again} other {# tiles already saved — not downloaded again}}",
    alreadySaved: "This area is already saved. Move the frame or zoom out.",
    large:
      "{size} is a lot on mobile data — better on Wi-Fi. One step closer makes the area 4× smaller.",
    tooLarge:
      "{size} is too much for one download. Zoom in to shrink the area first.",
    save: "Save this area",
    close: "Done",
    cancel: "Cancel",
    downloading: "Saving area…",
    progress: "{done} / {total}",
    progressSize: "{done} of {size} · keep the app open",
    progressReused:
      "{count, plural, one {# tile taken from storage} other {# tiles taken from storage}}",
    savedToast: "Area saved for offline use",
    partialToast: "Saved with {failed} tiles skipped (network)",
    stoppedToast: "Stopped — {size} kept in storage",
    stoppedEmptyToast: "Download stopped",
    errorToast: "Could not save the area. Please try again.",
    locateError: "Could not get your location",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    locate: "Use my location",
    regionName: "{size} · z{minZoom}–{maxZoom} · {date}",
    regionPartial: "{size} · z{minZoom}–{maxZoom} · {date} · stopped",
  },

  offline: {
    title: "Offline map",
    intro:
      "Download tiles around your location so the map still draws with no signal.",
    pickOnMap: "Pick an area on the map",
    pickOnMapHint: "tap the place, zoom for detail",
    centre: "centre · {coords}",
    noCentre: "centre not set yet",
    useLocation: "Use my location",
    gettingLocation: "Getting your location…",
    radius: "area radius",
    radiusLocked: "area radius · locked while downloading",
    detail: "detail level",
    detailBasic: "Basic",
    detailMedium: "Medium",
    detailMax: "Maximum",
    detailBasicHint:
      "Basic — an overview map, the smallest download. Fine detail caches by itself when you're online.",
    detailMediumHint:
      "Medium — trails visible up to zoom 15. Each extra level roughly quadruples the download.",
    detailMaxHint:
      "Maximum — full walking detail offline. Can be a very large download.",
    estimate: "≈ {tiles} tiles · {size}",
    layers: "trails + satellite layers",
    download: "Download this area",
    downloading: "Downloading…",
    progress: "{done} / {total}",
    progressSize: "{done} of {total} · keep the app open",
    cancel: "Cancel",
    stored: "Downloaded areas",
    storedEmpty: "No offline areas yet.",
    storedEmptyHint: "Download one before you lose signal.",
    storedHint: "Tap an area to preview it on the map.",
    regionMeta: "{radius} km · {quality} · {date}",
    regionSize: "{tiles} tiles · {size} · z{minZoom}–{maxZoom}",
    delete: "Delete area",
    deleted: "Offline area deleted",
    savedToast: "Area saved for offline use",
    partialToast: "Saved with {failed} tiles skipped (network)",
    errorToast: "Could not download the area. Please try again.",
    closePreview: "Close",
  },

  history: {
    title: "History",
    count: "{count, plural, one {# walk} other {# walks}}",
    localBadge: "on this device",
    meta: "{duration} · {distance}",
    points: "{count, plural, one {# point} other {# points}}",
    delete: "Delete walk",
    deleteConfirm: "Delete?",
    deleted: "Walk deleted",
    deleteError: "Could not delete the walk. Please try again.",
    localNote:
      "Walks marked “on this device” live only here. Sign in to keep them if you change phones.",
    emptyTitle: "No walks saved yet",
    emptyBody:
      "Finish your first walk and it will appear here — with the map, distance and time in the forest.",
    emptyAction: "I'm entering the forest",
  },

  auth: {
    optional: "optional",
    /* В приложении вход обязателен (подписка привязана к учётной записи),
       на сайте трек по-прежнему открыт — отсюда две пары подписей. */
    required: "required",
    signInTitle: "Sign in to sync",
    signInBody:
      "Tracking works without an account. Sign in for the subscription and to keep history across phones.",
    signInBodyRequired:
      "Your subscription is tied to this account — that is how it follows you to a new phone.",
    google: "Continue with Google",
    apple: "Continue with Apple",
    orWithEmail: "or with email",
    email: "email",
    password: "password",
    show: "Show",
    hide: "Hide",
    forgot: "Forgot password?",
    signIn: "Sign in",
    noAccount: "No account?",
    createOne: "Create one",
    registerTitle: "Create account",
    registerBody: "Only needed for the subscription and cross-device history.",
    passwordHint: "at least 8 characters",
    strengthWeak: "weak",
    strengthDecent: "decent",
    strengthStrong: "strong",
    createAccount: "Create account",
    legal: "By continuing you accept the Terms of Use and Privacy Policy.",
    uploadNote:
      "Walks already saved on this device will be uploaded after your first sign-in.",
    resetTitle: "Reset password",
    resetBody: "We'll email you a link. It stays valid for one hour.",
    sendLink: "Send the link",
    linkSent: "Check your inbox — the link is on its way.",
    linkExpiredTitle: "This link is no longer valid",
    linkExpiredBody:
      "Reset links expire after an hour and work once. Request a new one above.",
    newPassword: "new password",
    newPasswordUnavailable: "new password · unavailable",
    savePassword: "Save the password",
    haveAccount: "Already have an account?",
  },

  /**
   * Длительность пробного периода нигде не записана числом: `{days}` приходит
   * из FLAVORS.wayback.subscriptionPlan.trialDays, который обязан совпадать со
   * сторами. Так «3 дня» не могут разойтись с App Store Connect и Google Play.
   */
  paywall: {
    title: "WayBack Premium",
    // Тариф один — годовой. Ключей месячного периода здесь нет намеренно.
    yearly: "Yearly",
    trialBadge: "{days, plural, one {# day free} other {# days free}}",
    perYear: "/ year",
    f1: "Unlimited offline map areas",
    f2: "Full walk history, synced across phones",
    f3: "Satellite layer and maximum detail",
    cta: "{days, plural, one {Start # free day} other {Start # free days}}",
    renewNote:
      "Then {price}{period}. Renews automatically, cancel any time in the {store}.",
    /* Полное раскрытие условий — требование обоих сторов на экране покупки. */
    termsTitle: "Before you subscribe",
    termsTrial:
      "{days, plural, one {# day free} other {# days free}}, then {price} per year.",
    termsRenew:
      "The subscription renews automatically every year until you cancel it.",
    termsCancel:
      "Cancel any time in the {store}, at least 24 hours before the period ends.",
    termsAccount:
      "Payment is charged to your {store} account. The subscription is tied to it.",
    terms: "Terms of Use (EULA)",
    privacy: "Privacy Policy",
    restore: "Restore",
    webNote:
      "Subscriptions are purchased in the mobile app — open WayBack on your phone.",
    activeBadge: "Active",
    activeTitle: "Premium until {date}",
    activeMeta: "{plan} · renews automatically · {price}",
    planYearly: "Yearly plan",
    manage: "Manage subscription",
    unlockedTitle: "What's unlocked",
    unlockedAreas: "Offline areas",
    unlockedAreasValue: "unlimited",
    unlockedSync: "History sync",
    unlockedSatellite: "Satellite layer",
    on: "on",
    billingNote:
      "Billing runs through the {store}. Cancelling keeps Premium until the end of the paid period.",
    storeApple: "App Store",
    storeGoogle: "Google Play",
  },

  /**
   * Стартовый гейт нативной оболочки: вход → пробный период → приложение.
   * Экран объясняет, почему шаг обязателен, и всегда оставляет выход — иначе
   * человек застревает в тупике, а ревьюер стора отклоняет приложение.
   */
  gate: {
    eyebrow: "getting started",
    authTitle: "Sign in to start",
    authBody:
      "WayBack Premium is tied to your account: that is how the trial survives a new phone and how “Restore purchases” finds it again.",
    authEmail: "Continue with email",
    subTitle: "Start your free trial",
    subBody:
      "{days, plural, one {# day free, then the yearly plan} other {# days free, then the yearly plan}}. You can cancel before it ends and pay nothing.",
    signedInAs: "signed in as {email}",
    switchAccount: "Use another account",
    offlineTitle: "No connection",
    offlineBody:
      "The trial has to be set up once while online — the {store} needs the network. After that WayBack works in the forest with no signal.",
    offlineRestore: "Already subscribed? Restore purchases",
    retry: "Try again",
    checking: "Checking your subscription…",
    nothingRestored:
      "No subscription found in this {store} account. Check that you are signed in with the account that paid for it.",
  },

  account: {
    title: "My account",
    edit: "Edit",
    premiumActive: "Premium active",
    premiumUntil: "until {date}",
    noSubscription: "No subscription",
    noSubscriptionHint: "Offline areas and sync are limited",
    subscribe: "Subscribe",
    manage: "Manage",
    password: "Password",
    passwordChanged: "changed {date}",
    passwordNever: "never changed",
    change: "Change",
    twoFactor: "Two-factor",
    twoFactorOff: "off",
    twoFactorOn: "on",
    setUp: "Set up",
    appLock: "App Lock ({method})",
    appLockBody: "Ask for {method} when opening the app",
    localTitle: "Walks on this device",
    localBody:
      "{count, plural, one {# walk} other {# walks}} stored locally. Deleting the account does not remove them from this phone.",
    localNone: "No walks stored on this phone yet.",
    deleteAccount: "Delete account",
    logout: "Log out",
    close: "Close",
    biometry: "Face ID",
  },

  deleteAccount: {
    title: "Delete account",
    graceTitle: "You have 14 days to change your mind",
    graceBody:
      "Deletion is scheduled, not instant. Sign in again within 14 days and the account is restored.",
    confirmLabel: "type your email to confirm",
    schedule: "Schedule deletion",
    keep: "Keep my account",
    localTitle: "Your walks stay on this phone",
    localBody:
      "Local history and downloaded map areas are not touched by account deletion. Remove the app to erase them.",
    supportNote:
      "No account? Write to {email} — deletion is processed within 30 days.",
    mismatch: "The email does not match the account.",
    failed: "Could not schedule deletion. Please try again.",
    storeNote:
      "An active subscription is not cancelled automatically — cancel it in the {store}.",
  },

  splash: {
    tagline: "Remembers where you entered the forest",
    footer: "works offline · no account needed",
  },
} as const;
