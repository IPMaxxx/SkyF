/**
 * WayBack — polski (pl-PL).
 *
 * Зеркало wayback.en.ts: набор ключей обязан совпадать (это проверяет
 * fastlane/.wayback-locales-check.mjs). Нейтральная терминология: «wyprawa»
 * и «teren», а не «las» — приложением одинаково пользуются в горах, у озера
 * и в лесу.
 *
 * У польского три формы счёта (one / few / many), и в ICU обязаны быть все
 * три: «1 wyprawa», «2 wyprawy», «5 wypraw». Формы без рода («Jestem z
 * powrotem», «Wychodzę w teren») — приложение не знает пол пользователя.
 */
export default {
  /** Нижнее меню: четыре пункта, подписи должны быть короткими. */
  tabs: {
    label: "Menu główne",
    home: "Wyprawa",
    offline: "Offline",
    history: "Historia",
    more: "Więcej",
  },

  menu: {
    close: "Zamknij",
    moreTitle: "Więcej",
    subscription: "Subskrypcja",
    account: "Moje konto",
    otherApps: "nasze inne aplikacje",
    skyforestName: "SkyForest",
    skyforestHint: "Grzybowe miejsca, prognoza i mapy",
    checkerName: "Mushroom Checker",
    checkerHint: "Rozpoznaj grzyba ze zdjęcia",
    language: "język",
    units: "jednostki",
    unitsKm: "km",
    unitsMi: "mile",
    logout: "Wyloguj",
    signIn: "Zaloguj się",
    anonymous: "Nie zalogowano",
    anonymousHint: "Zapis działa bez konta",
    trialLeft:
      "próbny · {days, plural, one {został # dzień} few {zostały # dni} many {zostało # dni} other {zostało # dnia}}",
    premium: "premium",
  },

  home: {
    /** Слово на главной кнопке — английское во всех локалях, это знак действия. */
    start: "Start",
    startButton: "Wychodzę w teren",
    startingButton: "Ustalamy twoją pozycję…",
    pickOnMap: "Zaznacz wejście na mapie",
    howTitle: "Jak to działa",
    how1: "Dotknij tam, gdzie ruszasz — zostawimy kotwicę z GPS",
    /**
     * Про запись — два варианта. Нейтральный верен везде, включая сборки без
     * фоновой службы и браузер; сильный показывается только там, где своя
     * служба переднего плана действительно есть. Выбор — lib/wayback/recordingCopy.
     */
    how2: "Punkty dopisują się w marszu — bez wysysania baterii",
    how2Background:
      "Punkty dopisują się w marszu — zapis trwa przy wygaszonym ekranie i aplikacji w tle",
    how3: "Strzałka i dystans wyprowadzą cię z powrotem — bez internetu",
    localOnly:
      "Wyprawa zapisuje się na tym telefonie; zakończone wyprawy trafiają na twoje konto.",
    mapLocating: "ustalamy pozycję…",
    mapHere: "tu jesteś · {coords}",
    mapLastKnown: "ostatnio znany rejon · dotknij celownika",
    mapDenied: "lokalizacja jest wyłączona — włącz ją w ustawieniach",
    mapNoFix: "brak pozycji — dotknij celownika, żeby spróbować jeszcze raz",
    mapLocate: "Pokaż moją lokalizację",
    mapSaveArea: "Zapisz ten obszar do trybu offline",
    offlineMap: "Mapa offline",
    offlineMapNone: "brak obszarów",
    offlineMapDownload: "Pobierz",
    offlineMapCount:
      "{count, plural, one {# zapisany obszar} few {# zapisane obszary} many {# zapisanych obszarów} other {# zapisanego obszaru}}",
    history: "Historia",
    historyNone: "brak wypraw",
    historyOpen: "Otwórz",
    historyCount:
      "{count, plural, one {# wyprawa} few {# wyprawy} many {# wypraw} other {# wyprawy}}",
    signInTitle: "Zaloguj się, żeby synchronizować wyprawy",
    signInBody: "Opcjonalnie — zapis działa bez konta",
    signInAction: "Zaloguj się",
  },

  picker: {
    title: "Dotknij mapy, żeby ustawić punkt wejścia",
    lastKnown: "według ostatnio znanej pozycji",
    noFix: "brak pozycji",
    accuracy: "±{m} m",
    confirm: "Tu jest moje wejście",
    cancel: "Anuluj",
    zoomIn: "Przybliż",
    zoomOut: "Oddal",
    locate: "Użyj mojej lokalizacji",
  },

  // Журнал записи пути: техническая выписка для нас, подписи — для человека,
  // который её присылает.
  diagnostics: {
    title: "Dziennik zapisu",
    hint: "Techniczne notatki o ostatnich zdarzeniach zapisu — zostają niezależnie od tego, czy wyprawa trwa. Skopiuj je i wyślij do pomocy: zwykle to nam wystarczy, żeby zobaczyć, co poszło nie tak.",
    empty: "Nic jeszcze nie zapisano.",
    copy: "Skopiuj dziennik",
    copied: "Dziennik skopiowany",
    clear: "Wyczyść",
    close: "Zamknij",
  },

  active: {
    title: "W drodze",
    toEntry: "do wejścia",
    onTheWalk: "na wyprawie",
    atTheEntry: "jesteś przy wejściu",
    since: "od {time}",
    directionText: "Punkt wejścia: {dir}, {dist}",
    fromCourse: "kierunek z kursu GPS",
    fromCompass: "kierunek z kompasu — trzymaj telefon poziomo",
    unknownLine1: "kierunek",
    unknownLine2: "nieustalony",
    unknownBody:
      "Zrób kilka kroków — kierunek odczytamy z kursu GPS. Stoisz w miejscu? Włącz kompas.",
    enableCompass: "Włącz kompas",
    compassUnavailable:
      "Ten telefon nie ma kompasu — kieruj się stroną świata i przerywaną linią na mapie.",
    anchorSafe:
      "Kotwica i tak jest zapisana — bez kompasu podamy stronę świata: „{example}”.",
    anchorSafeExample: "północny zachód, 850 m",
    map: "Mapa",
    layerTrails: "Szlaki",
    layerSatellite: "Satelita",
    expandMap: "Otwórz mapę na pełnym ekranie",
    /**
     * Причина разрыва зависит от сборки, поэтому строк две. Без фоновой службы
     * пунктир — это уход в фон, и называть причину нечестно: карта её не знает.
     * Со службой запись фон переживает, и остаётся ровно одна причина —
     * телефон не видел спутников. Выбор — lib/wayback/recordingCopy.
     */
    gapHint: "przerywana — odcinki bez zapisu",
    gapHintBackground:
      "przerywana — odcinki, na których telefon nie widział satelitów",
    /**
     * Постоянное уведомление Android, пока идёт запись. Android показывает его
     * всё время похода, поэтому текст должен объяснять, почему оно тут, и не
     * пугать: без службы переднего плана система запись останавливает.
     */
    bgNotice: {
      title: "Zapisujemy drogę powrotną",
      message: "Prowadzi ślad do punktu wejścia przy wygaszonym ekranie",
      /**
       * Уведомления выключены: запись идёт, но человек её не видит. Android
       * второй раз диалог не покажет, поэтому единственный выход — настройки.
       */
      blockedTitle: "Powiadomienia WayBack są wyłączone",
      blockedBody: "Wyprawa się zapisuje, ale nie widać tego na ekranie blokady.",
      blockedAction: "Włącz",
    },
    /**
     * Состояние записи словами. Молчать о том, что путь не пишется, нельзя:
     * человек узнаёт об этом, только когда путь уже понадобился, — а именно
     * так поломка записи и доехала однажды до всех установленных приложений.
     */
    recordingIssue: {
      offTitle: "Ślad się nie zapisuje",
      offBody: "Na razie nie ma dostępu do lokalizacji. Zacznij wyprawę od nowa.",
      /**
       * Спокойный тон намеренно: путь пишется, просто с погашенным экраном
       * запись прервётся. Пугать тут нечем.
       */
      foregroundOnlyTitle: "Zapis działa, gdy aplikacja jest otwarta",
      foregroundOnlyBody: "Przy wygaszonym ekranie w śladzie mogą być przerwy.",
      updateBody:
        "Zaktualizuj WayBack, żeby ślad zapisywał się przy wygaszonym ekranie.",
      preciseBody:
        "Zezwól na dokładną lokalizację, żeby ślad zapisywał się przy wygaszonym ekranie.",
      locationDeniedBody:
        "Zezwól WayBack na dostęp do lokalizacji, żeby ślad zapisywał się przy wygaszonym ekranie.",
      preciseAction: "Ustawienia",
    },
    /**
     * Строка состояния на экране похода. Тост человек пролистывает, а спросить
     * его «что было написано» потом невозможно — значит состояние записи должно
     * быть видно в любой момент, вместе с кодом отказа для пересылки.
     */
    recordingStatus: {
      on: "Zapis działa przy wygaszonym ekranie",
      foregroundOnly: "Zapis działa, gdy aplikacja jest otwarta",
      off: "Ślad się nie zapisuje",
      bodyOn: "Powiadomienie u góry zostanie do końca wyprawy.",
      bodyNoNotice:
        "Zapis działa, ale powiadomienie jest ukryte — włącz powiadomienia, żeby widzieć je na ekranie blokady.",
      bodyStarting: "Uruchamiamy zapis przy wygaszonym ekranie…",
      bodyForegroundOnly:
        "Zapis przy wygaszonym ekranie nie działa, więc w śladzie mogą być przerwy.",
      bodyNothing: "Na razie nie ma dostępu do lokalizacji.",
      bodyUnsupported:
        "Ta wersja zapisuje tylko przy otwartej aplikacji. Zaktualizuj WayBack, żeby ślad szedł przy wygaszonym ekranie.",
      bodyLocationDenied: "WayBack nie ma dostępu do lokalizacji.",
      bodyPrecise:
        "Dokładna lokalizacja jest wyłączona, więc zapis przy wygaszonym ekranie się nie uruchomi.",
      bodyLocationOff: "Lokalizacja w tym telefonie jest wyłączona.",
      bodyFailed: "Telefon nie pozwolił uruchomić usługi zapisu.",
      settings: "Otwórz ustawienia",
      copy: "skopiuj kod",
      copied: "Kod skopiowany",
    },
    offlineMapTitle: "Mapa offline",
    offlineMapAround:
      "{count, plural, one {# obszar} few {# obszary} many {# obszarów} other {# obszaru}} · {radius} km wokół kotwicy",
    offlineMapNone: "wokół kotwicy nie ma obszarów",
    offlineMapManage: "Zarządzaj",
    finish: "Jestem z powrotem",
  },

  finish: {
    title: "Zakończyć tę wyprawę?",
    body: "Zapiszemy ją w historii z dystansem i czasem. Potem strzałka przestanie działać.",
    stats: "{duration} · {distance} maks. · {points}",
    points:
      "{count, plural, one {# punkt} few {# punkty} many {# punktów} other {# punktu}}",
    confirm: "Tak, zakończ",
    cancel: "Anuluj",
  },

  /**
   * Предсохранение карты по виду на экране: касание задаёт место, зум — охват
   * и детализацию. Второй вход рядом с «радиус × детализация» ниже.
   */
  area: {
    title: "Wybierz obszar do zapisania",
    hint: "dotknij mapy, żeby przesunąć ramkę · zoom zmienia obszar",
    hintLocked: "obszar zablokowany na czas pobierania",
    selection: "wybrany obszar",
    size: "{width} × {height} km · zoom {minZoom}–{maxZoom}",
    measuring: "mierzymy obszar…",
    estimate: "≈ {tiles} kafelków · {size} do pobrania",
    layers: "warstwa szlaków i satelity",
    reused:
      "{count, plural, one {# kafelek już zapisany — nie pobieramy go ponownie} few {# kafelki już zapisane — nie pobieramy ich ponownie} many {# kafelków już zapisanych — nie pobieramy ich ponownie} other {# kafelka już zapisanego — nie pobieramy go ponownie}}",
    alreadySaved: "Ten obszar jest już zapisany. Przesuń ramkę albo oddal mapę.",
    large:
      "{size} to dużo jak na dane komórkowe — lepiej przez Wi-Fi. Jeden krok bliżej zmniejsza obszar czterokrotnie.",
    tooLarge:
      "{size} to za dużo na jedno pobranie. Przybliż mapę, żeby zmniejszyć obszar.",
    save: "Zapisz ten obszar",
    close: "Gotowe",
    cancel: "Anuluj",
    downloading: "Zapisujemy obszar…",
    progress: "{done} / {total}",
    progressSize: "{done} z {size} · nie zamykaj aplikacji",
    progressReused:
      "{count, plural, one {# kafelek wzięty z pamięci} few {# kafelki wzięte z pamięci} many {# kafelków wziętych z pamięci} other {# kafelka wziętego z pamięci}}",
    savedToast: "Obszar zapisany do trybu offline",
    partialToast: "Zapisano, pominięto kafelków: {failed} (sieć)",
    stoppedToast: "Zatrzymano — {size} zostało w pamięci",
    stoppedEmptyToast: "Pobieranie zatrzymane",
    errorToast: "Nie udało się zapisać obszaru. Spróbuj jeszcze raz.",
    locateError: "Nie udało się ustalić twojej lokalizacji",
    zoomIn: "Przybliż",
    zoomOut: "Oddal",
    locate: "Użyj mojej lokalizacji",
    regionName: "{size} · z{minZoom}–{maxZoom} · {date}",
    regionPartial: "{size} · z{minZoom}–{maxZoom} · {date} · zatrzymane",
  },

  offline: {
    title: "Mapa offline",
    intro:
      "Pobierz kafelki wokół swojego miejsca, a mapa narysuje się także bez zasięgu.",
    pickOnMap: "Wybierz obszar na mapie",
    pickOnMapHint: "dotknij miejsca, zoom ustawia szczegółowość",
    centre: "środek · {coords}",
    noCentre: "środek jeszcze nieustawiony",
    useLocation: "Użyj mojej lokalizacji",
    gettingLocation: "Ustalamy twoją pozycję…",
    radius: "promień obszaru",
    radiusLocked: "promień obszaru · zablokowany na czas pobierania",
    detail: "szczegółowość",
    detailBasic: "Podstawowa",
    detailMedium: "Średnia",
    detailMax: "Maksymalna",
    detailBasicHint:
      "Podstawowa — mapa poglądowa, najmniejsze pobranie. Drobne szczegóły dogrywają się same, póki jest sieć.",
    detailMediumHint:
      "Średnia — szlaki widoczne do zoomu 15. Każdy kolejny poziom mniej więcej czterokrotnie zwiększa pobranie.",
    detailMaxHint:
      "Maksymalna — pełna szczegółowość do chodzenia, offline. Pobranie bywa bardzo duże.",
    estimate: "≈ {tiles} kafelków · {size}",
    layers: "warstwa szlaków i satelity",
    download: "Pobierz ten obszar",
    downloading: "Pobieranie…",
    progress: "{done} / {total}",
    progressSize: "{done} z {total} · nie zamykaj aplikacji",
    cancel: "Anuluj",
    stored: "Pobrane obszary",
    storedEmpty: "Nie ma jeszcze obszarów offline.",
    storedEmptyHint: "Pobierz jeden, zanim stracisz zasięg.",
    storedHint: "Dotknij obszaru, żeby zobaczyć go na mapie.",
    regionMeta: "{radius} km · {quality} · {date}",
    regionSize: "{tiles} kafelków · {size} · z{minZoom}–{maxZoom}",
    delete: "Usuń obszar",
    deleted: "Obszar offline usunięty",
    savedToast: "Obszar zapisany do trybu offline",
    partialToast: "Zapisano, pominięto kafelków: {failed} (sieć)",
    errorToast: "Nie udało się pobrać obszaru. Spróbuj jeszcze raz.",
    closePreview: "Zamknij",
  },

  history: {
    title: "Historia",
    count:
      "{count, plural, one {# wyprawa} few {# wyprawy} many {# wypraw} other {# wyprawy}}",
    localBadge: "na tym telefonie",
    meta: "{duration} · {distance}",
    points:
      "{count, plural, one {# punkt} few {# punkty} many {# punktów} other {# punktu}}",
    delete: "Usuń wyprawę",
    deleteConfirm: "Usunąć?",
    deleted: "Wyprawa usunięta",
    deleteError: "Nie udało się usunąć wyprawy. Spróbuj jeszcze raz.",
    localNote:
      "Wyprawy oznaczone „na tym telefonie” są tylko tutaj. Zaloguj się, żeby nie stracić ich przy zmianie telefonu.",
    emptyTitle: "Nie ma jeszcze zapisanych wypraw",
    emptyBody:
      "Zakończ pierwszą wyprawę, a pojawi się tutaj — z mapą, dystansem i czasem w drodze.",
    emptyAction: "Wychodzę w teren",
  },

  auth: {
    optional: "opcjonalnie",
    /* В приложении вход обязателен (подписка привязана к учётной записи),
       на сайте трек по-прежнему открыт — отсюда две пары подписей. */
    required: "wymagane",
    signInTitle: "Zaloguj się, żeby synchronizować",
    signInBody:
      "Zapis działa bez konta. Logowanie jest potrzebne do subskrypcji i do tego, żeby historia przetrwała zmianę telefonu.",
    signInBodyRequired:
      "Subskrypcja jest przypisana do tego konta — dzięki temu przechodzi na nowy telefon.",
    google: "Kontynuuj z Google",
    apple: "Kontynuuj z Apple",
    orWithEmail: "albo e-mailem",
    email: "e-mail",
    password: "hasło",
    show: "Pokaż",
    hide: "Ukryj",
    forgot: "Nie pamiętasz hasła?",
    signIn: "Zaloguj się",
    noAccount: "Nie masz konta?",
    createOne: "Załóż je",
    registerTitle: "Załóż konto",
    registerBody:
      "Potrzebne tylko do subskrypcji i historii na kilku urządzeniach.",
    passwordHint: "co najmniej 8 znaków",
    strengthWeak: "słabe",
    strengthDecent: "niezłe",
    strengthStrong: "mocne",
    createAccount: "Załóż konto",
    legal:
      "Kontynuując, akceptujesz Warunki korzystania i Politykę prywatności.",
    uploadNote:
      "Wyprawy zapisane już na tym telefonie wyślemy po pierwszym zalogowaniu.",
    resetTitle: "Zresetuj hasło",
    resetBody: "Wyślemy link e-mailem. Jest ważny przez godzinę.",
    sendLink: "Wyślij link",
    linkSent: "Sprawdź skrzynkę — link jest w drodze.",
    linkExpiredTitle: "Ten link już nie działa",
    linkExpiredBody:
      "Linki do resetu wygasają po godzinie i działają raz. Poproś o nowy powyżej.",
    newPassword: "nowe hasło",
    newPasswordUnavailable: "nowe hasło · niedostępne",
    savePassword: "Zapisz hasło",
    haveAccount: "Masz już konto?",
  },

  /**
   * Длительность пробного периода нигде не записана числом: `{days}` приходит
   * из FLAVORS.wayback.subscriptionPlan.trialDays, который обязан совпадать со
   * сторами. Так «3 дня» не могут разойтись с App Store Connect и Google Play.
   */
  paywall: {
    title: "WayBack Premium",
    /* Тарифа два — неделя и год. Месячного нет: см. FLAVORS.wayback. */
    weekly: "Tydzień",
    yearly: "Rok",
    /** Выбор тарифа для чтения с экрана: подписи «Tydzień»/«Rok» сами по себе не объясняют, что это группа. */
    planPickerLabel: "Wybierz plan",
    trialBadge:
      "{days, plural, one {# dzień za darmo} few {# dni za darmo} many {# dni za darmo} other {# dnia za darmo}}",
    /**
     * Выгода годового против 52 недельных списаний. Процент считает
     * `yearlySavings` по ценам стора — числа в тексте нет намеренно, иначе
     * оно разошлось бы с валютой покупателя.
     */
    saveBadge: "taniej o {percent}%",
    planHintYearly:
      "{days, plural, one {# dzień za darmo} few {# dni za darmo} many {# dni za darmo} other {# dnia za darmo}} · {price} / tydzień",
    perWeek: "/ tydzień",
    perYear: "/ rok",
    f1: "Bez limitu obszarów mapy offline",
    f2: "Pełna historia wypraw, zsynchronizowana między telefonami",
    f3: "Warstwa satelitarna i maksymalna szczegółowość",
    cta: "{days, plural, one {Zacznij # dzień za darmo} few {Zacznij # dni za darmo} many {Zacznij # dni za darmo} other {Zacznij # dnia za darmo}}",
    renewNote:
      "Potem {price} {period}. Odnawia się automatycznie, możesz anulować w każdej chwili w {store}.",
    /* Полное раскрытие условий — требование обоих сторов на экране покупки.
       Периодичность списания называется по выбранному тарифу: «tygodniowo» и
       «rocznie» — разные обещания, подставлять одно вместо другого нельзя. */
    termsTitle: "Zanim się zapiszesz",
    termsTrialWeek:
      "{days, plural, one {# dzień za darmo} few {# dni za darmo} many {# dni za darmo} other {# dnia za darmo}}, potem {price} tygodniowo.",
    termsTrialYear:
      "{days, plural, one {# dzień za darmo} few {# dni za darmo} many {# dni za darmo} other {# dnia za darmo}}, potem {price} rocznie.",
    termsRenewWeek:
      "Subskrypcja odnawia się automatycznie co tydzień, dopóki jej nie anulujesz.",
    termsRenewYear:
      "Subskrypcja odnawia się automatycznie co rok, dopóki jej nie anulujesz.",
    termsCancel:
      "Możesz anulować w każdej chwili w {store}, najpóźniej 24 godziny przed końcem okresu.",
    termsAccount:
      "Opłatę pobieramy z twojego konta {store}. Subskrypcja jest z nim powiązana.",
    terms: "Warunki korzystania (EULA)",
    privacy: "Polityka prywatności",
    restore: "Przywróć",
    /**
     * Отказ, причину которого не назвал ни стор, ни наш сервер. Здесь обязан
     * стоять именно текст ошибки: раньше на это место подставлялась подпись
     * кнопки, и человек с оплаченной подпиской читал в красной рамке
     * приглашение начать пробный период.
     */
    purchaseFailed:
      "Zakup się nie powiódł. Spróbuj jeszcze raz albo użyj „Przywróć”, jeśli płatność już przeszła.",
    nothingRestored:
      "Na tym koncie {store} nie ma subskrypcji. Sprawdź, czy logujesz się kontem, z którego szła płatność.",
    webNote:
      "Subskrypcję kupuje się w aplikacji mobilnej — otwórz WayBack na telefonie.",
    activeBadge: "Aktywna",
    activeTitle: "Premium do {date}",
    activeMeta: "{plan} · odnawia się automatycznie · {price}",
    planWeekly: "Plan tygodniowy",
    planYearly: "Plan roczny",
    manage: "Zarządzaj subskrypcją",
    unlockedTitle: "Co masz odblokowane",
    unlockedAreas: "Obszary offline",
    unlockedAreasValue: "bez limitu",
    unlockedSync: "Synchronizacja historii",
    unlockedSatellite: "Warstwa satelitarna",
    on: "tak",
    billingNote:
      "Płatności idą przez {store}. Po anulowaniu Premium działa do końca opłaconego okresu.",
    storeApple: "App Store",
    storeGoogle: "Google Play",
  },

  /**
   * Стартовый гейт нативной оболочки: вход → пробный период → приложение.
   * Экран объясняет, почему шаг обязателен, и всегда оставляет выход — иначе
   * человек застревает в тупике, а ревьюер стора отклоняет приложение.
   */
  gate: {
    eyebrow: "pierwsze kroki",
    authTitle: "Zaloguj się, żeby zacząć",
    authBody:
      "WayBack Premium jest przypisany do konta: dzięki temu okres próbny przetrwa zmianę telefonu, a „Przywróć zakupy” go odnajdzie.",
    authEmail: "Kontynuuj e-mailem",
    subTitle: "Zacznij okres próbny",
    /**
     * Две строки, потому что тарифов на экране бывает один или два — список
     * приходит из стора. Обещать выбор там, где его нет, нельзя.
     */
    subBody:
      "{days, plural, one {# dzień za darmo, potem plan roczny} few {# dni za darmo, potem plan roczny} many {# dni za darmo, potem plan roczny} other {# dnia za darmo, potem plan roczny}}. Anuluj przed końcem i nic nie zapłacisz.",
    subBodyChoice:
      "{days, plural, one {# dzień za darmo w obu planach} few {# dni za darmo w obu planach} many {# dni za darmo w obu planach} other {# dnia za darmo w obu planach}}. Anuluj przed końcem okresu próbnego i nic nie zapłacisz.",
    signedInAs: "zalogowano jako {email}",
    switchAccount: "Użyj innego konta",
    offlineTitle: "Brak połączenia",
    offlineBody:
      "Okres próbny trzeba raz uruchomić w sieci — {store} bez internetu nie zadziała. Potem WayBack radzi sobie w terenie zupełnie bez zasięgu.",
    offlineRestore: "Masz już subskrypcję? Przywróć zakupy",
    retry: "Spróbuj jeszcze raz",
    checking: "Sprawdzamy twoją subskrypcję…",
    nothingRestored:
      "Na tym koncie {store} nie ma subskrypcji. Sprawdź, czy logujesz się kontem, z którego szła płatność.",
  },

  account: {
    title: "Moje konto",
    edit: "Edytuj",
    premiumActive: "Premium aktywne",
    premiumUntil: "do {date}",
    noSubscription: "Brak subskrypcji",
    noSubscriptionHint: "Obszary offline i synchronizacja są ograniczone",
    subscribe: "Wykup",
    manage: "Zarządzaj",
    password: "Hasło",
    passwordChanged: "zmienione {date}",
    passwordNever: "nigdy nie zmieniane",
    change: "Zmień",
    twoFactor: "Dwa składniki",
    twoFactorOff: "wył.",
    twoFactorOn: "wł.",
    setUp: "Skonfiguruj",
    appLock: "Blokada aplikacji ({method})",
    appLockBody: "Pytaj o {method} przy otwieraniu aplikacji",
    localTitle: "Wyprawy na tym telefonie",
    localBody:
      "Lokalnie zapisano {count, plural, one {# wyprawę} few {# wyprawy} many {# wypraw} other {# wyprawy}}. Usunięcie konta nie kasuje ich z telefonu.",
    localNone: "Na tym telefonie nie ma jeszcze wypraw.",
    deleteAccount: "Usuń konto",
    logout: "Wyloguj",
    close: "Zamknij",
    biometry: "Face ID",
  },

  deleteAccount: {
    title: "Usuń konto",
    graceTitle: "Masz 14 dni, żeby zmienić zdanie",
    graceBody:
      "Usunięcie jest zaplanowane, nie natychmiastowe. Zaloguj się ponownie w ciągu 14 dni, a konto wróci.",
    confirmLabel: "wpisz swój e-mail, żeby potwierdzić",
    schedule: "Zaplanuj usunięcie",
    keep: "Zostaw moje konto",
    localTitle: "Twoje wyprawy zostają na tym telefonie",
    localBody:
      "Usunięcie konta nie rusza lokalnej historii ani pobranych obszarów mapy. Żeby je skasować, odinstaluj aplikację.",
    supportNote:
      "Nie masz dostępu do konta? Napisz na {email} — usunięcie realizujemy w ciągu 30 dni.",
    mismatch: "E-mail nie zgadza się z kontem.",
    failed: "Nie udało się zaplanować usunięcia. Spróbuj jeszcze raz.",
    storeNote:
      "Aktywna subskrypcja nie anuluje się sama — anuluj ją w {store}.",
  },

  splash: {
    tagline: "Pamięta twój punkt startu",
    footer: "działa offline · bez konta",
  },

  landing: {
    tagline: "Zawsze wróć do punktu startu",
    text: "Zaznacz punkt wejścia — strzałka i mapa offline poprowadzą cię z powrotem nawet bez internetu i zasięgu. Mapę swojej okolicy pobierz wcześniej.",
    cta: "Otwórz mapę",
    poweredBy: "Działa na technologii SkyForest",
  },
} as const;

