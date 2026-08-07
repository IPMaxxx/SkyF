/**
 * WayBack — español (es-ES).
 *
 * Зеркало wayback.en.ts: набор ключей обязан совпадать (это проверяет
 * fastlane/.wayback-locales-check.mjs). Терминология выбрана нейтральной, как в
 * английском: «ruta» вместо «excursión»/«senderismo» — приложением одинаково
 * пользуются в горах, у озера и в лесу.
 *
 * Формы без рода: «Ya estoy de vuelta», «Entré por aquí» — приложение не знает
 * пол пользователя.
 */
export default {
  /** Нижнее меню: четыре пункта, подписи должны быть короткими. */
  tabs: {
    label: "Menú principal",
    home: "Ruta",
    offline: "Offline",
    history: "Historial",
    more: "Más",
  },

  menu: {
    close: "Cerrar",
    moreTitle: "Más",
    subscription: "Suscripción",
    account: "Mi cuenta",
    otherApps: "nuestras otras apps",
    skyforestName: "SkyForest",
    skyforestHint: "Setas, previsión y mapas",
    checkerName: "Mushroom Checker",
    checkerHint: "Identifica una seta por foto",
    language: "idioma",
    units: "unidades",
    unitsKm: "km",
    unitsMi: "mi",
    logout: "Cerrar sesión",
    signIn: "Iniciar sesión",
    anonymous: "Sin sesión iniciada",
    anonymousHint: "La ruta funciona sin cuenta",
    trialLeft:
      "prueba · {days, plural, one {queda # día} other {quedan # días}}",
    premium: "premium",
  },

  home: {
    /** Слово на главной кнопке — английское во всех локалях, это знак действия. */
    start: "Start",
    startButton: "Me voy de ruta",
    startingButton: "Buscando tu posición…",
    pickOnMap: "Marcar la entrada en el mapa",
    howTitle: "Cómo funciona",
    how1: "Toca donde empiezas: dejamos un ancla por GPS",
    /**
     * Про запись — два варианта. Нейтральный верен везде, включая сборки без
     * фоновой службы и браузер; сильный показывается только там, где своя
     * служба переднего плана действительно есть. Выбор — lib/wayback/recordingCopy.
     */
    how2: "Los puntos se marcan al andar, sin gastar batería",
    how2Background:
      "Los puntos se marcan al andar: la grabación sigue con la pantalla apagada y la app en segundo plano",
    how3: "La flecha y la distancia te traen de vuelta, sin internet",
    localOnly:
      "La ruta se graba en este teléfono; las rutas terminadas se guardan en tu cuenta.",
    mapLocating: "buscando tu posición…",
    mapHere: "estás aquí · {coords}",
    mapLastKnown: "última zona conocida · toca la diana",
    mapDenied: "la ubicación está desactivada: actívala en ajustes",
    mapNoFix: "aún sin posición · toca la diana para reintentar",
    mapLocate: "Ver mi ubicación",
    mapSaveArea: "Guardar esta zona para usarla sin conexión",
    offlineMap: "Mapa offline",
    offlineMapNone: "aún no hay zonas",
    offlineMapDownload: "Descargar",
    offlineMapCount:
      "{count, plural, one {# zona guardada} other {# zonas guardadas}}",
    history: "Historial",
    historyNone: "aún no hay rutas",
    historyOpen: "Abrir",
    historyCount: "{count, plural, one {# ruta} other {# rutas}}",
    signInTitle: "Inicia sesión para sincronizar tus rutas",
    signInBody: "Es opcional: la ruta funciona sin cuenta",
    signInAction: "Iniciar sesión",
  },

  picker: {
    title: "Toca el mapa para colocar tu punto de entrada",
    lastKnown: "usando la última posición conocida",
    noFix: "aún sin posición",
    accuracy: "±{m} m",
    confirm: "Entré por aquí",
    cancel: "Cancelar",
    zoomIn: "Acercar",
    zoomOut: "Alejar",
    locate: "Usar mi ubicación",
  },

  // Журнал записи пути: техническая выписка для нас, подписи — для человека,
  // который её присылает.
  diagnostics: {
    title: "Registro de grabación",
    hint: "Notas técnicas de los últimos eventos de grabación; se guardan haya o no una ruta en marcha. Cópialas y envíalas a soporte: normalmente nos basta para ver qué ha fallado.",
    empty: "Todavía no hay nada registrado.",
    copy: "Copiar el registro",
    copied: "Registro copiado",
    clear: "Borrar",
    close: "Cerrar",
  },

  active: {
    title: "De camino",
    toEntry: "hasta la entrada",
    onTheWalk: "en ruta",
    atTheEntry: "estás en la entrada",
    since: "desde las {time}",
    directionText: "Punto de entrada: {dir}, {dist}",
    fromCourse: "dirección según tu rumbo GPS",
    fromCompass: "dirección según la brújula: sujeta el teléfono en horizontal",
    unknownLine1: "dirección",
    unknownLine2: "sin determinar",
    unknownBody:
      "Da unos pasos y leeremos la dirección de tu rumbo GPS. ¿Te has parado? Enciende la brújula.",
    enableCompass: "Encender la brújula",
    compassUnavailable:
      "Este teléfono no tiene brújula: guíate por el punto cardinal y la línea discontinua del mapa.",
    anchorSafe:
      "El ancla queda guardada igualmente: sin brújula te diremos el punto cardinal, «{example}».",
    anchorSafeExample: "noroeste, 850 m",
    map: "Mapa",
    layerTrails: "Senderos",
    layerSatellite: "Satélite",
    expandMap: "Abrir el mapa a pantalla completa",
    /**
     * Причина разрыва зависит от сборки, поэтому строк две. Без фоновой службы
     * пунктир — это уход в фон, и называть причину нечестно: карта её не знает.
     * Со службой запись фон переживает, и остаётся ровно одна причина —
     * телефон не видел спутников. Выбор — lib/wayback/recordingCopy.
     */
    gapHint: "discontinua · tramos sin grabar",
    gapHintBackground:
      "discontinua · tramos donde el teléfono no veía los satélites",
    /**
     * Постоянное уведомление Android, пока идёт запись. Android показывает его
     * всё время похода, поэтому текст должен объяснять, почему оно тут, и не
     * пугать: без службы переднего плана система запись останавливает.
     */
    bgNotice: {
      title: "Grabando tu camino de vuelta",
      message: "Guarda el rastro hasta tu punto de entrada con la pantalla apagada",
      /**
       * Уведомления выключены: запись идёт, но человек её не видит. Android
       * второй раз диалог не покажет, поэтому единственный выход — настройки.
       */
      blockedTitle: "Las notificaciones de WayBack están desactivadas",
      blockedBody:
        "La ruta se está grabando, pero no la verás en la pantalla de bloqueo.",
      blockedAction: "Activar",
    },
    /**
     * Состояние записи словами. Молчать о том, что путь не пишется, нельзя:
     * человек узнаёт об этом, только когда путь уже понадобился, — а именно
     * так поломка записи и доехала однажды до всех установленных приложений.
     */
    recordingIssue: {
      offTitle: "El rastro no se está grabando",
      offBody: "Ahora mismo no hay acceso a la ubicación. Empieza la ruta otra vez.",
      /**
       * Спокойный тон намеренно: путь пишется, просто с погашенным экраном
       * запись прервётся. Пугать тут нечем.
       */
      foregroundOnlyTitle: "Grabando mientras la app está abierta",
      foregroundOnlyBody: "Con la pantalla apagada el rastro puede tener huecos.",
      updateBody:
        "Actualiza WayBack para que el rastro siga con la pantalla apagada.",
      preciseBody:
        "Permite la ubicación precisa para que el rastro siga con la pantalla apagada.",
      locationDeniedBody:
        "Permite que WayBack use la ubicación para que el rastro siga con la pantalla apagada.",
      preciseAction: "Ajustes",
    },
    /**
     * Строка состояния на экране похода. Тост человек пролистывает, а спросить
     * его «что было написано» потом невозможно — значит состояние записи должно
     * быть видно в любой момент, вместе с кодом отказа для пересылки.
     */
    recordingStatus: {
      on: "Grabando con la pantalla apagada",
      foregroundOnly: "Grabando con la app abierta",
      off: "El rastro no se está grabando",
      bodyOn: "La notificación de arriba se queda hasta que termines la ruta.",
      bodyNoNotice:
        "La grabación funciona, pero la notificación está oculta: actívalas para verla en la pantalla de bloqueo.",
      bodyStarting: "Preparando la grabación con la pantalla apagada…",
      bodyForegroundOnly:
        "La grabación con la pantalla apagada no está activa, así que el rastro puede tener huecos.",
      bodyNothing: "Ahora mismo no hay acceso a la ubicación.",
      bodyUnsupported:
        "Esta versión solo graba con la app abierta. Actualiza WayBack para grabar con la pantalla apagada.",
      bodyLocationDenied: "WayBack no tiene acceso a la ubicación.",
      bodyPrecise:
        "La ubicación precisa está desactivada, así que no puede empezar la grabación con la pantalla apagada.",
      bodyLocationOff: "La ubicación está desactivada en este teléfono.",
      bodyFailed: "El teléfono no ha dejado arrancar el servicio de grabación.",
      settings: "Abrir ajustes",
      copy: "copiar el código",
      copied: "Código copiado",
    },
    offlineMapTitle: "Mapa offline",
    offlineMapAround:
      "{count, plural, one {# zona} other {# zonas}} · {radius} km alrededor del ancla",
    offlineMapNone: "no hay zonas alrededor del ancla",
    offlineMapManage: "Gestionar",
    finish: "Ya estoy de vuelta",
  },

  finish: {
    title: "¿Terminar esta ruta?",
    body: "La guardaremos en tu historial con la distancia y la duración. Después la flecha deja de funcionar.",
    stats: "{duration} · {distance} máx · {points}",
    points: "{count, plural, one {# punto} other {# puntos}}",
    confirm: "Sí, terminar",
    cancel: "Cancelar",
  },

  /**
   * Предсохранение карты по виду на экране: касание задаёт место, зум — охват
   * и детализацию. Второй вход рядом с «радиус × детализация» ниже.
   */
  area: {
    title: "Elige una zona para guardar",
    hint: "toca el mapa para mover el recuadro · el zoom cambia la zona",
    hintLocked: "la zona queda fija durante la descarga",
    selection: "zona seleccionada",
    size: "{width} × {height} km · zoom {minZoom}–{maxZoom}",
    measuring: "midiendo la zona…",
    estimate: "≈ {tiles} teselas · {size} de descarga",
    layers: "capas de senderos y satélite",
    reused:
      "{count, plural, one {# tesela ya guardada, no se descarga otra vez} other {# teselas ya guardadas, no se descargan otra vez}}",
    alreadySaved: "Esta zona ya está guardada. Mueve el recuadro o aleja el mapa.",
    large:
      "{size} son muchos datos móviles: mejor con Wi-Fi. Un paso de zoom más cerca reduce la zona a la cuarta parte.",
    tooLarge:
      "{size} es demasiado para una sola descarga. Acerca el mapa para reducir la zona.",
    save: "Guardar esta zona",
    close: "Listo",
    cancel: "Cancelar",
    downloading: "Guardando la zona…",
    progress: "{done} / {total}",
    progressSize: "{done} de {size} · no cierres la app",
    progressReused:
      "{count, plural, one {# tesela tomada del almacenamiento} other {# teselas tomadas del almacenamiento}}",
    savedToast: "Zona guardada para usarla sin conexión",
    partialToast: "Guardada; {failed} teselas omitidas (red)",
    stoppedToast: "Detenida · {size} guardados",
    stoppedEmptyToast: "Descarga detenida",
    errorToast: "No se ha podido guardar la zona. Inténtalo otra vez.",
    locateError: "No se ha podido obtener tu ubicación",
    zoomIn: "Acercar",
    zoomOut: "Alejar",
    locate: "Usar mi ubicación",
    regionName: "{size} · z{minZoom}–{maxZoom} · {date}",
    regionPartial: "{size} · z{minZoom}–{maxZoom} · {date} · detenida",
  },

  offline: {
    title: "Mapa offline",
    intro:
      "Descarga las teselas de tu zona y el mapa se seguirá dibujando sin cobertura.",
    pickOnMap: "Elegir una zona en el mapa",
    pickOnMapHint: "toca el sitio, el zoom da el detalle",
    centre: "centro · {coords}",
    noCentre: "aún no hay centro",
    useLocation: "Usar mi ubicación",
    gettingLocation: "Buscando tu posición…",
    radius: "radio de la zona",
    radiusLocked: "radio de la zona · fijo durante la descarga",
    detail: "nivel de detalle",
    detailBasic: "Básico",
    detailMedium: "Medio",
    detailMax: "Máximo",
    detailBasicHint:
      "Básico: un mapa general, la descarga más pequeña. El detalle fino se guarda solo mientras tengas red.",
    detailMediumHint:
      "Medio: senderos visibles hasta el zoom 15. Cada nivel extra multiplica la descarga por cuatro.",
    detailMaxHint:
      "Máximo: todo el detalle para andar, sin conexión. La descarga puede ser muy grande.",
    estimate: "≈ {tiles} teselas · {size}",
    layers: "capas de senderos y satélite",
    download: "Descargar esta zona",
    downloading: "Descargando…",
    progress: "{done} / {total}",
    progressSize: "{done} de {total} · no cierres la app",
    cancel: "Cancelar",
    stored: "Zonas descargadas",
    storedEmpty: "Todavía no hay zonas offline.",
    storedEmptyHint: "Descarga una antes de quedarte sin cobertura.",
    storedHint: "Toca una zona para verla en el mapa.",
    regionMeta: "{radius} km · {quality} · {date}",
    regionSize: "{tiles} teselas · {size} · z{minZoom}–{maxZoom}",
    delete: "Eliminar la zona",
    deleted: "Zona offline eliminada",
    savedToast: "Zona guardada para usarla sin conexión",
    partialToast: "Guardada; {failed} teselas omitidas (red)",
    errorToast: "No se ha podido descargar la zona. Inténtalo otra vez.",
    closePreview: "Cerrar",
  },

  history: {
    title: "Historial",
    count: "{count, plural, one {# ruta} other {# rutas}}",
    localBadge: "en este teléfono",
    meta: "{duration} · {distance}",
    points: "{count, plural, one {# punto} other {# puntos}}",
    delete: "Eliminar la ruta",
    deleteConfirm: "¿Eliminar?",
    deleted: "Ruta eliminada",
    deleteError: "No se ha podido eliminar la ruta. Inténtalo otra vez.",
    localNote:
      "Las rutas marcadas «en este teléfono» solo viven aquí. Inicia sesión para conservarlas si cambias de móvil.",
    emptyTitle: "Todavía no hay rutas guardadas",
    emptyBody:
      "Termina tu primera ruta y aparecerá aquí, con el mapa, la distancia y el tiempo de camino.",
    emptyAction: "Me voy de ruta",
  },

  auth: {
    optional: "opcional",
    /* В приложении вход обязателен (подписка привязана к учётной записи),
       на сайте трек по-прежнему открыт — отсюда две пары подписей. */
    required: "obligatorio",
    signInTitle: "Inicia sesión para sincronizar",
    signInBody:
      "La ruta funciona sin cuenta. La sesión sirve para la suscripción y para conservar el historial al cambiar de móvil.",
    signInBodyRequired:
      "Tu suscripción va unida a esta cuenta: así te acompaña al siguiente teléfono.",
    google: "Continuar con Google",
    apple: "Continuar con Apple",
    orWithEmail: "o con tu correo",
    email: "correo",
    password: "contraseña",
    show: "Mostrar",
    hide: "Ocultar",
    forgot: "¿Has olvidado la contraseña?",
    signIn: "Iniciar sesión",
    noAccount: "¿No tienes cuenta?",
    createOne: "Crear una",
    registerTitle: "Crear cuenta",
    registerBody:
      "Solo hace falta para la suscripción y el historial en varios dispositivos.",
    passwordHint: "mínimo 8 caracteres",
    strengthWeak: "débil",
    strengthDecent: "aceptable",
    strengthStrong: "segura",
    createAccount: "Crear cuenta",
    legal:
      "Al continuar aceptas las Condiciones de uso y la Política de privacidad.",
    uploadNote:
      "Las rutas ya guardadas en este teléfono se subirán después de tu primer inicio de sesión.",
    resetTitle: "Restablecer la contraseña",
    resetBody: "Te enviaremos un enlace por correo. Es válido durante una hora.",
    sendLink: "Enviar el enlace",
    linkSent: "Mira tu correo: el enlace va de camino.",
    linkExpiredTitle: "Este enlace ya no vale",
    linkExpiredBody:
      "Los enlaces de recuperación caducan en una hora y sirven una sola vez. Pide uno nuevo arriba.",
    newPassword: "nueva contraseña",
    newPasswordUnavailable: "nueva contraseña · no disponible",
    savePassword: "Guardar la contraseña",
    haveAccount: "¿Ya tienes cuenta?",
  },

  /**
   * Длительность пробного периода нигде не записана числом: `{days}` приходит
   * из FLAVORS.wayback.subscriptionPlan.trialDays, который обязан совпадать со
   * сторами. Так «3 дня» не могут разойтись с App Store Connect и Google Play.
   */
  paywall: {
    title: "WayBack Premium",
    /* Тарифа два — неделя и год. Месячного нет: см. FLAVORS.wayback. */
    weekly: "Semanal",
    yearly: "Anual",
    /** Выбор тарифа для чтения с экрана: подписи «Semanal»/«Anual» сами по себе не объясняют, что это группа. */
    planPickerLabel: "Elige un plan",
    trialBadge: "{days, plural, one {# día gratis} other {# días gratis}}",
    /**
     * Выгода годового против 52 недельных списаний. Процент считает
     * `yearlySavings` по ценам стора — числа в тексте нет намеренно, иначе
     * оно разошлось бы с валютой покупателя.
     */
    saveBadge: "ahorra {percent}%",
    planHintYearly:
      "{days, plural, one {# día gratis} other {# días gratis}} · {price} / semana",
    perWeek: "/ semana",
    perYear: "/ año",
    f1: "Zonas de mapa offline sin límite",
    f2: "Historial completo, sincronizado entre móviles",
    f3: "Capa de satélite y detalle máximo",
    cta: "{days, plural, one {Empezar # día gratis} other {Empezar # días gratis}}",
    renewNote:
      "Después {price} {period}. Se renueva sola; puedes cancelarla cuando quieras en {store}.",
    /* Полное раскрытие условий — требование обоих сторов на экране покупки.
       Периодичность списания называется по выбранному тарифу: «por semana» и
       «al año» — разные обещания, подставлять одно вместо другого нельзя. */
    termsTitle: "Antes de suscribirte",
    termsTrialWeek:
      "{days, plural, one {# día gratis} other {# días gratis}} y después {price} por semana.",
    termsTrialYear:
      "{days, plural, one {# día gratis} other {# días gratis}} y después {price} al año.",
    termsRenewWeek:
      "La suscripción se renueva automáticamente cada semana hasta que la canceles.",
    termsRenewYear:
      "La suscripción se renueva automáticamente cada año hasta que la canceles.",
    termsCancel:
      "Puedes cancelarla cuando quieras en {store}, al menos 24 horas antes de que acabe el periodo.",
    termsAccount:
      "El cobro se hace en tu cuenta de {store}. La suscripción va unida a ella.",
    terms: "Condiciones de uso (EULA)",
    privacy: "Política de privacidad",
    restore: "Restaurar",
    /**
     * Отказ, причину которого не назвал ни стор, ни наш сервер. Здесь обязан
     * стоять именно текст ошибки: раньше на это место подставлялась подпись
     * кнопки, и человек с оплаченной подпиской читал в красной рамке
     * приглашение начать пробный период.
     */
    purchaseFailed:
      "La compra no se ha completado. Inténtalo otra vez o pulsa «Restaurar» si ya has pagado.",
    nothingRestored:
      "No hay ninguna suscripción en esta cuenta de {store}. Comprueba que has entrado con la cuenta que pagó.",
    webNote:
      "Las suscripciones se compran en la app móvil: abre WayBack en tu teléfono.",
    activeBadge: "Activa",
    activeTitle: "Premium hasta el {date}",
    activeMeta: "{plan} · se renueva sola · {price}",
    planWeekly: "Plan semanal",
    planYearly: "Plan anual",
    manage: "Gestionar la suscripción",
    unlockedTitle: "Lo que tienes desbloqueado",
    unlockedAreas: "Zonas offline",
    unlockedAreasValue: "sin límite",
    unlockedSync: "Sincronización del historial",
    unlockedSatellite: "Capa de satélite",
    on: "sí",
    billingNote:
      "Los cobros pasan por {store}. Si cancelas, Premium sigue hasta el final del periodo pagado.",
    storeApple: "App Store",
    storeGoogle: "Google Play",
  },

  /**
   * Стартовый гейт нативной оболочки: вход → пробный период → приложение.
   * Экран объясняет, почему шаг обязателен, и всегда оставляет выход — иначе
   * человек застревает в тупике, а ревьюер стора отклоняет приложение.
   */
  gate: {
    eyebrow: "primeros pasos",
    authTitle: "Inicia sesión para empezar",
    authBody:
      "WayBack Premium va unido a tu cuenta: así la prueba sobrevive a un móvil nuevo y así la encuentra «Restaurar compras».",
    authEmail: "Continuar con el correo",
    subTitle: "Empieza tu prueba gratis",
    /**
     * Две строки, потому что тарифов на экране бывает один или два — список
     * приходит из стора. Обещать выбор там, где его нет, нельзя.
     */
    subBody:
      "{days, plural, one {# día gratis y después el plan anual} other {# días gratis y después el plan anual}}. Puedes cancelar antes de que acabe y no pagas nada.",
    subBodyChoice:
      "{days, plural, one {# día gratis en cualquiera de los dos planes} other {# días gratis en cualquiera de los dos planes}}. Puedes cancelar antes de que acabe la prueba y no pagas nada.",
    signedInAs: "sesión iniciada como {email}",
    switchAccount: "Usar otra cuenta",
    offlineTitle: "Sin conexión",
    offlineBody:
      "La prueba se activa una sola vez con conexión, porque {store} necesita la red. Después WayBack funciona ahí fuera sin nada de cobertura.",
    offlineRestore: "¿Ya te has suscrito? Restaurar compras",
    retry: "Reintentar",
    checking: "Comprobando tu suscripción…",
    nothingRestored:
      "No hay ninguna suscripción en esta cuenta de {store}. Comprueba que has entrado con la cuenta que pagó.",
  },

  account: {
    title: "Mi cuenta",
    edit: "Editar",
    premiumActive: "Premium activo",
    premiumUntil: "hasta el {date}",
    noSubscription: "Sin suscripción",
    noSubscriptionHint: "Las zonas offline y la sincronización están limitadas",
    subscribe: "Suscribirme",
    manage: "Gestionar",
    password: "Contraseña",
    passwordChanged: "cambiada el {date}",
    passwordNever: "nunca cambiada",
    change: "Cambiar",
    twoFactor: "Doble factor",
    twoFactorOff: "no",
    twoFactorOn: "sí",
    setUp: "Configurar",
    appLock: "Bloqueo de la app ({method})",
    appLockBody: "Pedir {method} al abrir la app",
    localTitle: "Rutas en este teléfono",
    localBody:
      "{count, plural, one {# ruta guardada} other {# rutas guardadas}} en local. Eliminar la cuenta no las borra de este móvil.",
    localNone: "Todavía no hay rutas guardadas en este teléfono.",
    deleteAccount: "Eliminar la cuenta",
    logout: "Cerrar sesión",
    close: "Cerrar",
    biometry: "Face ID",
  },

  deleteAccount: {
    title: "Eliminar la cuenta",
    graceTitle: "Tienes 14 días para cambiar de idea",
    graceBody:
      "El borrado se programa, no es inmediato. Vuelve a iniciar sesión en 14 días y la cuenta se restaura.",
    confirmLabel: "escribe tu correo para confirmar",
    schedule: "Programar el borrado",
    keep: "Conservar mi cuenta",
    localTitle: "Tus rutas se quedan en este teléfono",
    localBody:
      "El historial local y las zonas de mapa descargadas no se tocan al eliminar la cuenta. Desinstala la app para borrarlos.",
    supportNote:
      "¿No tienes acceso a la cuenta? Escribe a {email}: tramitamos el borrado en un plazo de 30 días.",
    mismatch: "El correo no coincide con el de la cuenta.",
    failed: "No se ha podido programar el borrado. Inténtalo otra vez.",
    storeNote:
      "Una suscripción activa no se cancela sola: cancélala en {store}.",
  },

  splash: {
    tagline: "Recuerda dónde empezaste",
    footer: "funciona offline · sin cuenta",
  },

  landing: {
    tagline: "Vuelve siempre al punto de partida",
    text: "Marca por dónde entraste: la flecha y el mapa offline te llevan de vuelta aunque no haya internet ni cobertura. Descarga antes el mapa de tu zona.",
    cta: "Abrir el mapa",
    poweredBy: "Con tecnología de SkyForest",
  },
} as const;

