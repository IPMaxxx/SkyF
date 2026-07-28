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
