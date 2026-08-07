# Листинги WayBack

Тексты сторов лежат файлами, чтобы их можно было читать и править в репозитории,
а не в веб-консолях. Раскладка повторяет `fastlane/metadata` основного
приложения.

## Языки

Четыре: английский, испанский, польский и французский — столько же, сколько
знает само приложение (`src/flavors/wayback/config.ts`; русский в сторы не
выкладывается). Карточка обязана говорить на языке первого экрана: человек
ставит приложение по описанию и не должен открыть чужой язык.

Коды локалей у площадок разные, и путать их нельзя — Play отвечает на
неизвестный код 400, а ASC молча ничего не находит:

| Язык | Каталог и код App Store | Код и каталог Google Play |
| --- | --- | --- |
| английский | `en-US/` | `en-US`, `android/en-US/` |
| испанский | `es-ES/` | `es-ES`, `android/es-ES/` |
| польский | `pl/` | `pl-PL`, `android/pl-PL/` |
| французский | `fr-FR/` | `fr-FR`, `android/fr-FR/` |

Скриншоты и feature graphic остаются английскими на всех языках: держать четыре
набора картинок в актуальном состоянии при каждой правке экрана дороже, чем
пользы от переведённой подписи на скриншоте.

## Файлы одной локали

| Файл | Куда уезжает | Лимит |
| --- | --- | --- |
| `<локаль>/subtitle.txt` | ASC → App Information → Subtitle | 30 |
| `<локаль>/keywords.txt` | ASC → версия → Keywords | 100 |
| `<локаль>/promotional_text.txt` | ASC → версия → Promotional Text | 170 |
| `<локаль>/description.txt` | ASC → версия → Description | 4000 |
| `<локаль>/release_notes.txt` | ASC → версия → What's New и Play → release notes трека | 500 |
| `<локаль>/support_url.txt` | ASC → версия → Support URL | — |
| `<локаль>/marketing_url.txt` | ASC → версия → Marketing URL | — |
| `<локаль>/privacy_url.txt` | ASC → App Information → Privacy Policy URL | — |
| `android/<локаль>/title.txt` | Play → Main store listing → App name | 30 |
| `android/<локаль>/short_description.txt` | Play → Short description | 80 |
| `android/<локаль>/full_description.txt` | Play → Full description | 4000 |

Ключевые слова App Store у каждого языка свои: это не перевод английского
списка, а поисковые запросы того рынка. Дословный перевод проверка отклоняет.

Заливка и сверка: `node fastlane/wayback-listings.mjs` (сухой прогон) и
`node fastlane/wayback-listings.mjs --apply`. Скрипт после записи перечитывает
поля из API и сравнивает их с файлами. Флаг `--play-only` обходит App Store
Connect стороной — он нужен, пока версия висит в WAITING_FOR_REVIEW и Apple
отвечает на PATCH локализации 409. Флаг `--only=<код App Store>` работает с
одним языком: им удобно доливать новый язык, не трогая остальные.

Длину, лимиты, пустые файлы и совпадение цен в карточке с
`FLAVORS.wayback.subscriptionPlan` проверяет
`node fastlane/.wayback-locales-check.mjs` — без сети, ещё до заливки.

## Новый язык в App Store требует новой версии

Проверено по API в августе 2026 на версии 1.1 `READY_FOR_DISTRIBUTION`.
Локализации живут у **записи версии**, а не у приложения, и в состоянии
вышедшей версии Apple не принимает ни `PATCH`, ни `POST`
`appStoreVersionLocalizations` — отвечает 409 STATE_ERROR. Редактируемые
состояния только `PREPARE_FOR_SUBMISSION`, `DEVELOPER_REJECTED`, `REJECTED`,
`METADATA_REJECTED`, `INVALID_BINARY`.

Значит, испанский, польский и французский уедут в App Store вместе со следующей
версией: заводится запись версии, к ней прикладывается сборка, и всё уходит на
ревью. Тексты уже лежат в каталогах и ждут — `wayback-listings.mjs` сам заведёт
локализации через `POST`, как только версия станет редактируемой, и скажет об
этом вслух, если она ещё нет.

В Google Play такого ограничения нет: языки листинга добавляются в любой момент
и без релиза.