/**
 * Блок `flavor.wayback` общего словаря — тексты про задачу приложения
 * (`src/lib/useFlavorBrand.ts`). Живёт здесь, а не в pl.ts: копия приложения
 * принадлежит приложению, ровно как `checkerBrand` в checker.*.ts.
 */
export const waybackBrand = {
  tagline: "Zawsze wyprowadzi cię z powrotem",
  metaDescription:
    "WayBack pamięta twój punkt wejścia w teren i zawsze pokazuje strzałkę oraz dystans do powrotu. Działa bez zasięgu.",
  authSubtitle: "Zaloguj się, żeby wykupić subskrypcję i synchronizować wyprawy.",
  accountSubtitle: "Profil, subskrypcja i ustawienia konta.",
  accountDeleteHint:
    "Usunięcia konta nie da się cofnąć: znikną profil i wyprawy zsynchronizowane w chmurze. Subskrypcję ze sklepu trzeba anulować osobno, w App Store albo Google Play.",
  accountDeleteNote:
    "Wypraw i map offline zapisanych na tym telefonie to nie dotyczy — usuń je w aplikacji.",
  lockBody: "Odblokuj Face ID, żeby otworzyć WayBack.",
  deletedItems: [
    "Profil (imię i adres e-mail)",
    "Wyprawy zsynchronizowane w chmurze",
    "Tokeny powiadomień twoich urządzeń",
    "Zapisy o subskrypcji po naszej stronie",
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
    skipToContent: "Przejdź do treści głównej",
  },
  common: {
    updateTitle: "Jest aktualizacja",
    updateBody:
      "Masz wersję {current}. Dostępna jest {latest} — zaktualizuj aplikację, żeby mieć najnowsze poprawki.",
    updateNow: "Zaktualizuj",
    updateLater: "Później",
  },
  footer: {
    offer: "Warunki korzystania",
    privacy: "Prywatność",
    deleteAccount: "Usuń konto",
  },
  auth: {
    socialError: "Logowanie się nie powiodło. Spróbuj jeszcze raz.",
    authFailed: "Nie udało się zweryfikować konta. Spróbuj jeszcze raz.",
    invalidCredentials: "Błędny e-mail lub hasło",
    alreadyRegistered:
      "Ten e-mail jest już zarejestrowany. Zaloguj się albo zresetuj hasło.",
    checkEmail: "Sprawdź skrzynkę",
    mfaCheckTitle: "Weryfikacja dwuskładnikowa",
    mfaCodeSubtitle: "Wpisz sześciocyfrowy kod z aplikacji uwierzytelniającej",
    mfaChecking: "Sprawdzamy…",
    mfaAppHelp:
      "Otwórz Google Authenticator, Authy albo inną aplikację i wpisz aktualny kod",
    mfaLogoutOther: "Wyloguj się i użyj innej metody",
    mfaError: "Weryfikacja się nie powiodła. Spróbuj jeszcze raz.",
    mfaInvalid: "Błędny kod. Spróbuj jeszcze raz.",
    passwordMismatch: "Hasła się nie zgadzają",
    passwordMin: "Hasło musi mieć co najmniej 6 znaków",
    passwordUpdated: "Hasło zmienione",
  },
  account: {
    metaTitle: "Moje konto",
    biometric: {
      lockTitle: "{app} jest zablokowana",
      lockBody: "Odblokuj Face ID, żeby twoje miejsca zostały prywatne.",
      unlock: "Odblokuj",
      authenticating: "Sprawdzamy tożsamość…",
    },
    pw: {
      minChars: "Co najmniej 6 znaków",
      mismatch: "Hasła się nie zgadzają",
      newLabel: "Nowe hasło",
      newPlaceholder: "Co najmniej 6 znaków",
      confirmLabel: "Potwierdź hasło",
      confirmPlaceholder: "Powtórz hasło",
      changed: "Hasło zmienione",
      submit: "Zmień hasło",
    },
    twoFa: {
      enableError: "Nie udało się włączyć weryfikacji dwuskładnikowej",
      verifyError: "Weryfikacja się nie powiodła",
      wrongCode: "Błędny kod. Spróbuj jeszcze raz.",
      protectedHint: "Twoje konto chroni aplikacja uwierzytelniająca",
      addHint: "Dodaj kolejną warstwę ochrony konta",
      disable: "Wyłącz",
      enable: "Włącz",
      scanQr: "Zeskanuj kod QR w aplikacji uwierzytelniającej",
      appsHint: "Google Authenticator, Authy albo inna aplikacja TOTP",
      qrAlt: "Kod QR do weryfikacji dwuskładnikowej",
      manualKey: "Albo wpisz klucz ręcznie:",
      enterCode: "Wpisz kod z aplikacji",
    },
  },
  notFound: {
    title: "Nie znaleziono strony",
    home: "Wróć na stronę główną",
  },
} as const;
