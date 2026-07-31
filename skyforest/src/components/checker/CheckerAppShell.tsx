"use client";

/**
 * Оболочка экранов приложения Mushroom Checker: шапка, прокручиваемая середина
 * и нижнее меню.
 *
 * ПОЧЕМУ ПРОКРУТКА ВНУТРИ, А НЕ У ДОКУМЕНТА. Нижнее меню ездило при прокрутке
 * пальцем: оно было `position: fixed`, а фиксированные элементы привязаны к
 * layout-вьюпорту, который WKWebView сдвигает целиком при резиновом отскоке
 * (и Chrome — когда прячет адресную строку). Здесь оболочка занимает экран
 * (`.ck-shell`, position: fixed), скроллится только середина (`.ck-scroll`), а
 * шапка и меню — её обычные блоки. Двигаться им нечем: страница под ними не
 * прокручивается вовсе (замок на <html>/<body> ставит `.ck-shell`, см.
 * src/styles/flavors/checker.css).
 *
 * `--ck-screen-min: 100%` говорит CkScreen мерить высоту от скроллера, а не от
 * 100dvh: шапка и меню лежат вне него, и вычитать их высоту из вьюпорта больше
 * не нужно — заодно ушли и подгонки под фактическую высоту меню.
 * `--ck-safe-top: 0px` — safe-area сверху держит шапка, `--ck-screen-pb` —
 * снизу её держит меню.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import { CheckerHeader } from "@/components/checker/CheckerHeader";
import { CheckerTabBar } from "@/components/checker/CheckerTabBar";

export function CheckerAppShell({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Путь без префикса локали: переключение языка не должно сбрасывать
  // прокрутку — тот же экран остаётся на месте.
  const pathname = usePathname();

  // Скроллер живёт в оболочке и переживает переход между разделами, поэтому
  // возвращать его к началу приходится самим: у документа это делал бы Next.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div
      className="ck-shell"
      style={
        {
          "--ck-screen-min": "100%",
          "--ck-safe-top": "0px",
          "--ck-screen-pb": "14px",
        } as React.CSSProperties
      }
    >
      <CheckerHeader />
      <div ref={scrollRef} className="ck-scroll">
        {children}
      </div>
      <CheckerTabBar />
    </div>
  );
}
