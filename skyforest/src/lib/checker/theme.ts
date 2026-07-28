/**
 * Тема Mushroom Checker: тёмная (основная) или светлая по выбору пользователя.
 *
 * Выбор хранится в куке, а не в localStorage, потому что схему нужно знать до
 * первой отрисовки: `src/app/layout.tsx` читает куку на сервере и ставит
 * `data-scheme` на <html>, откуда цвета берёт src/styles/flavors/checker.css.
 * С localStorage сервер отдал бы страницу в теме по умолчанию, и у половины
 * пользователей приложение мигало бы чужим фоном на каждой навигации.
 *
 * Источник значений — FLAVORS.checker.themeSwitch: там же лежат цвета чрома
 * (theme-color, статус-бар), которые из CSS не достать.
 */

import { FLAVORS } from "@/lib/appFlavor";

export type CheckerTheme = "dark" | "light";

const SWITCH = FLAVORS.checker.themeSwitch!;

export const CHECKER_THEME_COOKIE = SWITCH.cookie;
export const CHECKER_THEMES = ["dark", "light"] as const;
export const CHECKER_DEFAULT_THEME = SWITCH.defaultTheme as CheckerTheme;

/** Год: тема — долгоживущая настройка, переспрашивать её не за что. */
const COOKIE_MAX_AGE = 31536000;

function isCheckerTheme(value: unknown): value is CheckerTheme {
  return value === "dark" || value === "light";
}

/** Тема из значения куки; мусор и её отсутствие дают тему по умолчанию. */
export function parseCheckerTheme(value: string | undefined | null): CheckerTheme {
  return isCheckerTheme(value) ? value : CHECKER_DEFAULT_THEME;
}

/** Цвет `theme-color` и стиль статус-бара выбранной темы. */
export function checkerThemeChrome(theme: CheckerTheme) {
  return SWITCH.themes[theme];
}

/**
 * Запомнить выбор и применить его к документу.
 *
 * Атрибут ставим здесь же, а не в эффекте: цвета должны смениться в том же
 * кадре, что и нажатие, иначе переключатель выглядит залипающим.
 */
export function applyCheckerTheme(theme: CheckerTheme): void {
  document.documentElement.dataset.scheme = theme;
  document.cookie = `${CHECKER_THEME_COOKIE}=${theme}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}
