/**
 * Mushroom Checker — «Soft Product» redesign.
 *
 * Отдельный неймспейс: экраны флейвора переписаны целиком, а старые ключи
 * (`identify.*`, `auth.*`, `account.*`) продолжают обслуживать SkyForest и
 * WayBack без изменений.
 */
export default {
  menu: {
    brandShort: "Checker",
    open: "Open menu",
    close: "Close menu",
    identify: "Identify mushroom",
    subscription: "Subscription",
    account: "My account",
    premiumPill: "PREMIUM",
    logout: "Log out",
  },

  home: {
    titleLine1: "Mushroom?",
    titleLine2: "Let's check.",
    quotaLeft: "identifications left this month, out of {limit}",
    quotaNoSub:
      "identifications left — subscribe to get {limit} every month",
    photoCaption: "MUSHROOM PHOTO",
    tipCap: "Cap from above",
    tipStem: "Whole stem",
    tipGills: "Gills underneath",
    tipLight: "Daylight",
    takePhoto: "Take photo",
    fromGallery: "From gallery",
    disclaimer:
      "The app is not a substitute for an expert. Never eat a mushroom based on the result alone.",
  },

  preview: {
    title: "Ready to identify",
    lighting: "Good lighting detected",
    beforeTitle: "Before you send",
    beforeBody:
      "One identification will be used from your monthly allowance — only if we return a result.",
    identify: "Identify",
    counter: "· {used} of {limit}",
    retake: "Retake",
  },

  confirm: {
    title: "Identify this mushroom?",
    body: "We only count the identification if the analysis returns a result. Errors and “not a mushroom” are free.",
    thisScan: "This scan",
    leftThisMonth: "Left this month",
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
    limitTitle: "Monthly limit reached",
    limitBody:
      "You've used all {limit} identifications. The counter resets on {date}.",
    limitBodyNoDate: "You've used all {limit} identifications for this month.",
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
    captureBody:
      "Check camera and photo library permissions in Settings, then try again.",
  },

  paywall: {
    close: "Close",
    title: "Checker Premium",
    subtitle:
      "{limit} identifications a month, full species data and lookalike warnings.",
    monthly: "Monthly",
    yearly: "Yearly",
    yearlyBadge: "−{percent}%",
    trialBadge: "7-DAY FREE TRIAL",
    perYear: "/ year",
    perMonth: "/ month",
    perMonthHint: "· {price} per month",
    feature1: "{limit} identifications every month",
    feature2: "Dangerous lookalikes & toxicity notes",
    feature3: "Full taxonomy and habitat data",
    autoRenewYear:
      "7 days free, then auto-renews at {price}/year. Cancel anytime in the {store}.",
    autoRenewMonth:
      "7 days free, then auto-renews at {price}/month. Cancel anytime in the {store}.",
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
    planMonthly: "Monthly",
    planYearly: "Yearly",
    quotaLine: "of {limit} identifications left",
    quotaReset: "resets on {date}",
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
    premiumMonthly: "Monthly",
    premiumYearly: "Yearly",
    idsLeft: "{left} of {limit} identifications left this month",
    noSubscription: "No active subscription",
    noSubscriptionHint: "Subscribe to identify mushrooms",
    manage: "Manage",
    subscribe: "Subscribe",
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