Что лежит в Google Play прямо сейчас, целиком и только через GET, показывает
`node fastlane/wayback-play-audit.mjs` — листинг, графика с sha256, треки,
релизы, подписки, офферы. Скрипт ничего не меняет.

Release notes в Play живут не в листинге, а у релиза в треке; их пишет туда всё
тот же `wayback-listings.mjs` из `en-US/release_notes.txt`. Потолок в 500 знаков
у этого файла — от Play: App Store принял бы 4000, а Play отвечает на коммит
edit'а 403 «notes … too long (max: 500)», причём уже после записи листинга.
В App Store у **первой** версии раздела What's New нет вовсе: пока ни одна
версия не вышла, Apple отвечает на запись поля 409 STATE_ERROR, и скрипт
сохраняет остальные поля без него — так и должно быть.

Графика листинга Play:

- иконка 512×512 — `public/icons/wayback-512.png`,
  заливается `PLAY_PKG=ai.skyforest.wayback node fastlane/play-icon.mjs <файл> --apply`;
- feature graphic 1024×500 — `docs/store-shots/wayback/play/feature-graphic.png`,
  собирается `node apps/wayback/make-feature-graphic.mjs`, заливается
  `node fastlane/play-screenshots.mjs ai.skyforest.wayback en-US featureGraphic <файл>`;
- скриншоты — `docs/store-shots/wayback/{apple,play}/`, съёмка
  `node scripts/capture-wayback-store-shots.mjs`.

## Повторная подача в App Store после отказа

Проверено на отказе 1.0 (build 7) по 2.1(a) в августе 2026. Порядок в API
неочевиден, поэтому записан по шагам — все запросы через `fastlane/asc.mjs`.

1. **Запись версии переиспользуется, а не создаётся заново.** Пока ни одна
   версия не вышла, отклонённая запись остаётся единственной редактируемой:
   `PATCH /v1/appStoreVersions/{id}` меняет `versionString` (1.0 → 1.1) и
   `releaseType` прямо в состоянии `REJECTED`. Описание, ключевые слова,
   скриншоты и App Review Information остаются на месте — заводить новую
   запись значит перезаливать их руками.
2. **Свежая сборка возвращает версию в `PREPARE_FOR_SUBMISSION`.**
   `PATCH /v1/appStoreVersions/{id}/relationships/build` — состояние
   переключается само, отдельного действия не нужно. Export compliance живёт
   у сборки (`usesNonExemptEncryption`), а не у версии.
3. **Старая подача не отпускает элементы.** Она остаётся в
   `UNRESOLVED_ISSUES`, её элемент версии — в `REJECTED`, и на нём висит всё
   остальное: `DELETE` элемента отвечает 409 «Item was already submitted»,
   `PATCH submitted=true` — 409 «Version is not ready to be submitted yet»
   (сколько ни ждать), а добавление версии в новую подачу — 409
   «Item is already present in another reviewSubmission». Развязывает только
   `PATCH /v1/reviewSubmissions/{id}` с `canceled: true`: подача уходит в
   `CANCELING`, через минуту становится `COMPLETE`, и версия с подпиской
   освобождаются.
4. **Новая подача собирается из трёх элементов.** `POST /v1/reviewSubmissions`
   (app + platform), затем `POST /v1/reviewSubmissionItems` на каждый:
   `appStoreVersion`, `subscriptionVersion` и `subscriptionGroupVersion`.
   Подписку прикладывать обязательно, пока группа не одобрена, иначе Apple
   отвечает «New subscription groups must be submitted with an auto-renewable
   subscription from within that group». Идентификаторы версий подписки и
   группы просто так не найти: `/v1/subscriptions/{id}/subscriptionVersions`
   не существует, а прямой GET на `/v1/subscriptionVersions/{id}` отвечает 404
   — они видны только через `?include=subscriptionVersion,subscriptionGroupVersion`
   на элементах прошлой подачи.
5. **Отправка** — `PATCH /v1/reviewSubmissions/{id}` с `submitted: true`.
   Старого `appStoreVersionSubmissions` у этого приложения нет вовсе (404).

Пустую подачу без элементов ни удалить, ни отменить нельзя (403 на `DELETE`,
409 «not in cancellable state»), поэтому `POST /v1/reviewSubmissions` делайте
последним шагом — когда уже известно, что элементы свободны.

