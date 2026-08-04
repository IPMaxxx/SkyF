import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import skyforest from "./eslint-rules/index.mjs";

/**
 * Код, принадлежащий Mushroom Checker (см. .cursor/rules/flavors.mdc).
 * Только ts/tsx: CSS у ESLint своего парсера здесь нет.
 */
const CHECKER_FILES = [
  "src/app/**/ck/**/*.{ts,tsx}",
  "src/components/checker/**/*.{ts,tsx}",
  "src/lib/checker/**/*.{ts,tsx}",
  "src/flavors/checker/**/*.{ts,tsx}",
  "src/i18n/messages/checker.*.ts",
];

/** Код, принадлежащий WayBack (см. .cursor/rules/flavors.mdc). */
const WAYBACK_FILES = [
  "src/app/**/wb/**/*.{ts,tsx}",
  "src/components/wayback/**/*.{ts,tsx}",
  "src/lib/wayback/**/*.{ts,tsx}",
  "src/flavors/wayback/**/*.{ts,tsx}",
  "src/i18n/messages/wayback.*.ts",
];

/** Мосты, которым импорт кода приложений разрешён: реестр и агрегаторы словарей. */
const BRIDGES = [
  "src/flavors/registry.ts",
  "src/i18n/messages/en.ts",
  "src/i18n/messages/ru.ts",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Прокси плагина Capacitor, отданный через промис, вешает ожидание навсегда —
  // молча, без ошибки и без таймаута. Класс дефекта уже стоил полутора дней в
  // WayBack и молчащей кнопки «Поделиться» в Checker, поэтому его стережёт
  // правило, а не память (см. eslint-rules/no-plugin-proxy-in-promise.mjs).
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { skyforest },
    rules: {
      "skyforest/no-plugin-proxy-in-promise": "error",
    },
  },
  // Границы приложений: правки Mushroom Checker не должны утекать в SkyForest
  // и WayBack, а Checker — зависеть от их интерфейса.
  {
    files: CHECKER_FILES,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/components/wayback",
                "@/components/wayback/*",
                "@/flavors/wayback/*",
                "@/components/app/*",
                "@/components/marketing/*",
              ],
              message:
                "Mushroom Checker не должен зависеть от интерфейса SkyForest и WayBack. Общий код выносите в src/lib или src/components/native.",
            },
          ],
        },
      ],
    },
  },
  // То же для WayBack. Исключение — TrackRecorder: он не рисует интерфейс, а
  // пишет точки пути в фоне, и нужен обоим трекерам (подключён в wb/layout).
  {
    files: WAYBACK_FILES,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/components/checker",
                "@/components/checker/*",
                "@/lib/checker/*",
                "@/flavors/checker/*",
                "@/components/marketing/*",
              ],
              message:
                "WayBack не должен зависеть от интерфейса SkyForest и Mushroom Checker. Общий код выносите в src/lib или src/components/native.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [...CHECKER_FILES, ...WAYBACK_FILES, ...BRIDGES],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/components/checker",
                "@/components/checker/*",
                "@/lib/checker/*",
                "@/flavors/checker/*",
              ],
              message:
                "Экраны Mushroom Checker подключаются только из его дерева роутов src/app/[locale]/ck — иначе изменения Checker снова начнут задевать SkyForest и WayBack.",
            },
            {
              group: [
                "@/components/wayback",
                "@/components/wayback/*",
                "@/lib/wayback/*",
                "@/flavors/wayback/*",
              ],
              message:
                "Экраны WayBack подключаются только из его дерева роутов src/app/[locale]/wb — иначе изменения WayBack снова начнут задевать SkyForest и Mushroom Checker.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
