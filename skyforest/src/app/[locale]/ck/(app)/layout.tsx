import { CheckerAppShell } from "@/components/checker/CheckerAppShell";

/**
 * Экраны приложения Mushroom Checker (распознавание, история, квесты, аккаунт,
 * подписка) живут в оболочке с шапкой и нижним меню — см. `CheckerAppShell`.
 *
 * Экранов входа и посадочной страницы в группе нет намеренно — вкладки ведут
 * на защищённые маршруты, и до логина они уводили бы обратно на /login, а
 * «выход» в панели «Ещё» был бы бессмысленным. Шапка у них своя, без меню:
 * `ck/(auth)/layout.tsx`.
 */
export default function CheckerAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CheckerAppShell>{children}</CheckerAppShell>;
}
