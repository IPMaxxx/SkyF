import { CheckerHeader } from "@/components/checker/CheckerHeader";

/**
 * Шапка с маркой есть только на домашнем экране: пейволл и аккаунт по дизайну
 * — «вложенные» экраны со своей стрелкой назад.
 *
 * `--ck-chrome` — то, что занято не экраном: шапка (8px + 38px кнопка + 6px =
 * 52px) плюс нижнее меню из `ck/(app)/layout.tsx`. Эту величину CkScreen
 * вычитает из 100dvh, чтобы нижний блок кнопок не уезжал за экран.
 */
export default function CheckerIdentifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-1 flex-col"
      style={
        {
          "--ck-chrome":
            "calc(52px + env(safe-area-inset-top) + var(--ck-tabbar, 0px))",
          "--ck-safe-top": "0px",
        } as React.CSSProperties
      }
    >
      <CheckerHeader />
      {children}
    </div>
  );
}