Сообщение в Resolution Center через API не отправить: ресурса для переписки с
ревью в App Store Connect API нет. Ответ ревьюеру пишется руками в
App Store Connect → App Review → Resolution Center.

## Чего в API нет

Проверено по discovery-документу `androidpublisher v3` (полный список методов —
`curl 'https://androidpublisher.googleapis.com/$discovery/rest?version=v3'`).
Ресурсов под раздел **App content** там нет ни одного, кроме `applications.dataSafety`.
Поля `privacyPolicyUrl`, `iarcCertificateId` и `isAdultOnlyAudience` в схемах
встречаются, но только внутри `CatalogAppView` — это выгрузка каталога Google Play
для операторов сторонних магазинов приложений. На своём пакете она отвечает
403 `Third party app store RPC called for non-third party app store app`, то есть
прочитать через неё свои же настройки нельзя.

У самого `applications.dataSafety` только POST: GET на тот же URL отвечает 404, в
discovery-документе метода нет. Значит записанную декларацию обратно не прочитать
— подтверждение отправки только по коду ответа (Google валидирует CSV целиком),
а увидеть содержимое можно в консоли и на публичной странице
`https://play.google.com/store/apps/datasafety?id=ai.skyforest.wayback`, но там
показано **опубликованное**, то есть уже прошедшее ревью. Метода «Send changes for
review» в API нет тоже: отправка на рассмотрение — только руками.

Значит, руками в Play Console заполняется всё перечисленное ниже. Порядок —
по тому, что раньше упрётся в публикацию.

| Раздел Play Console | Что выбрать |
| --- | --- |
| Policy → App content → **Privacy policy** | `https://wayback.skyforest.ai/privacy` |
| Policy → App content → **App access** | «All or some functionality is restricted», демо-логин ниже |
| Policy → App content → **Ads** | «No, my app does not contain ads» |
| Policy → App content → **Content rating** | анкета IARC, ответы ниже |
| Policy → App content → **Target audience and content** | возрастная группа только «18 and over»; «appeal to children» — No |
| Policy → App content → **Data safety** | отправлено через API, глазами сверить сводку. Заявлены **оба** типа местоположения: точное и приблизительное |
| Policy → App content → **Foreground service permissions** | с версии 1.1 обязательна: манифест объявляет `FOREGROUND_SERVICE_LOCATION`. Назначение — запись пути между «ушёл в поход» и «вернулся из похода», служба видна постоянным уведомлением. Google просит короткое видео с демонстрацией: экран старта похода, погашенный экран, уведомление в статус-баре, карта с непрерывным путём после возврата. **Пока не заполнено, релиз не выложить вообще**: `edits:validate` и `edits:commit` с этим бинарником отвечают 403 «You must let us know whether your app uses any Foreground Service permissions», причём в любом треке, включая internal. Правки листинга без бинарника проходят |
| Policy → App content → **Financial features** | «My app doesn't provide any financial features» |
| Policy → App content → **Health apps** | не медицинское приложение, все пункты — No |
| Policy → App content → **Government apps** | «No, it is not a government app» |
| Policy → App content → **Advertising ID** | «No»: с versionCode 7 разрешения `com.google.android.gms.permission.AD_ID` в бандле нет — оно вырезано `tools:node="remove"` в `apps/wayback/android/app/src/main/AndroidManifest.xml` (приезжало из facebook-core, который тянет за собой `@capgo/capacitor-social-login`; рекламы у нас нет, Facebook-провайдер не инициализируется). В 1.0 разрешение было, поэтому артефакты versionCode 3–6 ему противоречат: пока они активны хоть в одном треке, Play будет ругаться на ответ «No» — их надо перекрыть версией 7 или деактивировать в App Bundle Explorer. С versionCode 13 из бандла ушла и четвёрка `ACCESS_ADSERVICES_*` (её доливал тот же facebook-core): в 12 она ещё была, хотя в SkyForest и Checker её вырезали раньше |
| Grow → Store settings → **App category** | Apps → «Maps & Navigation» |

