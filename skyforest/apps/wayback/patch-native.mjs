#!/usr/bin/env node
/**
 * Правки в нативной части @capgo/background-geolocation, без которых постоянное
 * уведомление записи не выполняет свою работу.
 *
 * Плагин строит уведомление службы переднего плана сам, из JS на него влияют
 * только текст, иконка и цвет. Три вещи он не выставляет, и каждая из них
 * приводит к тому, что человек уведомления не видит:
 *
 *  1. FOREGROUND_SERVICE_IMMEDIATE. С Android 12 система придерживает
 *     уведомление службы переднего плана 10 секунд — чтобы короткие задачи
 *     успели закончиться и не мигали в шторке. Поход длится часами, а вот
 *     первые десять секунд после старта уведомления нет ни в шторке, ни на
 *     экране блокировки: ровно тот кадр, который человек пытается снять.
 *  2. VISIBILITY_PUBLIC. По умолчанию уведомление приватное, и на телефонах,
 *     где экран блокировки настроен «скрывать содержимое» (у Samsung и Xiaomi
 *     это часто из коробки), вместо текста видно «Содержимое скрыто».
 *     Секретов в «Записываем путь назад» нет, а видимость обязательна.
 *  3. CATEGORY_NAVIGATION. Честная категория для навигации; заодно ещё одно
 *     основание системе показать уведомление сразу.
 *
 * Канал создаётся один раз на установку, поэтому lockscreenVisibility у уже
 * поставленного приложения переписать нельзя — там сработает пункт 2, он живёт
 * в самом уведомлении. Для новых установок канал сразу заводится публичным.
 *
 * Скрипт идемпотентен и падает, если не нашёл исходный текст: молча потерять
 * правку при обновлении плагина хуже, чем сломать сборку.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const pluginDir = join(root, "node_modules/@capgo/background-geolocation/android/src/main/java/com/capgo/capacitor_background_geolocation");

/** @type {{file: string, marker: string, from: string, to: string}[]} */
const edits = [
  {
    file: "BackgroundGeolocationService.java",
    marker: "FOREGROUND_SERVICE_IMMEDIATE",
    from: `            .setPriority(Notification.PRIORITY_HIGH)
            .setWhen(System.currentTimeMillis());
`,
    to: `            .setPriority(Notification.PRIORITY_HIGH)
            .setWhen(System.currentTimeMillis())
            // SkyForest: см. patch-native.mjs
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setCategory(Notification.CATEGORY_NAVIGATION);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        }
`,
  },
  {
    file: "BackgroundGeolocation.java",
    marker: "setLockscreenVisibility",
    from: `            channel.setSound(null, null);
`,
    to: `            channel.setSound(null, null);
            // SkyForest: см. patch-native.mjs
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            channel.setShowBadge(false);
`,
  },
];

let changed = 0;
for (const edit of edits) {
  const path = join(pluginDir, edit.file);
  const source = readFileSync(path, "utf8");
  if (source.includes(edit.marker)) continue;
  if (!source.includes(edit.from)) {
    throw new Error(
      `patch-native: не нашёл место для правки в ${edit.file}. Плагин обновился — перечитайте createBackgroundNotification/load и поправьте скрипт.`,
    );
  }
  writeFileSync(path, source.replace(edit.from, edit.to));
  changed += 1;
}

console.log(
  changed === 0
    ? "patch-native: правки уведомления уже на месте"
    : `patch-native: применено правок — ${changed}`,
);
