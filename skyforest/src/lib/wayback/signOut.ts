"use client";

/**
 * Выход из аккаунта WayBack.
 *
 * `supabase.auth.signOut()` по умолчанию идёт на сервер (scope global — отзыв
 * всех refresh-токенов). Для приложения, которое живёт в походе, это опасно:
 * без связи запрос возвращает ошибку, сессия на устройстве остаётся, и кнопка
 * «Выйти» не делает ничего. А если запрос ещё и упадёт исключением (таймаут
 * блокировки хранилища у auth-js — 10 секунд), то без try/catch не выполнится
 * и код после него, включая переход на другой экран.
 *
 * Поэтому: пробуем выйти «везде», а при любой неудаче добиваем локальным
 * выходом. С телефона пользователь выходит всегда, серверные токены в худшем
 * случае протухнут сами.
 */

import { createClient } from "@/lib/supabase/client";

export async function waybackSignOut(): Promise<void> {
  const supabase = createClient();
  try {
    const { error } = await supabase.auth.signOut();
    if (!error) return;
  } catch {
    // Сеть или блокировка хранилища — ниже локальный выход.
  }
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
}
