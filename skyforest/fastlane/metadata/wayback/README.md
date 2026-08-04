# Листинги WayBack (en-US)

Тексты сторов лежат файлами, чтобы их можно было читать и править в репозитории,
а не в веб-консолях. Раскладка повторяет `fastlane/metadata` основного
приложения.

| Файл | Куда уезжает | Лимит |
| --- | --- | --- |
| `en-US/subtitle.txt` | ASC → App Information → Subtitle | 30 |
| `en-US/keywords.txt` | ASC → версия → Keywords | 100 |
| `en-US/promotional_text.txt` | ASC → версия → Promotional Text | 170 |
| `en-US/description.txt` | ASC → версия → Description | 4000 |
| `en-US/release_notes.txt` | ASC → версия → What's New | 4000 |
| `en-US/support_url.txt` | ASC → версия → Support URL | — |
| `en-US/marketing_url.txt` | ASC → версия → Marketing URL | — |
| `en-US/privacy_url.txt` | ASC → App Information → Privacy Policy URL | — |
| `android/en-US/title.txt` | Play → Main store listing → App name | 30 |
| `android/en-US/short_description.txt` | Play → Short description | 80 |
| `android/en-US/full_description.txt` | Play → Full description | 4000 |

Заливка и сверка: `node fastlane/wayback-listings.mjs` (сухой прогон) и
`node fastlane/wayback-listings.mjs --apply`. Скрипт после записи перечитывает
поля из API и сравнивает их с файлами. Флаг `--play-only` обходит App Store
Connect стороной — он нужен, пока версия висит в WAITING_FOR_REVIEW и Apple
отвечает на PATCH локализации 409.

Что лежит в Google Play прямо сейчас, целиком и только через GET, показывает
`node fastlane/wayback-play-audit.mjs` — листинг, графика с sha256, треки,
релизы, подписки, офферы. Скрипт ничего не меняет.

Release notes в Play живут не в листинге, а у релиза в треке; их пишет туда всё
тот же `wayback-listings.mjs` из `en-US/release_notes.txt`.

Графика листинга Play:

- иконка 512×512 — `public/icons/wayback-512.png`,
  заливается `PLAY_PKG=ai.skyforest.wayback node fastlane/play-icon.mjs <файл> --apply`;
- feature graphic 1024×500 — `docs/store-shots/wayback/play/feature-graphic.png`,
  собирается `node apps/wayback/make-feature-graphic.mjs`, заливается
  `node fastlane/play-screenshots.mjs ai.skyforest.wayback en-US featureGraphic <файл>`;
- скриншоты — `docs/store-shots/wayback/{apple,play}/`, съёмка
  `node scripts/capture-wayback-store-shots.mjs`.

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
| Policy → App content → **Advertising ID** | «No»: с versionCode 7 разрешения `com.google.android.gms.permission.AD_ID` в бандле нет — оно вырезано `tools:node="remove"` в `apps/wayback/android/app/src/main/AndroidManifest.xml` (приезжало из facebook-core, который тянет за собой `@capgo/capacitor-social-login`; рекламы у нас нет, Facebook-провайдер не инициализируется). В 1.0 разрешение было, поэтому артефакты versionCode 3–6 ему противоречат: пока они активны хоть в одном треке, Play будет ругаться на ответ «No» — их надо перекрыть версией 7 или деактивировать в App Bundle Explorer |
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
