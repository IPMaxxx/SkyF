"use client";

/**
 * Состояние темы Mushroom Checker для экранов приложения.
 *
 * Цвета интерфейса меняет CSS по атрибуту `data-scheme` на <html> — провайдер
 * нужен для остального: он держит текущее значение для переключателя, пишет
 * выбор в куку и приводит в тон чром вокруг страницы. Начальное значение
 * приходит с сервера (`ck/layout.tsx` читает куку), поэтому переключатель
 * сразу показывает верный вариант и не «прыгает» после гидрации.
 *
 * Статус-бар нативной оболочки — здесь же: общий NativeAppProvider в
 * приложениях с переключателем его не трогает (см. FlavorConfig.themeSwitch),
 * иначе он перебивал бы выбор пользователя тёмным стилем бренда.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { isNativeApp, getPlatform } from "@/lib/native/capacitor";
import {
  applyCheckerTheme,
  checkerThemeChrome,
  CHECKER_DEFAULT_THEME,
  type CheckerTheme,
} from "@/lib/checker/theme";

interface CheckerThemeState {
  theme: CheckerTheme;
  setTheme: (next: CheckerTheme) => void;
}

const CheckerThemeContext = createContext<CheckerThemeState>({
  theme: CHECKER_DEFAULT_THEME,
  setTheme: () => {},
});

export function useCheckerTheme(): CheckerThemeState {
  return useContext(CheckerThemeContext);
}

/** Цвет чрома браузера: <meta name="theme-color"> ставится на сервере, но
    после переключения его нужно переписать — Safari и Chrome читают его
    вживую и красят по нему полосу вокруг страницы. */
function syncThemeColor(theme: CheckerTheme) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", checkerThemeChrome(theme).themeColor);
}

async function syncStatusBar(theme: CheckerTheme) {
  if (!isNativeApp()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({
      style: theme === "dark" ? Style.Dark : Style.Light,
    });
    if (getPlatform() === "android") {
      await StatusBar.setBackgroundColor({
        color: checkerThemeChrome(theme).themeColor,
      });
    }
  } catch {
    /* плагина нет (веб) — статус-бара тоже */
  }
}

export function CheckerThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: CheckerTheme;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<CheckerTheme>(initialTheme);

  // На монтировании тоже: страница могла приехать из кеша браузера с чужим
  // атрибутом, а нативный статус-бар после перезапуска ничего не помнит.
  useEffect(() => {
    document.documentElement.dataset.scheme = theme;
    syncThemeColor(theme);
    void syncStatusBar(theme);
  }, [theme]);

  const setTheme = useCallback((next: CheckerTheme) => {
    applyCheckerTheme(next);
    setThemeState(next);
  }, []);

  return (
    <CheckerThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </CheckerThemeContext.Provider>
  );
}
