import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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

/** Мосты, которым импорт кода Checker разрешён: реестр и агрегаторы словарей. */
const CHECKER_BRIDGES = [
  "src/flavors/registry.ts",
  "src/i18n/messages/en.ts",
  "src/i18n/messages/ru.ts",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
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
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [...CHECKER_FILES, ...CHECKER_BRIDGES],
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