**Отказ по Data safety, август 2026.** Google отклонил публикацию с «Invalid Data
safety form … Version code 6: Location Data Type - Approximate Location»: в форме
стояло только точное местоположение. Претензия по делу, а не формальность —
`ACCESS_COARSE_LOCATION` есть в манифесте и доезжает до бандла (видно в
`bundletool dump manifest`), а `TrackServicePlugin` считает обязательным именно
его: при отказе от «точного» запись идёт по грубым координатам fused-провайдера,
и такой трек так же уходит в `tracks`. Убрать разрешение нельзя — с targetSdk 31+
запрос `ACCESS_FINE_LOCATION` без него система игнорирует. Декларация теперь
включает оба типа с одинаковыми ответами (собирается, не передаётся, нужно для
работы приложения); отправлена `node fastlane/play-data-safety.mjs --apply --pkg
ai.skyforest.wayback`. Чтобы то же не повторилось молча, есть
`node fastlane/play-data-safety-check.mjs`: он падает, если разрешение в манифесте
есть, а типа данных в декларации нет. **После правки формы изменения надо
отправить на рассмотрение руками:** Play Console → Publishing overview → Send
changes for review. Через API этого не сделать.

**Что выложено сейчас.** 1.1.6 (versionCode 13) в production и internal на 100%
(`node fastlane/.wayback-play-13.mjs --apply`, скрипт по образцу
`.wayback-play-12.mjs`). Он перекрыл 12: в том офлайн-экран не показывал ни
своего места, ни скачанной карты. В бандле 13 те же разрешения, что в 12, минус
четвёрка `ACCESS_ADSERVICES_*`; `ACCESS_BACKGROUND_LOCATION`,
`RECEIVE_BOOT_COMPLETED` и `AD_ID` в нём отсутствуют, `TrackService` объявлена
`exported="false"` с `foregroundServiceType` location. Ревью политики, начатое на
12, к номеру бинарника не привязано и продолжается на 13; отдельно ждёт отправки
форма Data safety — до Send changes for review снаружи по-прежнему видна старая
сводка.

## Data safety: одна памятка на три приложения

Отдельного README у SkyForest нет, а правило общее, поэтому оно записано здесь.

**Декларации всех трёх приложений ведёт `fastlane/play-data-safety.mjs`.** Руками
в консоли форму больше не заполняем ни у SkyForest, ни у Checker, ни у WayBack:
консоль и скрипт перетирают друг друга целиком, и побеждает тот, кто написал
последним. Источник истины — таблица `DECLARATIONS` в скрипте, отправка —
`node fastlane/play-data-safety.mjs --apply --pkg <id>`, успех виден только по
коду ответа (204).

**Почему это завели.** У SkyForest (`ai.skyforest.app`) форму когда-то заполнили
руками ответом «приложение не собирает никаких данных», и он был опубликован —
`https://play.google.com/store/apps/datasafety?id=ai.skyforest.app` буквально
говорил «No data collected». При этом приложение просит оба местоположения и
камеру, заводит аккаунт Supabase, льёт фотографии в `best-day-photos`, пишет
треки в `tracks`, держит переписку торговой площадки и продаёт токены с
подписками. Это тот же состав нарушения, за который отклонили WayBack, только
шире, и держался он ровно потому, что форму никто не сверял с кодом.

**Заполненная форма без отправки на ревью не публикуется.** Это не теория: после
того как WayBack получил в декларацию приблизительное местоположение и Google
ответил 204, публичная страница
`https://play.google.com/store/apps/datasafety?id=ai.skyforest.wayback`
по-прежнему не показывала раздел Location вообще. Публичная страница показывает
**прошедшее ревью**, а не записанное. Пока не нажат Publishing overview → Send
changes for review, снаружи ничего не меняется — и ревьюер смотрит на старое.

**Что проверяет `node fastlane/play-data-safety-check.mjs`.** Он покрывает все три
пакета и падает, если тип данных следует из приложения, а в декларации его нет.
Разрешения он читает **из собранного бандла** через `bundletool dump manifest`, а
не из манифеста оболочки: половину строк доливают плагины при слиянии, и по
исходнику их не видно (см. AD_ID у Checker в `metadata/checker/README.md`). Если
бандла или bundletool нет, скрипт откатывается на манифест и говорит об этом.
Кроме разрешений он смотрит в общий код: счётчики Яндекс.Метрики и Google
Analytics в `src/app/layout.tsx` работают внутри всех трёх нативных оболочек,
потому что те грузят живой сайт, а `src/lib/native/iap.ts` шлёт на сервер код
ошибки покупки. Разрешений для этого не нужно — по манифесту такое не поймать.

