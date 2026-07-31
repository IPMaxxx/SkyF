import { CheckerHeader } from "@/components/checker/CheckerHeader";

/**
 * Экраны входа, регистрации и восстановления пароля Mushroom Checker.
 *
 * Шапка здесь та же, что в приложении, но без нижнего меню: вкладки ведут на
 * защищённые маршруты и до входа уводили бы обратно сюда. Язык и тема в шапке
 * нужны как раз до входа — первое, что делает новый пользователь с
 * англоязычным приложением, это ищет свой язык.
 *
 * Оболочки `.ck-shell` тут нет намеренно: экраны с полями ввода должны
 * прокручиваться документом — так браузер сам поднимает поле над клавиатурой.
 * `--ck-chrome` — высота шапки (8px + 38px + 6px), её вычитает из 100dvh
 * CkScreen; safe-area сверху держит шапка, поэтому `--ck-safe-top` обнулён.
 */
export default function CheckerAuthLayout({
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
