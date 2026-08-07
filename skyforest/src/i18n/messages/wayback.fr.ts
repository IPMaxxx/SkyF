/**
 * WayBack — français (fr-FR).
 *
 * Зеркало wayback.en.ts: набор ключей обязан совпадать (это проверяет
 * fastlane/.wayback-locales-check.mjs). Нейтральная терминология: «sortie»
 * и «la nature», а не «forêt» — приложением одинаково пользуются в горах,
 * у озера и в лесу.
 *
 * Типографика: перед «?», «!» и «;» стоит узкий неразрывный пробел U+202F,
 * перед «:» — неразрывный U+00A0. Обычный пробел перед этими знаками во
 * французском — ошибка, и её ловит fastlane/.wayback-locales-check.mjs.
 *
 * Формы без рода: «Je suis de retour», «Mon point d'entrée est ici» —
 * приложение не знает пол пользователя.
 */
export default {
  /** Нижнее меню: четыре пункта, подписи должны быть короткими. */
  tabs: {
    label: "Menu principal",
    home: "Sortie",
    offline: "Hors ligne",
    history: "Historique",
    more: "Plus",
  },

  menu: {
    close: "Fermer",
    moreTitle: "Plus",
    subscription: "Abonnement",
    account: "Mon compte",
    otherApps: "nos autres applis",
    skyforestName: "SkyForest",
    skyforestHint: "Coins à champignons, prévisions et cartes",
    checkerName: "Mushroom Checker",
    checkerHint: "Identifier un champignon en photo",
    language: "langue",
    units: "unités",
    unitsKm: "km",
    unitsMi: "mi",
    logout: "Se déconnecter",
    signIn: "Se connecter",
    anonymous: "Non connecté",
    anonymousHint: "L'enregistrement marche sans compte",
    trialLeft:
      "essai · {days, plural, one {# jour restant} other {# jours restants}}",
    premium: "premium",
  },

  home: {
    /** Слово на главной кнопке — английское во всех локалях, это знак действия. */
    start: "Start",
    startButton: "Je pars dans la nature",
    startingButton: "Recherche de votre position…",
    pickOnMap: "Placer l'entrée sur la carte",
    howTitle: "Comment ça marche",
    how1: "Touchez l'endroit du départ : on pose une ancre au GPS",
    /**
     * Про запись — два варианта. Нейтральный верен везде, включая сборки без
     * фоновой службы и браузер; сильный показывается только там, где своя
     * служба переднего плана действительно есть. Выбор — lib/wayback/recordingCopy.
     */
    how2: "Les points se posent en marchant, sans vider la batterie",
    how2Background:
      "Les points se posent en marchant : l'enregistrement continue écran éteint et appli en arrière-plan",
    how3: "La flèche et la distance vous ramènent, sans internet",
    localOnly:
      "La sortie est enregistrée sur ce téléphone ; les sorties terminées sont sauvegardées sur votre compte.",
    mapLocating: "recherche de votre position…",
    mapHere: "vous êtes ici · {coords}",
    mapLastKnown: "dernière zone connue · touchez la cible",
    mapDenied: "la localisation est coupée — activez-la dans les réglages",
    mapNoFix: "pas encore de position — touchez la cible pour réessayer",
    mapLocate: "Afficher ma position",
    mapSaveArea: "Enregistrer cette zone pour le hors ligne",
    offlineMap: "Carte hors ligne",
    offlineMapNone: "aucune zone pour l'instant",
    offlineMapDownload: "Télécharger",
    offlineMapCount:
      "{count, plural, one {# zone enregistrée} other {# zones enregistrées}}",
    history: "Historique",
    historyNone: "aucune sortie pour l'instant",
    historyOpen: "Ouvrir",
    historyCount: "{count, plural, one {# sortie} other {# sorties}}",
    signInTitle: "Connectez-vous pour synchroniser vos sorties",
    signInBody: "Facultatif : l'enregistrement marche sans compte",
    signInAction: "Se connecter",
  },

  picker: {
    title: "Touchez la carte pour placer votre point d'entrée",
    lastKnown: "d'après la dernière position connue",
    noFix: "pas encore de position",
    accuracy: "±{m} m",
    confirm: "Mon point d'entrée est ici",
    cancel: "Annuler",
    zoomIn: "Zoomer",
    zoomOut: "Dézoomer",
    locate: "Utiliser ma position",
  },

  // Журнал записи пути: техническая выписка для нас, подписи — для человека,
  // который её присылает.
  diagnostics: {
    title: "Journal d'enregistrement",
    hint: "Notes techniques sur les derniers événements d'enregistrement : elles sont conservées qu'une sortie soit en cours ou non. Copiez-les et envoyez-les au support, cela nous suffit en général pour voir ce qui a coincé.",
    empty: "Rien d'enregistré pour l'instant.",
    copy: "Copier le journal",
    copied: "Journal copié",
    clear: "Effacer",
    close: "Fermer",
  },

  active: {
    title: "En chemin",
    toEntry: "jusqu'à l'entrée",
    onTheWalk: "en sortie",
    atTheEntry: "vous êtes à l'entrée",
    since: "depuis {time}",
    directionText: "Point d'entrée : {dir}, {dist}",
    fromCourse: "direction d'après votre cap GPS",
    fromCompass: "direction d'après la boussole — tenez le téléphone à plat",
    unknownLine1: "direction",
    unknownLine2: "indéterminée",
    unknownBody:
      "Faites quelques pas : on lit la direction dans votre cap GPS. Vous êtes à l'arrêt ? Activez la boussole.",
    enableCompass: "Activer la boussole",
    compassUnavailable:
      "Ce téléphone n'a pas de boussole — fiez-vous au point cardinal et aux pointillés sur la carte.",
    anchorSafe:
      "L'ancre est enregistrée dans tous les cas : sans boussole, on donne le point cardinal, « {example} ».",
    anchorSafeExample: "nord-ouest, 850 m",
    map: "Carte",
    layerTrails: "Sentiers",
    layerSatellite: "Satellite",
    expandMap: "Ouvrir la carte en plein écran",
    /**
     * Причина разрыва зависит от сборки, поэтому строк две. Без фоновой службы
     * пунктир — это уход в фон, и называть причину нечестно: карта её не знает.
     * Со службой запись фон переживает, и остаётся ровно одна причина —
     * телефон не видел спутников. Выбор — lib/wayback/recordingCopy.
     */
    gapHint: "pointillés — portions sans enregistrement",
    gapHintBackground:
      "pointillés — portions où le téléphone ne captait pas les satellites",
    /**
     * Постоянное уведомление Android, пока идёт запись. Android показывает его
     * всё время похода, поэтому текст должен объяснять, почему оно тут, и не
     * пугать: без службы переднего плана система запись останавливает.
     */
    bgNotice: {
      title: "Enregistrement du chemin du retour",
      message: "Garde la trace jusqu'à votre point d'entrée, écran éteint",
      /**
       * Уведомления выключены: запись идёт, но человек её не видит. Android
       * второй раз диалог не покажет, поэтому единственный выход — настройки.
       */
      blockedTitle: "Les notifications de WayBack sont coupées",
      blockedBody:
        "La sortie est bien enregistrée, mais vous ne la verrez pas sur l'écran de verrouillage.",
      blockedAction: "Activer",
    },
    /**
     * Состояние записи словами. Молчать о том, что путь не пишется, нельзя:
     * человек узнаёт об этом, только когда путь уже понадобился, — а именно
     * так поломка записи и доехала однажды до всех установленных приложений.
     */
    recordingIssue: {
      offTitle: "La trace n'est pas enregistrée",
      offBody:
        "Impossible d'accéder à la localisation pour le moment. Relancez la sortie.",
      /**
       * Спокойный тон намеренно: путь пишется, просто с погашенным экраном
       * запись прервётся. Пугать тут нечем.
       */
      foregroundOnlyTitle: "Enregistrement tant que l'appli est ouverte",
      foregroundOnlyBody: "Écran éteint, la trace peut comporter des trous.",
      updateBody:
        "Mettez WayBack à jour pour que la trace continue écran éteint.",
      preciseBody:
        "Autorisez la position précise pour que la trace continue écran éteint.",
      locationDeniedBody:
        "Autorisez WayBack à utiliser la localisation pour que la trace continue écran éteint.",
      preciseAction: "Réglages",
    },
    /**
     * Строка состояния на экране похода. Тост человек пролистывает, а спросить
     * его «что было написано» потом невозможно — значит состояние записи должно
     * быть видно в любой момент, вместе с кодом отказа для пересылки.
     */
    recordingStatus: {
      on: "Enregistrement écran éteint",
      foregroundOnly: "Enregistrement appli ouverte",
      off: "La trace n'est pas enregistrée",
      bodyOn: "La notification ci-dessus reste jusqu'à la fin de la sortie.",
      bodyNoNotice:
        "L'enregistrement marche, mais la notification est masquée — activez-les pour la voir sur l'écran de verrouillage.",
      bodyStarting: "Mise en route de l'enregistrement écran éteint…",
      bodyForegroundOnly:
        "L'enregistrement écran éteint ne tourne pas, la trace peut donc comporter des trous.",
      bodyNothing: "Impossible d'accéder à la localisation pour le moment.",
      bodyUnsupported:
        "Cette version n'enregistre que l'appli ouverte. Mettez WayBack à jour pour la trace écran éteint.",
      bodyLocationDenied: "WayBack n'a pas accès à la localisation.",
      bodyPrecise:
        "La position précise est coupée, l'enregistrement écran éteint ne peut pas démarrer.",
      bodyLocationOff: "La localisation est coupée sur ce téléphone.",
      bodyFailed: "Le téléphone n'a pas laissé démarrer le service d'enregistrement.",
      settings: "Ouvrir les réglages",
      copy: "copier le code",
      copied: "Code copié",
    },
    offlineMapTitle: "Carte hors ligne",
    offlineMapAround:
      "{count, plural, one {# zone} other {# zones}} · {radius} km autour de l'ancre",
    offlineMapNone: "aucune zone autour de l'ancre",
    offlineMapManage: "Gérer",
    finish: "Je suis de retour",
  },

  finish: {
    title: "Terminer cette sortie ?",
    body: "On l'enregistre dans votre historique avec la distance et la durée. La flèche cesse alors de fonctionner.",
    stats: "{duration} · {distance} max · {points}",
    points: "{count, plural, one {# point} other {# points}}",
    confirm: "Oui, terminer",
    cancel: "Annuler",
  },

  /**
   * Предсохранение карты по виду на экране: касание задаёт место, зум — охват
   * и детализацию. Второй вход рядом с «радиус × детализация» ниже.
   */
  area: {
    title: "Choisissez une zone à enregistrer",
    hint: "touchez la carte pour déplacer le cadre · le zoom change la zone",
    hintLocked: "zone figée pendant le téléchargement",
    selection: "zone sélectionnée",
    size: "{width} × {height} km · zoom {minZoom}–{maxZoom}",
    measuring: "mesure de la zone…",
    estimate: "≈ {tiles} tuiles · {size} à télécharger",
    layers: "couches sentiers et satellite",
    reused:
      "{count, plural, one {# tuile déjà enregistrée, pas retéléchargée} other {# tuiles déjà enregistrées, pas retéléchargées}}",
    alreadySaved:
      "Cette zone est déjà enregistrée. Déplacez le cadre ou dézoomez.",
    large:
      "{size} en données mobiles, c'est beaucoup — mieux vaut du Wi-Fi. Un cran de zoom en plus divise la zone par quatre.",
    tooLarge:
      "{size}, c'est trop pour un seul téléchargement. Zoomez pour réduire la zone.",
    save: "Enregistrer cette zone",
    close: "Terminé",
    cancel: "Annuler",
    downloading: "Enregistrement de la zone…",
    progress: "{done} / {total}",
    progressSize: "{done} sur {size} · gardez l'appli ouverte",
    progressReused:
      "{count, plural, one {# tuile reprise du stockage} other {# tuiles reprises du stockage}}",
    savedToast: "Zone enregistrée pour le hors ligne",
    partialToast: "Enregistrée, {failed} tuiles ignorées (réseau)",
    stoppedToast: "Arrêté — {size} conservés",
    stoppedEmptyToast: "Téléchargement arrêté",
    errorToast: "Impossible d'enregistrer la zone. Réessayez.",
    locateError: "Impossible d'obtenir votre position",
    zoomIn: "Zoomer",
    zoomOut: "Dézoomer",
    locate: "Utiliser ma position",
    regionName: "{size} · z{minZoom}–{maxZoom} · {date}",
    regionPartial: "{size} · z{minZoom}–{maxZoom} · {date} · arrêté",
  },

  offline: {
    title: "Carte hors ligne",
    intro:
      "Téléchargez les tuiles autour de vous : la carte s'affichera même sans réseau.",
    pickOnMap: "Choisir une zone sur la carte",
    pickOnMapHint: "touchez l'endroit, le zoom règle le détail",
    centre: "centre · {coords}",
    noCentre: "centre pas encore défini",
    useLocation: "Utiliser ma position",
    gettingLocation: "Recherche de votre position…",
    radius: "rayon de la zone",
    radiusLocked: "rayon de la zone · figé pendant le téléchargement",
    detail: "niveau de détail",
    detailBasic: "Basique",
    detailMedium: "Moyen",
    detailMax: "Maximum",
    detailBasicHint:
      "Basique — une carte d'ensemble, le plus petit téléchargement. Le détail fin se met en cache tout seul tant que vous avez du réseau.",
    detailMediumHint:
      "Moyen — sentiers visibles jusqu'au zoom 15. Chaque niveau en plus quadruple à peu près le téléchargement.",
    detailMaxHint:
      "Maximum — tout le détail de marche hors ligne. Le téléchargement peut être très gros.",
    estimate: "≈ {tiles} tuiles · {size}",
    layers: "couches sentiers et satellite",
    download: "Télécharger cette zone",
    downloading: "Téléchargement…",
    progress: "{done} / {total}",
    progressSize: "{done} sur {total} · gardez l'appli ouverte",
    cancel: "Annuler",
    stored: "Zones téléchargées",
    storedEmpty: "Aucune zone hors ligne pour l'instant.",
    storedEmptyHint: "Téléchargez-en une avant de perdre le réseau.",
    storedHint: "Touchez une zone pour l'afficher sur la carte.",
    regionMeta: "{radius} km · {quality} · {date}",
    regionSize: "{tiles} tuiles · {size} · z{minZoom}–{maxZoom}",
    delete: "Supprimer la zone",
    deleted: "Zone hors ligne supprimée",
    savedToast: "Zone enregistrée pour le hors ligne",
    partialToast: "Enregistrée, {failed} tuiles ignorées (réseau)",
    errorToast: "Impossible de télécharger la zone. Réessayez.",
    closePreview: "Fermer",
  },

  history: {
    title: "Historique",
    count: "{count, plural, one {# sortie} other {# sorties}}",
    localBadge: "sur ce téléphone",
    meta: "{duration} · {distance}",
    points: "{count, plural, one {# point} other {# points}}",
    delete: "Supprimer la sortie",
    deleteConfirm: "Supprimer ?",
    deleted: "Sortie supprimée",
    deleteError: "Impossible de supprimer la sortie. Réessayez.",
    localNote:
      "Les sorties marquées « sur ce téléphone » ne vivent qu'ici. Connectez-vous pour les garder si vous changez de mobile.",
    emptyTitle: "Aucune sortie enregistrée pour l'instant",
    emptyBody:
      "Terminez votre première sortie et elle apparaîtra ici, avec la carte, la distance et le temps passé dehors.",
    emptyAction: "Je pars dans la nature",
  },

  auth: {
    optional: "facultatif",
    /* В приложении вход обязателен (подписка привязана к учётной записи),
       на сайте трек по-прежнему открыт — отсюда две пары подписей. */
    required: "obligatoire",
    signInTitle: "Connectez-vous pour synchroniser",
    signInBody:
      "L'enregistrement marche sans compte. La connexion sert à l'abonnement et à garder l'historique d'un téléphone à l'autre.",
    signInBodyRequired:
      "Votre abonnement est lié à ce compte : c'est ainsi qu'il vous suit sur un nouveau téléphone.",
    google: "Continuer avec Google",
    apple: "Continuer avec Apple",
    orWithEmail: "ou par e-mail",
    email: "e-mail",
    password: "mot de passe",
    show: "Afficher",
    hide: "Masquer",
    forgot: "Mot de passe oublié ?",
    signIn: "Se connecter",
    noAccount: "Pas de compte ?",
    createOne: "En créer un",
    registerTitle: "Créer un compte",
    registerBody:
      "Utile uniquement pour l'abonnement et l'historique sur plusieurs appareils.",
    passwordHint: "8 caractères minimum",
    strengthWeak: "faible",
    strengthDecent: "correct",
    strengthStrong: "solide",
    createAccount: "Créer un compte",
    legal:
      "En continuant, vous acceptez les Conditions d'utilisation et la Politique de confidentialité.",
    uploadNote:
      "Les sorties déjà enregistrées sur ce téléphone seront envoyées après votre première connexion.",
    resetTitle: "Réinitialiser le mot de passe",
    resetBody: "On vous envoie un lien par e-mail. Il reste valable une heure.",
    sendLink: "Envoyer le lien",
    linkSent: "Regardez votre boîte mail — le lien arrive.",
    linkExpiredTitle: "Ce lien n'est plus valable",
    linkExpiredBody:
      "Les liens de réinitialisation expirent au bout d'une heure et ne servent qu'une fois. Demandez-en un nouveau ci-dessus.",
    newPassword: "nouveau mot de passe",
    newPasswordUnavailable: "nouveau mot de passe · indisponible",
    savePassword: "Enregistrer le mot de passe",
    haveAccount: "Vous avez déjà un compte ?",
  },

  /**
   * Длительность пробного периода нигде не записана числом: `{days}` приходит
   * из FLAVORS.wayback.subscriptionPlan.trialDays, который обязан совпадать со
   * сторами. Так «3 дня» не могут разойтись с App Store Connect и Google Play.
   */
  paywall: {
    title: "WayBack Premium",
    /* Тарифа два — неделя и год. Месячного нет: см. FLAVORS.wayback. */
    weekly: "Hebdo",
    yearly: "Annuel",
    /** Выбор тарифа для чтения с экрана: подписи «Hebdo»/«Annuel» сами по себе не объясняют, что это группа. */
    planPickerLabel: "Choisissez une formule",
    trialBadge: "{days, plural, one {# jour offert} other {# jours offerts}}",
    /**
     * Выгода годового против 52 недельных списаний. Процент считает
     * `yearlySavings` по ценам стора — числа в тексте нет намеренно, иначе
     * оно разошлось бы с валютой покупателя.
     */
    saveBadge: "{percent}% de moins",
    planHintYearly:
      "{days, plural, one {# jour offert} other {# jours offerts}} · {price} / semaine",
    perWeek: "/ semaine",
    perYear: "/ an",
    f1: "Zones de carte hors ligne sans limite",
    f2: "Historique complet, synchronisé entre téléphones",
    f3: "Couche satellite et détail maximum",
    cta: "{days, plural, one {Essayer # jour offert} other {Essayer # jours offerts}}",
    renewNote:
      "Puis {price} {period}. Reconduction automatique, résiliable à tout moment sur {store}.",
    /* Полное раскрытие условий — требование обоих сторов на экране покупки.
       Периодичность списания называется по выбранному тарифу: «par semaine» и
       «par an» — разные обещания, подставлять одно вместо другого нельзя. */
    termsTitle: "Avant de vous abonner",
    termsTrialWeek:
      "{days, plural, one {# jour offert} other {# jours offerts}}, puis {price} par semaine.",
    termsTrialYear:
      "{days, plural, one {# jour offert} other {# jours offerts}}, puis {price} par an.",
    termsRenewWeek:
      "L'abonnement se reconduit automatiquement chaque semaine tant que vous ne le résiliez pas.",
    termsRenewYear:
      "L'abonnement se reconduit automatiquement chaque année tant que vous ne le résiliez pas.",
    termsCancel:
      "Résiliable à tout moment sur {store}, au moins 24 heures avant la fin de la période.",
    termsAccount:
      "Le paiement est débité de votre compte {store}. L'abonnement y est rattaché.",
    terms: "Conditions d'utilisation (CLUF)",
    privacy: "Politique de confidentialité",
    restore: "Restaurer",
    /**
     * Отказ, причину которого не назвал ни стор, ни наш сервер. Здесь обязан
     * стоять именно текст ошибки: раньше на это место подставлялась подпись
     * кнопки, и человек с оплаченной подпиской читал в красной рамке
     * приглашение начать пробный период.
     */
    purchaseFailed:
      "L'achat n'est pas allé au bout. Réessayez, ou utilisez « Restaurer » si vous avez déjà payé.",
    nothingRestored:
      "Aucun abonnement sur ce compte {store}. Vérifiez que vous êtes connecté avec le compte qui a payé.",
    webNote:
      "Les abonnements s'achètent dans l'appli mobile — ouvrez WayBack sur votre téléphone.",
    activeBadge: "Actif",
    activeTitle: "Premium jusqu'au {date}",
    activeMeta: "{plan} · reconduction automatique · {price}",
    planWeekly: "Formule hebdomadaire",
    planYearly: "Formule annuelle",
    manage: "Gérer l'abonnement",
    unlockedTitle: "Ce qui est débloqué",
    unlockedAreas: "Zones hors ligne",
    unlockedAreasValue: "sans limite",
    unlockedSync: "Synchronisation de l'historique",
    unlockedSatellite: "Couche satellite",
    on: "oui",
    billingNote:
      "La facturation passe par {store}. Après résiliation, Premium reste actif jusqu'à la fin de la période payée.",
    storeApple: "App Store",
    storeGoogle: "Google Play",
  },

  /**
   * Стартовый гейт нативной оболочки: вход → пробный период → приложение.
   * Экран объясняет, почему шаг обязателен, и всегда оставляет выход — иначе
   * человек застревает в тупике, а ревьюер стора отклоняет приложение.
   */
  gate: {
    eyebrow: "premiers pas",
    authTitle: "Connectez-vous pour commencer",
    authBody:
      "WayBack Premium est lié à votre compte : c'est ainsi que l'essai survit à un nouveau téléphone et que « Restaurer les achats » le retrouve.",
    authEmail: "Continuer par e-mail",
    subTitle: "Commencez votre essai gratuit",
    /**
     * Две строки, потому что тарифов на экране бывает один или два — список
     * приходит из стора. Обещать выбор там, где его нет, нельзя.
     */
    subBody:
      "{days, plural, one {# jour offert, puis la formule annuelle} other {# jours offerts, puis la formule annuelle}}. Résiliez avant la fin et vous ne payez rien.",
    subBodyChoice:
      "{days, plural, one {# jour offert sur les deux formules} other {# jours offerts sur les deux formules}}. Résiliez avant la fin de l'essai et vous ne payez rien.",
    signedInAs: "connecté en tant que {email}",
    switchAccount: "Utiliser un autre compte",
    offlineTitle: "Pas de connexion",
    offlineBody:
      "L'essai se met en place une fois, en ligne : {store} a besoin du réseau. Ensuite, WayBack fonctionne dehors sans aucun signal.",
    offlineRestore: "Déjà abonné ? Restaurer les achats",
    retry: "Réessayer",
    checking: "Vérification de votre abonnement…",
    nothingRestored:
      "Aucun abonnement sur ce compte {store}. Vérifiez que vous êtes connecté avec le compte qui a payé.",
  },

  account: {
    title: "Mon compte",
    edit: "Modifier",
    premiumActive: "Premium actif",
    premiumUntil: "jusqu'au {date}",
    noSubscription: "Pas d'abonnement",
    noSubscriptionHint: "Zones hors ligne et synchronisation limitées",
    subscribe: "S'abonner",
    manage: "Gérer",
    password: "Mot de passe",
    passwordChanged: "changé le {date}",
    passwordNever: "jamais changé",
    change: "Changer",
    twoFactor: "Double facteur",
    twoFactorOff: "non",
    twoFactorOn: "oui",
    setUp: "Configurer",
    appLock: "Verrouillage ({method})",
    appLockBody: "Demander {method} à l'ouverture de l'appli",
    localTitle: "Sorties sur ce téléphone",
    localBody:
      "{count, plural, one {# sortie enregistrée} other {# sorties enregistrées}} en local. Supprimer le compte ne les enlève pas de ce téléphone.",
    localNone: "Aucune sortie enregistrée sur ce téléphone pour l'instant.",
    deleteAccount: "Supprimer le compte",
    logout: "Se déconnecter",
    close: "Fermer",
    biometry: "Face ID",
  },

  deleteAccount: {
    title: "Supprimer le compte",
    graceTitle: "Vous avez 14 jours pour changer d'avis",
    graceBody:
      "La suppression est programmée, pas immédiate. Reconnectez-vous sous 14 jours et le compte est rétabli.",
    confirmLabel: "saisissez votre e-mail pour confirmer",
    schedule: "Programmer la suppression",
    keep: "Garder mon compte",
    localTitle: "Vos sorties restent sur ce téléphone",
    localBody:
      "L'historique local et les zones de carte téléchargées ne sont pas touchés par la suppression du compte. Désinstallez l'appli pour les effacer.",
    supportNote:
      "Plus accès au compte ? Écrivez à {email} — la suppression est traitée sous 30 jours.",
    mismatch: "L'e-mail ne correspond pas au compte.",
    failed: "Impossible de programmer la suppression. Réessayez.",
    storeNote:
      "Un abonnement actif n'est pas résilié automatiquement — résiliez-le sur {store}.",
  },

  splash: {
    tagline: "Se souvient de votre point de départ",
    footer: "marche hors ligne · sans compte",
  },

  landing: {
    tagline: "Toujours de retour à votre point de départ",
    text: "Marquez votre point d'entrée : la flèche et la carte hors ligne vous ramènent même sans internet ni réseau. Téléchargez la carte de votre secteur à l'avance.",
    cta: "Ouvrir la carte",
    poweredBy: "Propulsé par SkyForest",
  },
} as const;