**Ручные шаги в Play Console после каждой отправки** (одинаковые для всех трёх):
Policy → App content → Data safety — сверить сводку глазами, затем Publishing
overview → Send changes for review.

**Демо-видео для Foreground service permissions.** В форму декларации даётся
ссылка `https://pqffvnlrsnkgjgdjwrki.supabase.co/storage/v1/object/public/public-media/wayback/foreground-service-demo.mp4`
— файл лежит в публичном бакете Supabase Storage `public-media`, открывается без
авторизации и играется прямо в браузере ревьюера (mp4 h264/aac, 74 c, faststart).

**App access.** Приложение без подписки не открывается с первого экрана, поэтому
ревьюеру нужен готовый аккаунт. Логин `appreview@skyforest.ai`, пароль лежит в
`review-notes.txt`-обвязке скриптов и в самой консоли; менять его нельзя, он
прописан в нескольких местах. Текст инструкции берётся из `review-notes.txt`
этого каталога, с одной поправкой: в Play покупка идёт через Google Play Billing,
а не через Sandbox Apple Account.

**Content rating.** Категория — не игра, «Utility, Productivity, Communication or
Other». Все вопросы про насилие, секс, лексику, наркотики, страх, юмор и азартные
игры — No. Пользователи между собой не общаются и местоположением не обмениваются,
поэтому вопросы про обмен контентом и передачу местоположения другим людям — тоже
No. Единственное «да» — покупка цифровых товаров: в приложении есть подписка.
Ожидаемый результат: Everyone / PEGI 3 / USK 0.

**Про 18+ в Target audience.** Возраст ставится не потому, что в приложении есть
что-то взрослое, а потому что любая группа младше 18 включает требования Families
policy, а WayBack под них не проектировался.

- **Apple EULA.** Пользуемся стандартным лицензионным соглашением Apple, а
  ссылки на оферту и политику даны в конце описания — так же, как в листинге
  основного приложения SkyForest.

## Про тексты

Описание с версии 1.1 намеренно **обещает запись с погашенным экраном**: точки
пишутся со свёрнутым приложением (`src/lib/track/backgroundWatch.ts`,
`UIBackgroundModes=location` в `apps/wayback/ios/App/App/Info.plist`, на Android —
служба переднего плана с постоянным уведомлением). Обещать это можно и нужно:
для guideline 2.5.4 фон должен быть заявлен и использоваться по назначению, а
здесь он и есть смысл продукта — без него тропинка к точке входа рвётся ровно
там, где человек шёл.

Чего в текстах быть не должно:

