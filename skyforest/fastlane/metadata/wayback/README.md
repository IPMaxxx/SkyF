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

Значит, руками в Play Console заполняется всё перечисленное ниже. Порядок —
по тому, что раньше упрётся в публикацию.

| Раздел Play Console | Что выбрать |
| --- | --- |
| Policy → App content → **Privacy policy** | `https://wayback.skyforest.ai/privacy` |
| Policy → App content → **App access** | «All or some functionality is restricted», демо-логин ниже |
| Policy → App content → **Ads** | «No, my app does not contain ads» |
| Policy → App content → **Content rating** | анкета IARC, ответы ниже |
| Policy → App content → **Target audience and content** | возрастная группа только «18 and over»; «appeal to children» — No |
| Policy → App content → **Data safety** | отправлено через API, глазами сверить сводку |
| Policy → App content → **Financial features** | «My app doesn't provide any financial features» |
| Policy → App content → **Health apps** | не медицинское приложение, все пункты — No |
| Policy → App content → **Government apps** | «No, it is not a government app» |
| Policy → App content → **Advertising ID** | «No» — в манифесте и плагинах нет `AD_ID` |
| Grow → Store settings → **App category** | Apps → «Maps & Navigation» |

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

Описание намеренно говорит, что запись пути идёт, **пока приложение открыто**:
`syncTrackWatch` глушит `watchPosition` при уходе в фон, в `Info.plist` нет
`UIBackgroundModes`. Обещание фоновой записи было бы поводом для отказа на
ревью. Терминология взята из `src/i18n/messages/wayback.en.ts`, чтобы листинг и
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
