import { CheckerTabBar } from "@/components/checker/CheckerTabBar";

/**
 * Оболочка экранов приложения Mushroom Checker (распознавание, аккаунт,
 * подписка): нижнее меню и место под него.
 *
 * Экранов входа и посадочной страницы в группе нет намеренно — вкладки ведут
 * на защищённые маршруты, и до логина они уводили бы обратно на /login, а
 * «выход» в панели «Ещё» был бы бессмысленным.
 *
 * `--ck-tabbar` — высота меню; её вычитает из 100dvh CkScreen, чтобы нижний
 * блок кнопок экрана не уезжал под меню. `--ck-screen-pb` уменьшает отступ
 * под этим блоком: safe-area снизу держит уже само меню.
 */
export default function CheckerAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-1 flex-col"
      style={
        {
          "--ck-tabbar": "calc(58px + env(safe-area-inset-bottom))",
          "--ck-chrome": "var(--ck-tabbar)",
          "--ck-screen-pb": "14px",
        } as React.CSSProperties
      }
    >
      {children}
      <CheckerTabBar />
    </div>
  );
}
