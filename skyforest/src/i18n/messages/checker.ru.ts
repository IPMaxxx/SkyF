/** Mushroom Checker — «Soft Product» redesign (русская версия). */

/**
 * Тексты про задачу приложения для общих мест (splash, экран блокировки,
 * метаданные, документы). Попадают в словарь как `flavor.checker.*` —
 * см. src/lib/useFlavorBrand.ts и src/i18n/messages/ru.ts.
 */
export const checkerBrand = {
  tagline: "Проверьте находку",
  metaDescription:
    "Mushroom Checker определяет гриб по фотографии: вид с процентом уверенности, опасные двойники и чеклист самопроверки.",
  authSubtitle: "Войдите, чтобы определять грибы по фотографии.",
  accountSubtitle: "Профиль, подписка и настройки аккаунта.",
  accountDeleteHint:
    "Удаление аккаунта необратимо: профиль и история распознаваний будут удалены. Подписку нужно отменить отдельно в App Store или Google Play.",
  lockBody: "Разблокируйте через Face ID, чтобы открыть Mushroom Checker.",
  deletedItems: [
    "Профиль (имя и адрес электронной почты)",
    "Отправленные на распознавание фотографии и их результаты",
    "Токены push-уведомлений для ваших устройств",
    "Записи о подписке на нашей стороне",
  ],
} as const;