- **записи вне похода.** Она идёт только между START («I'm heading outdoors»)
  и «I'm back from outdoors». Формулировки вроде «always tracking» или «keeps an
  eye on you» обещают чужое поведение;
- **намёка на передачу координат.** Активный поход лежит в localStorage и
  Capacitor Preferences, завершённый уезжает только в аккаунт самого
  пользователя (`src/lib/trackHistory.ts`, таблица `tracks` с RLS «только
  свои»). Плагин умеет POST-ить точки на URL — этой возможностью мы не
  пользуемся, и в review-notes про это сказано прямо;
- **обещаний про пунктир.** Легенда в приложении (`gapHint` в
  `src/i18n/messages/wayback.{en,ru}.ts`) намеренно молчит о причине разрыва —
  «участки без записи», и всё. Причина зависит от версии: в 1.0, которая ещё
  стоит у людей, пунктир значит уход в фон, в 1.1 — потерю спутников. Пока в
  проде обе, тексты сторов не должны толковать пунктир вообще, иначе одна из
  версий будет им противоречить.

Отдельный подвох: нативной части плагина нет в оболочках, собранных до 1.1, —
код это переживает (`backgroundWatchAvailable` вернёт false, запись останется
как раньше), но листинг описывает поведение свежего билда. Значит заливать
тексты про фон нужно вместе с релизом бинарника, а не раньше.

Терминология взята из `src/i18n/messages/wayback.en.ts`, чтобы листинг и
приложение называли одно и то же одинаково.

Второе, что нельзя расслаблять: **подписка обязательна, бесплатного уровня в
приложении нет.** `WayBackStartGate` ведёт по порядку вход → пробный период →
приложение, и без активного права внутрь не попасть. Поэтому «требуется
подписка», длительность триала и цена стоят во втором абзаце описания, а не в
конце: человек должен узнать об этом до установки, а не после. Длительность
триала — единственное число, которое приходится держать в трёх местах руками
(файлы листинга, App Store Connect, Google Play); в приложении она берётся из
`FLAVORS.wayback.subscriptionPlan.trialDays`. Меняя её, правьте всё сразу и
перезаливайте листинги.

В браузере на `wayback.skyforest.ai` гейта нет — покупки стора там не
существует. Листинги описывают приложение из сторов, поэтому обещаний «работает
без аккаунта» в них быть не должно, даже если веб пускает анонимно.

## Два тарифа: неделя и год (август 2026)

Тарифов стало два — 1.99 USD в неделю и 19.99 USD в год, триал 3 дня на обоих.
Годовой при этом подорожал с 3.99: идентификатор товара прежний, потому что
смена цены ревью не требует, а новый товар уехал бы только со следующей подачей.

Экран оплаты строится из того, что стор назвал готовым к заказу, а не из
каталога: пришли оба тарифа — показывается выбор, пришёл один — цена без
выбора. Флага в коде нет и заводить его не надо; проверить оба состояния можно
не собирая приложение:

```
npm run build && PORT=3210 npm start
WB_REVIEW_EMAIL=… WB_REVIEW_PASSWORD=… \
  node scripts/capture-wayback-plans-selfcheck.mjs http://wayback.localhost:3210
```

Что уже сделано в сторах (проверяется `node fastlane/wayback-subs-status.mjs`):

- **App Store.** Недельный товар заведён, оценён, с локализациями, кадром для
  ревьюера 1290×2796 и триалом 3 дня; подан на ревью подачей
  `8c475cf0-b007-4e1c-89a6-460fb949bd44`. Годовой: 19.99 USD с 2026-08-08 для
  новых покупателей, 3.99 сохранены для действующих (`preserved`), — Apple не
  даёт менять цену одобренного товара задним числом, только со следующего дня.
- **Google Play.** Оба тарифа активны вместе с офферами триала, годовой уже
  19.99 USD. Листинг перезалит (`node fastlane/wayback-listings.mjs --apply
  --play-only`).

### Что осталось руками

1. **Описание в App Store про цены.** Версия 1.1 уже `READY_FOR_SALE`, а у
   выпущенной версии ASC не даёт править ни `description`, ни `subtitle`
   (409 `INVALID_STATE`). Файлы в `en-US/` уже обновлены на два тарифа —
   зальются сами при следующей версии: `node fastlane/wayback-listings.mjs
   --apply`. До тех пор в App Store висит текст про 3.99 в год.
2. **Дождаться одобрения недельного товара.** Пока он не `APPROVED`, App Store
   не отдаёт его приложению, и на iPhone экран показывает один годовой тариф —
   это штатное поведение, а не ошибка. В Google Play выбор из двух работает уже
   сейчас.

Общего скрипта подписок Play больше нет: `fastlane/play-subs-create.mjs` держал
в одном списке товары Checker и WayBack, и цены в нём успели устареть — годовой
Checker за 14.99 USD при 39.99 в консоли, годовой WayBack за 3.99 при 19.99.
Прогон ради одного приложения откатывал бы цены соседнего. Теперь у каждого
приложения свой файл: товары WayBack заводятся из
`fastlane/wayback-play-subs.mjs`, Checker — из `fastlane/checker-play-subs.mjs`,
объявления лежат в `fastlane/play-subs/<приложение>.mjs`, а цены читаются
оттуда же, откуда их берёт пейволл, — из `FLAVORS.<id>.subscriptionPlan`.
Расхождение репозитория с консолью ловит `node fastlane/.play-subs-check.mjs`.

Триал в Play ограничен областью `thisSubscription` — как у годового WayBack и у
обоих тарифов Checker. В App Store вводное предложение считается по **группе**,
то есть достаётся человеку один раз на всё приложение; в Play, взяв три дня на
неделе, можно взять ещё три на годе. Расхождение оставлено сознательно:
одинаковое правило на всех офферах аккаунта дороже, чем закрытая лазейка в шесть
бесплатных дней. Закрывается сменой `scope` на `anySubscriptionInApp` сразу у
обоих офферов.