/**
 * Блок `flavor.wayback` общего словаря — тексты про задачу приложения
 * (`src/lib/useFlavorBrand.ts`). Живёт здесь, а не в fr.ts: копия приложения
 * принадлежит приложению, ровно как `checkerBrand` в checker.*.ts.
 */
export const waybackBrand = {
  tagline: "Toujours de quoi rentrer",
  metaDescription:
    "WayBack retient votre point d'entrée et affiche toujours la flèche et la distance du retour. Fonctionne sans réseau.",
  authSubtitle:
    "Connectez-vous pour l'abonnement et pour synchroniser vos sorties.",
  accountSubtitle: "Profil, abonnement et réglages du compte.",
  accountDeleteHint:
    "La suppression du compte est définitive : le profil et les sorties synchronisées dans le cloud disparaissent. Un abonnement pris dans une boutique se résilie à part, sur l'App Store ou Google Play.",
  accountDeleteNote:
    "Les sorties et les cartes hors ligne gardées sur ce téléphone ne sont pas touchées — supprimez-les depuis l'appli.",
  lockBody: "Déverrouillez avec Face ID pour ouvrir WayBack.",
  deletedItems: [
    "Le profil (nom et adresse e-mail)",
    "Les sorties synchronisées dans le cloud",
    "Les jetons de notification de vos appareils",
    "Les enregistrements d'abonnement conservés chez nous",
  ],
} as const;