export default {
  /** Нижнее меню: две вкладки и кнопка панели «Ещё». */
  nav: {
    tabBar: "Основная навигация",
    identify: "Распознать",
    account: "Аккаунт",
    more: "Ещё",
    openMore: "Открыть меню «Ещё»",
    back: "Назад",
  },

  /** Панель «Ещё» — то, что не поместилось во вкладки. */
  menu: {
    brandShort: "Mushroom Checker",
    close: "Закрыть",
    moreTitle: "Ещё",
    subscription: "Подписка",
    premiumPill: "PREMIUM",
    theme: "Оформление",
    themeDark: "Тёмное",
    themeLight: "Светлое",
    language: "Язык",
    support: "Поддержка",
    otherApps: "ДРУГИЕ ПРИЛОЖЕНИЯ SKYFOREST",
    waybackName: "WayBack",
    waybackHint: "Возвращает к точке, откуда вы вошли в лес",
    skyforestName: "SkyForest",
    skyforestHint: "Карта леса, прогноз грибов и не только",
    logout: "Выйти",
  },

  home: {
    titleLine1: "Гриб?",
    titleLine2: "Проверим.",
    quotaUnlimited: "Распознавания без ограничений",
    quotaUnlimitedNote: "PREMIUM",
    quotaTrialLeft: "распознаваний осталось в пробном периоде, из {limit}",
    quotaTrialEnded:
      "Пробные распознавания закончились — оформите подписку",
    quotaNoSub: "{days, plural, one {день} few {дня} other {дней}} бесплатно — нажмите, чтобы начать",
    photoCaption: "ФОТО ГРИБА",
    tipCap: "Шляпка сверху",
    tipStem: "Ножка целиком",
    tipGills: "Пластинки снизу",
    tipLight: "Дневной свет",
    takePhoto: "Сделать фото",
    fromGallery: "Из галереи",
    disclaimer:
      "Приложение не заменяет эксперта. Никогда не ешьте гриб, полагаясь только на результат.",
  },

  preview: {
    title: "Готово к распознаванию",
    lighting: "Освещение хорошее",
    beforeTitle: "Перед отправкой",
    beforeBody:
      "Из лимита пробного периода спишется одно распознавание — только если мы вернём результат.",
    beforeBodyUnlimited:
      "В подписке лимита нет — определяйте столько находок, сколько нужно.",
    identify: "Определить",
    counter: "· {used} из {limit}",
    retake: "Переснять",
  },

  confirm: {
    title: "Определить этот гриб?",
    body: "Распознавание засчитывается, только если анализ вернул результат. Ошибки и «это не гриб» бесплатны.",
    thisScan: "Это распознавание",
    leftInTrial: "Осталось в пробном",
    afterScan: "После распознавания",
    cta: "Определить",
    cancel: "Отмена",
  },

  analyzing: {
    title: "Анализируем…",
    body: "Сравниваем ваше фото с эталонными видами. Обычно это занимает 5–15 секунд.",
    step1: "Фото загружено",
    step2: "Признаки выделены",
    step3: "Сверяем с базами данных",
    cancel: "Отмена",
    photo: "ФОТО",
  },

  result: {
    back: "На главный экран",
    topMatch: "ЛУЧШЕЕ СОВПАДЕНИЕ · {pct}",
    lowConfidence:
      "Уверенность низкая — считайте совпадения ниже предположением, а не ответом.",
    possibleMatches: "Возможные совпадения",
    referenceNote:
      "Эталонные фото — иллюстративные и могут отличаться от вашего экземпляра.",
    aboutTitle: "О виде",
    family: "Семейство",
    genus: "Род",
    habitat: "Места роста",
    lookalikesTitle: "Опасные двойники",
    checkTitle: "Проверьте сами",
    disclaimer:
      "Распознавание вероятностное и приведено только для справки. Никогда не ешьте дикорастущий гриб, полагаясь на приложение, — подтвердите определение у опытного грибника или миколога.",
    newPhoto: "Новое фото",
    share: "Поделиться результатом",
    sourceChip: "Источник: {source}",
    toxicChip: "Ядовитый",
    edibleChip: "Не отмечен как ядовитый",
    moreLink: "Подробнее",
  },

  errors: {
    nothingCounted: "Ничего не списано.",
    notMushroomTitle: "Это не похоже на гриб",
    notMushroomBody:
      "Ничего не списано. Снимите плодовое тело целиком и поближе.",
    noResultTitle: "Уверенного совпадения нет",
    noResultBody:
      "Ничего не списано. Снимайте при дневном свете, в фокусе, шляпку сверху и пластинки снизу.",
    limitTitle: "Лимит пробного периода исчерпан",
    limitBody:
      "Вы использовали все {limit} распознаваний пробного периода. В подписке лимита нет.",
    noSubTitle: "Нужна подписка",
    noSubBody:
      "Начните бесплатный период на {days, plural, one {# день} few {# дня} other {# дней}} — в него входит {limit} распознаваний.",
    limitCta: "Посмотреть подписку",
    timeoutTitle: "Анализ занял слишком долго",
    timeoutBody: "Соединение прервалось через 35 секунд. Ничего не списано.",
    retry: "Попробовать снова",
    tooLargeTitle: "Файл слишком большой",
    tooLargeBody:
      "Максимум 10 МБ, JPEG или PNG. Снимите заново камерой приложения.",
    unsupportedTitle: "Формат не поддерживается",
    unsupportedBody: "Используйте JPEG, PNG или WebP до 10 МБ. Ничего не списано.",
    unavailableTitle: "Распознавание недоступно",
    unavailableBody:
      "Сервис временно недоступен. Ничего не списано — попробуйте позже.",
    genericTitle: "Что-то пошло не так",
    genericBody: "Ничего не списано. Попробуйте ещё раз через минуту.",
    captureTitle: "Не удалось получить фото",
    captureBody: "Попробуйте ещё раз или выберите фото из галереи.",
    cameraDeniedTitle: "Доступ к камере закрыт",
    cameraDeniedBody:
      "Разрешите камеру для Mushroom Checker в «Настройки › Конфиденциальность › Камера» и снимите фото снова.",
    photosDeniedTitle: "Доступ к галерее закрыт",
    photosDeniedBody:
      "Разрешите доступ к фото для Mushroom Checker в «Настройки › Конфиденциальность › Фото» и выберите снимок снова.",
    captureDetail: "Подробности: {reason}",
  },

  paywall: {
    close: "Закрыть",
    title: "Mushroom Checker Premium",
    subtitle:
      "Распознавания без ограничений, полные данные о видах и предупреждения о двойниках.",
    monthly: "Месяц",
    yearly: "Год",
    yearlyBadge: "−{percent}%",
    trialBadge:
      "{days, plural, one {# ДЕНЬ} few {# ДНЯ} other {# ДНЕЙ}} БЕСПЛАТНО",
    perYear: "/ год",
    perMonth: "/ месяц",
    perMonthHint: "· {price} в месяц",
    feature1: "Распознавания без ограничений",
    feature2: "Опасные двойники и пометки о токсичности",
    feature3: "Полная таксономия и места роста",
    trialNote:
      "В бесплатный период входит {limit} распознаваний на {days, plural, one {# день} few {# дня} other {# дней}}. После начала списаний лимита нет.",
    autoRenewYear:
      "{days, plural, one {# день} few {# дня} other {# дней}} бесплатно, затем автопродление за {price} в год. Отменить можно в любой момент в {store}.",
    autoRenewMonth:
      "{days, plural, one {# день} few {# дня} other {# дней}} бесплатно, затем автопродление за {price} в месяц. Отменить можно в любой момент в {store}.",
    cta: "Начать бесплатный период",
    ctaBusy: "Открываем {store}…",
    eula: "Условия использования (EULA)",
    privacy: "Политика конфиденциальности",
    billed: "Списание через ваш аккаунт {store}.",
    restore: "Восстановить покупку",
    restoring: "Восстанавливаем…",
    restoreFailed: "На этом аккаунте нечего восстанавливать.",
    purchaseError: "Не удалось завершить покупку. Попробуйте ещё раз.",
  },

  subscription: {
    title: "Подписка",
    back: "Назад",
    activeTitle: "Premium активен",
    activeBody:
      "Тариф «{plan}» · продление {date}. Управление через аккаунт {store}.",
    trialTitle: "Идёт бесплатный период",
    trialBody:
      "Тариф «{plan}» · списания начнутся {date}. Управление через аккаунт {store}.",
    planMonthly: "Месяц",
    planYearly: "Год",
    quotaUnlimited: "Распознавания без ограничений",
    quotaUnlimitedNote: "месячного лимита нет",
    quotaLine: "из {limit} пробных распознаваний осталось",
    quotaReset: "пробный период до {date}",
    manage: "Управлять подпиской",
    canceledTitle: "Статус · отменена",
    canceledBody:
      "Premium действует до {date}, затем распознавание остановится. Подписку можно оформить снова в любой момент.",
    webTitle: "Оформите в мобильном приложении",
    webBody:
      "Покупки обрабатывают App Store и Google Play, поэтому подписку можно оформить только в приложении Mushroom Checker.",
    appStore: "App Store",
    googlePlay: "Google Play",
  },

  account: {
    title: "Мой аккаунт",
    back: "Назад",
    premiumPlan: "Premium · {plan}",
    trialPlan: "Бесплатный период · {plan}",
    premiumMonthly: "Помесячно",
    premiumYearly: "Годовая",
    idsUnlimited: "Распознавания без ограничений",
    idsTrialLeft: "{left} из {limit} пробных распознаваний осталось",
    noSubscription: "Активной подписки нет",
    noSubscriptionHint:
      "Начните бесплатный период на {days, plural, one {# день} few {# дня} other {# дней}}",
    manage: "Управлять",
    subscribe: "Оформить",
    displayName: "Отображаемое имя",
    displayNameEmpty: "Не задано",
    changePassword: "Сменить пароль",
    appLock: "Блокировка приложения",
    appLockHint: "Биометрия при запуске",
    twoFactor: "Двухфакторная аутентификация",
    on: "Вкл",
    off: "Выкл",
    eula: "Условия использования (EULA)",
    privacy: "Политика конфиденциальности",
    deleteAccount: "Удалить аккаунт",
    logout: "Выйти",
    save: "Сохранить",
    cancel: "Отмена",
    close: "Закрыть",
  },

  deleteAccount: {
    scheduledTitle: "Удаление запланировано",
    scheduledBody: "Аккаунт будет удалён {date}. Войдите до этой даты, чтобы сохранить его.",
    undo: "Оставить аккаунт",
    title: "Удалить аккаунт?",
    body: "Профиль, история распознаваний и запись о подписке будут удалены. У вас есть <days>14 дней</days>, чтобы передумать, — просто войдите снова.",
    storeNote:
      "Активная подписка стора не отменяется автоматически — отмените её в {store}.",
    confirmLabel: "Введите свой email для подтверждения",
    cta: "Удалить аккаунт",
    keep: "Оставить аккаунт",
    mismatch: "Email не совпадает с адресом аккаунта.",
    failed: "Не удалось удалить аккаунт. Попробуйте ещё раз.",
  },

  auth: {
    signInTitle: "С возвращением",
    signInSubtitle: "Войдите, чтобы определять грибы по фото.",
    google: "Продолжить с Google",
    apple: "Продолжить с Apple",
    orWithEmail: "ИЛИ ПО EMAIL",
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Пароль",
    minSix: "мин. 6",
    forgot: "Забыли пароль?",
    signInCta: "Войти",
    noAccount: "Нет аккаунта?",
    createAccount: "Создать аккаунт",

    backToSignIn: "Назад ко входу",
    signIn: "Вход",
    registerTitle: "Создать аккаунт",
    repeatPassword: "Повторите пароль",
    consent: "Я принимаю {eula} и {privacy}.",
    consentRequired: "Примите условия, чтобы продолжить.",
    registerCta: "Создать аккаунт",
    confirmEmailNote: "Мы отправим письмо со ссылкой для подтверждения.",
    passwordsDiffer: "Пароли не совпадают.",

    forgotTitle: "Сброс пароля",
    forgotBody:
      "Укажите email, с которым вы регистрировались, — пришлём ссылку для сброса.",
    sendLink: "Отправить ссылку",
    sentTitle: "Проверьте почту",
    sentBody: "Мы отправили ссылку на {email}. Она действует 60 минут.",
    resend: "Отправить письмо ещё раз",

    resetTitle: "Новый пароль",
    newPassword: "Новый пароль",
    repeatNewPassword: "Повторите новый пароль",
    savePassword: "Сохранить пароль",
    invalidLinkState: "СОСТОЯНИЕ · ССЫЛКА НЕДЕЙСТВИТЕЛЬНА",
    invalidTitle: "Ссылка больше не действует",
    invalidBody:
      "Ссылка для сброса истекла или уже использована. Запросите новую — это займёт секунду.",
    requestNewLink: "Запросить новую ссылку",
    passwordSaved: "Пароль обновлён. Входим…",

    mfaTitle: "Двухфакторная аутентификация",
    mfaBody: "Введите 6-значный код из приложения-аутентификатора.",
    mfaCode: "Код",
    mfaCta: "Подтвердить",
  },
} as const;