/**
 * Блок `flavor.wayback` общего словаря — тексты про задачу приложения
 * (`src/lib/useFlavorBrand.ts`). Живёт здесь, а не в es.ts: копия приложения
 * принадлежит приложению, ровно как `checkerBrand` в checker.*.ts.
 */
export const waybackBrand = {
  tagline: "Siempre sabrás volver",
  metaDescription:
    "WayBack recuerda por dónde entraste y te enseña siempre la flecha y la distancia de vuelta. Funciona sin cobertura.",
  authSubtitle: "Inicia sesión para la suscripción y para sincronizar tus rutas.",
  accountSubtitle: "Perfil, suscripción y ajustes de la cuenta.",
  accountDeleteHint:
    "Eliminar la cuenta no tiene vuelta atrás: se borran tu perfil y las rutas sincronizadas en la nube. La suscripción de la tienda se cancela aparte, en App Store o Google Play.",
  accountDeleteNote:
    "Las rutas y los mapas offline guardados en este teléfono no se tocan: bórralos desde la app.",
  lockBody: "Desbloquea con Face ID para abrir WayBack.",
  deletedItems: [
    "El perfil (nombre y correo)",
    "Las rutas sincronizadas en la nube",
    "Los tokens de notificaciones de tus dispositivos",
    "Los registros de suscripción que guardamos",
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
    skipToContent: "Saltar al contenido principal",
  },
  common: {
    updateTitle: "Hay una actualización",
    updateBody:
      "Tienes la versión {current}. Ya está disponible la {latest}: actualiza la app para tener las últimas mejoras.",
    updateNow: "Actualizar",
    updateLater: "Ahora no",
  },
  footer: {
    offer: "Condiciones de uso",
    privacy: "Privacidad",
    deleteAccount: "Eliminar la cuenta",
  },
  auth: {
    socialError: "No se ha podido iniciar sesión. Inténtalo otra vez.",
    authFailed: "No hemos podido verificar tu cuenta. Inténtalo otra vez.",
    invalidCredentials: "Correo o contraseña incorrectos",
    alreadyRegistered:
      "Este correo ya está registrado. Prueba a iniciar sesión o restablece la contraseña.",
    checkEmail: "Mira tu correo",
    mfaCheckTitle: "Verificación en dos pasos",
    mfaCodeSubtitle: "Escribe el código de 6 dígitos de tu app de autenticación",
    mfaChecking: "Comprobando…",
    mfaAppHelp:
      "Abre Google Authenticator, Authy u otra app parecida y escribe el código actual",
    mfaLogoutOther: "Cerrar sesión y usar otro método",
    mfaError: "No se ha podido verificar. Inténtalo otra vez.",
    mfaInvalid: "Código incorrecto. Inténtalo otra vez.",
    passwordMismatch: "Las contraseñas no coinciden",
    passwordMin: "La contraseña debe tener al menos 6 caracteres",
    passwordUpdated: "Contraseña actualizada",
  },
  account: {
    metaTitle: "Mi cuenta",
    biometric: {
      lockTitle: "{app} está bloqueada",
      lockBody: "Desbloquea con Face ID para mantener tus sitios en privado.",
      unlock: "Desbloquear",
      authenticating: "Comprobando tu identidad…",
    },
    pw: {
      minChars: "Mínimo 6 caracteres",
      mismatch: "Las contraseñas no coinciden",
      newLabel: "Nueva contraseña",
      newPlaceholder: "Mínimo 6 caracteres",
      confirmLabel: "Repite la contraseña",
      confirmPlaceholder: "Repite la contraseña",
      changed: "Contraseña cambiada",
      submit: "Cambiar la contraseña",
    },
    twoFa: {
      enableError: "No se ha podido activar la verificación en dos pasos",
      verifyError: "No se ha podido verificar",
      wrongCode: "Código incorrecto. Inténtalo otra vez.",
      protectedHint: "Tu cuenta está protegida con una app de autenticación",
      addHint: "Añade una capa más de protección a tu cuenta",
      disable: "Desactivar",
      enable: "Activar",
      scanQr: "Escanea el código QR con tu app de autenticación",
      appsHint: "Google Authenticator, Authy u otra app TOTP",
      qrAlt: "Código QR para la verificación en dos pasos",
      manualKey: "O escribe la clave a mano:",
      enterCode: "Escribe el código de la app",
    },
  },
  notFound: {
    title: "Página no encontrada",
    home: "Volver al inicio",
  },
} as const;