/**
 * Общие ключи, которые реально видно в WayBack: вход, восстановление пароля,
 * двухфакторная защита, тосты трека, футер с документами. Всё остальное из
 * `en.ts` честно остаётся английским — так решает `mergeWaybackLocale` в
 * src/i18n/request.ts, а не пустая строка на экране.
 */
export const waybackShared = {
  a11y: {
    skipToContent: "Aller au contenu principal",
  },
  common: {
    updateTitle: "Mise à jour disponible",
    updateBody:
      "Vous avez la version {current}. La {latest} est sortie — mettez l'appli à jour pour profiter des dernières améliorations.",
    updateNow: "Mettre à jour",
    updateLater: "Plus tard",
  },
  footer: {
    offer: "Conditions d'utilisation",
    privacy: "Confidentialité",
    deleteAccount: "Supprimer le compte",
  },
  auth: {
    socialError: "La connexion a échoué. Réessayez.",
    authFailed: "Impossible de vérifier votre compte. Réessayez.",
    invalidCredentials: "E-mail ou mot de passe incorrect",
    alreadyRegistered:
      "Cet e-mail est déjà inscrit. Connectez-vous ou réinitialisez le mot de passe.",
    checkEmail: "Regardez votre boîte mail",
    mfaCheckTitle: "Vérification en deux étapes",
    mfaCodeSubtitle:
      "Saisissez le code à 6 chiffres de votre application d'authentification",
    mfaChecking: "Vérification…",
    mfaAppHelp:
      "Ouvrez Google Authenticator, Authy ou une autre application et saisissez le code du moment",
    mfaLogoutOther: "Se déconnecter et utiliser une autre méthode",
    mfaError: "La vérification a échoué. Réessayez.",
    mfaInvalid: "Code incorrect. Réessayez.",
    passwordMismatch: "Les mots de passe ne correspondent pas",
    passwordMin: "Le mot de passe doit faire au moins 6 caractères",
    passwordUpdated: "Mot de passe mis à jour",
  },
  account: {
    metaTitle: "Mon compte",
    biometric: {
      lockTitle: "{app} est verrouillée",
      lockBody: "Déverrouillez avec Face ID pour garder vos coins pour vous.",
      unlock: "Déverrouiller",
      authenticating: "Vérification en cours…",
    },
    pw: {
      minChars: "6 caractères minimum",
      mismatch: "Les mots de passe ne correspondent pas",
      newLabel: "Nouveau mot de passe",
      newPlaceholder: "6 caractères minimum",
      confirmLabel: "Confirmez le mot de passe",
      confirmPlaceholder: "Répétez le mot de passe",
      changed: "Mot de passe changé",
      submit: "Changer le mot de passe",
    },
    twoFa: {
      enableError: "Impossible d'activer la vérification en deux étapes",
      verifyError: "La vérification a échoué",
      wrongCode: "Code incorrect. Réessayez.",
      protectedHint:
        "Votre compte est protégé par une application d'authentification",
      addHint: "Ajoutez une protection supplémentaire à votre compte",
      disable: "Désactiver",
      enable: "Activer",
      scanQr: "Scannez le QR code dans votre application d'authentification",
      appsHint: "Google Authenticator, Authy ou une autre application TOTP",
      qrAlt: "QR code pour la vérification en deux étapes",
      manualKey: "Ou saisissez la clé à la main :",
      enterCode: "Saisissez le code de l'application",
    },
  },
  notFound: {
    title: "Page introuvable",
    home: "Retour à l'accueil",
  },
} as const;
