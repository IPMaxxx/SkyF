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
поля из API и сравнивает их с файлами.

Графика листинга Play:

- иконка 512×512 — `docs/store-shots/wayback/play/icon.png`,
  заливается `PLAY_PKG=ai.skyforest.wayback node fastlane/play-icon.mjs <файл> --apply`;
- feature graphic 1024×500 — `docs/store-shots/wayback/play/feature-graphic.png`,
  собирается `node apps/wayback/make-feature-graphic.mjs`, заливается
  `node fastlane/play-screenshots.mjs ai.skyforest.wayback en-US featureGraphic <файл>`;
- скриншоты — `docs/store-shots/wayback/{apple,play}/`, съёмка
  `node scripts/capture-wayback-store-shots.mjs`.

## Чего в API нет

- **Play → App content → Privacy policy.** Ссылку на политику Play принимает
  только в консоли: в Android Publisher API v3 такого поля нет ни в `listings`,
  ни в `details`. Заполняется руками значением из `en-US/privacy_url.txt`.
- **Apple EULA.** Пользуемся стандартным лицензионным соглашением Apple, а
  ссылки на оферту и политику даны в конце описания — так же, как в листинге
  основного приложения SkyForest.

## Про тексты

Описание намеренно говорит, что запись пути идёт, **пока приложение открыто**:
`syncTrackWatch` глушит `watchPosition` при уходе в фон, в `Info.plist` нет
`UIBackgroundModes`. Обещание фоновой записи было бы поводом для отказа на
ревью. Терминология взята из `src/i18n/messages/wayback.en.ts`, чтобы листинг и
приложение называли одно и то же одинаково.
