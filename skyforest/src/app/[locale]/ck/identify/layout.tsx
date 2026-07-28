import { CheckerHeader } from "@/components/checker/CheckerHeader";

/**
 * Шапка есть только на экране распознавания: пейволл и аккаунт по дизайну —
 * «вложенные» экраны со своим крестиком или стрелкой назад.
 *
 * `--ck-chrome` — высота шапки (8px + 38px кнопка + 6px = 52px): её вычитает
 * из 100dvh CkScreen, чтобы нижний блок кнопок не уезжал за экран.
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
          "--ck-chrome": "calc(52px + env(safe-area-inset-top))",
          "--ck-safe-top": "0px",
        } as React.CSSProperties
      }
    >
      <CheckerHeader />
      {children}
    </div>
  );
}
