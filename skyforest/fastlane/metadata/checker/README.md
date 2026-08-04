# Листинги Mushroom Checker (en-US)

Тексты сторов лежат файлами, чтобы их можно было читать и править в репозитории,
а не в веб-консолях. Раскладка повторяет `fastlane/metadata` основного
приложения и `fastlane/metadata/wayback`.

| Файл | Куда уезжает | Лимит |
| --- | --- | --- |
| `en-US/subtitle.txt` | ASC → App Information → Subtitle | 30 |
| `en-US/keywords.txt` | ASC → версия → Keywords | 100 |
| `en-US/promotional_text.txt` | ASC → версия → Promotional Text | 170 |
| `en-US/description.txt` | ASC → версия → Description | 4000 |
| `en-US/release_notes.txt` | ASC → версия → What's New; Play → release notes | 4000 |
| `en-US/support_url.txt` | ASC → версия → Support URL | — |
| `en-US/marketing_url.txt` | ASC → версия → Marketing URL | — |
| `en-US/privacy_url.txt` | ASC → App Information → Privacy Policy URL | — |
| `android/en-US/title.txt` | Play → Main store listing → App name | 30 |
| `android/en-US/short_description.txt` | Play → Short description | 80 |
| `android/en-US/full_description.txt` | Play → Full description | 4000 |

Заливка и сверка: `node fastlane/checker-listings.mjs` (сухой прогон) и
`node fastlane/checker-listings.mjs --apply`. Скрипт после записи перечитывает
поля из API и сравнивает их с файлами.

Графика листинга Play:

- иконка 512×512 и feature graphic 1024×500 собираются одной командой
  `node apps/mushroom-checker/make-play-graphics.mjs` в
  `docs/store-shots/checker/play/`;
- заливка: `node fastlane/play-screenshots.mjs ai.skyforest.mushroomchecker
  en-US featureGraphic docs/store-shots/checker/play/feature-graphic.png` и
  `PLAY_PKG=ai.skyforest.mushroomchecker node fastlane/play-icon.mjs
  docs/store-shots/checker/play/icon.png --apply`;
- скриншоты — `docs/store-shots/checker/{apple,play}/`.

## Чего в API нет

- **Play → App content → Privacy policy.** Ссылку на политику Play принимает
  только в консоли: в Android Publisher API v3 такого поля нет ни в `listings`,
  ни в `details`. Заполняется руками значением из `en-US/privacy_url.txt`.
- **ASC → What's New.** У первой версии раздела нет: API отвечает 409
  STATE_ERROR. Файл `release_notes.txt` при этом не лишний — его же текст
  уезжает в release notes трека Google Play.
- **Apple EULA.** Пользуемся стандартным лицензионным соглашением Apple, а
  ссылки на оферту и политику даны в конце описания.

## Data safety и Advertising ID

Декларация Data safety лежит в `fastlane/play-data-safety.mjs` и отправляется
`node fastlane/play-data-safety.mjs --apply --pkg ai.skyforest.mushroomchecker`.
Общие правила — в `metadata/wayback/README.md`: у ресурса только POST, прочитать
записанное нельзя, а отправка на рассмотрение делается руками через Publishing
overview → Send changes for review.

Заявлено: имя, почта, идентификатор пользователя, покупки, взаимодействия с
приложением, идентификатор устройства, фотография гриба и диагностика ошибок
покупки. Фотография уходит на наш сервер, тот срезает EXIF (включая GPS,
`src/lib/checker/exif.ts`) и передаёт снимок в Kindwise как обработчику — это
сбор, а не передача третьему лицу. Местоположение приложение не запрашивает и
не получает: в оболочке нет ни разрешения, ни плагина геолокации, и в коде
`src/components/checker/**` вызовов геолокации нет.

**AD_ID.** В исходном манифесте оболочки рекламы не было никогда, но в бандле
versionCode 5 лежит `com.google.android.gms.permission.AD_ID` вместе с четвёркой
`ACCESS_ADSERVICES_*` — их доливает facebook-core, который тянет за собой
`@capgo/capacitor-social-login` (Facebook-провайдер мы не инициализируем, вход
только Google и Apple). Проверить: `bundletool dump manifest --bundle
apps/mushroom-checker/android/app/build/outputs/bundle/release/app-release.aab`.

Рекламный идентификатор приложение не читает, поэтому разрешение вырезано
`tools:node="remove"` в
`apps/mushroom-checker/android/app/src/main/AndroidManifest.xml` — так же, как в
WayBack и SkyForest. **Правка манифеста сама по себе ничего не меняет: в Play
лежит versionCode 5, собранный до неё.** Пока новая сборка не выложена, Play
Console → App content → **Advertising ID** должен отвечать «Yes» (иначе ответ
противоречит активному артефакту), а на «No» его можно переводить только после
того, как versionCode 6 перекроет пятый во всех треках или пятый будет
деактивирован в App Bundle Explorer. Ту же историю WayBack прошёл на versionCode
7 — см. таблицу в его README.

В Data safety от этого ничего не меняется: «Device or other IDs» и так заявлен —
идентификаторы собирают счётчики аналитики.

## Про тексты

Определение грибов — тема про здоровье, поэтому листинг **не обещает
безопасность**. В описании отдельный блок «WHAT IT CANNOT DO», и он не мягче
того, что приложение говорит на своих экранах
(`src/i18n/messages/checker.en.ts`): «The app is not a substitute for an expert.
Never eat a mushroom based on the result alone» на главном экране и
«Identification is probabilistic and provided for reference only… confirm with
an experienced forager or mycologist» на экране результата. Формулировки
«точно», «безопасно», «съедобно» в листинге недопустимы: результат — это
вероятностная догадка по одной фотографии, и решение о еде человек принимает не
по приложению.

Модель монетизации взята из `src/flavors/checker/config.ts`
(`subscriptionPlan`) и сверена с продуктами сторов: пробный период 3 дня с
лимитом 10 распознаваний, дальше USD 2.00/мес (`…sub.monthly`) или
USD 14.99/год (`…sub.yearly`) без лимита. Бесплатного уровня за пределами
триала нет: без активного права `/api/mushrooms/identify` отвечает 402, и
приложение показывает «Subscription required». В отличие от WayBack гейта на
старте нет — экраны открываются, но распознавание не работает; описание так и
говорит.

Распознавание требует сети (фото уходит на сервер), поэтому обещаний офлайна в
листинге нет — это отличие от WayBack, куда офлайн вынесен в заголовок.
