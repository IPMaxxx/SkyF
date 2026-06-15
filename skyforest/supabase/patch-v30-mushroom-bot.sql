-- PATCH v30: Mushroom Telegram bot — token-funded recognition balance
--
-- Flow:
--   1. В Telegram-боте новичок получает несколько бесплатных распознаваний
--      (учитываются на стороне бота). Когда они кончаются — нужен платный доступ.
--   2. На сайте пользователь покупает токены и ПЕРЕВОДИТ их на «баланс бота».
--      Перевод N токенов списывает N токенов с аккаунта (только реальные, не
--      бонусные) и добавляет N платных распознаваний на баланс бота.
--   3. Бот тратит этот баланс: 1 распознавание = 1 единица баланса (= 1 токен).
--
-- Привязка Telegram↔аккаунт: пользователь генерирует одноразовый код в личном
-- кабинете и отправляет боту командой /link КОД. Бот через серверный API
-- (HMAC) вызывает mushroom_bot_link, который связывает telegram_id с user_id.


-- ============================================================
-- 1. Таблицы
-- ============================================================

-- Аккаунт бота: связка telegram_id ↔ user_id + баланс платных распознаваний.
create table if not exists public.mushroom_bot_accounts (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  telegram_id    bigint unique,
  balance        integer not null default 0,   -- доступные платные распознавания
  total_added    integer not null default 0,   -- всего переведено токенов
  total_consumed integer not null default 0,   -- всего списано распознаваний
  linked_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.mushroom_bot_accounts enable row level security;

-- Пользователь видит только свою запись. Запись/обновление — только через
-- security definer функции (с явной проверкой прав внутри).
create policy "own mushroom bot account"
  on public.mushroom_bot_accounts for select
  using (auth.uid() = user_id);

-- Одноразовые коды привязки. RLS без политик => читать может только
-- service_role / security definer функции.
create table if not exists public.mushroom_bot_link_codes (
  code       text primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

alter table public.mushroom_bot_link_codes enable row level security;

create index if not exists idx_mushroom_bot_link_codes_user
  on public.mushroom_bot_link_codes (user_id);

-- Лог списаний для идемпотентности (повтор с тем же request_id ничего не спишет).
create table if not exists public.mushroom_bot_consume_log (
  request_id  text primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  telegram_id bigint not null,
  created_at  timestamptz not null default now()
);

alter table public.mushroom_bot_consume_log enable row level security;


-- ============================================================
-- 2. Генерация кода привязки (вызывает пользователь из ЛК)
-- ============================================================

create or replace function public.mushroom_bot_create_link_code(
  p_user_id uuid
) returns jsonb as $$
declare
  v_code text;
  v_expires timestamptz;
  v_attempt integer := 0;
begin
  if auth.role() != 'service_role'
     and (auth.uid() is null or auth.uid() != p_user_id) then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  -- Гарантируем наличие строки аккаунта бота.
  insert into public.mushroom_bot_accounts (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  -- Гасим прошлые неиспользованные коды пользователя.
  update public.mushroom_bot_link_codes
    set used_at = now()
    where user_id = p_user_id and used_at is null;

  v_expires := now() + interval '15 minutes';

  -- Генерируем уникальный 8-символьный код (HEX из md5).
  loop
    v_attempt := v_attempt + 1;
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text || p_user_id::text), 1, 8));
    begin
      insert into public.mushroom_bot_link_codes (code, user_id, expires_at)
      values (v_code, p_user_id, v_expires);
      exit;
    exception when unique_violation then
      if v_attempt >= 5 then
        return jsonb_build_object('success', false, 'error', 'code_gen_failed');
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'success', true,
    'code', v_code,
    'expires_at', v_expires
  );
end;
$$ language plpgsql security definer;


-- ============================================================
-- 3. Привязка аккаунта по коду (вызывает бот через серверный API)
-- ============================================================

create or replace function public.mushroom_bot_link(
  p_telegram_id bigint,
  p_code text
) returns jsonb as $$
declare
  v_user_id uuid;
  v_balance integer;
begin
  -- Только серверная сторона (service_role) может привязывать аккаунты.
  if auth.role() != 'service_role' then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if p_code is null or length(trim(p_code)) = 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_code');
  end if;

  select user_id into v_user_id
    from public.mushroom_bot_link_codes
    where code = upper(trim(p_code))
      and used_at is null
      and expires_at > now()
    for update;

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'invalid_code');
  end if;

  -- Помечаем код использованным.
  update public.mushroom_bot_link_codes
    set used_at = now()
    where code = upper(trim(p_code));

  -- Если этот telegram_id уже был привязан к другому аккаунту — отвязываем.
  update public.mushroom_bot_accounts
    set telegram_id = null, updated_at = now()
    where telegram_id = p_telegram_id and user_id != v_user_id;

  -- Привязываем telegram_id к аккаунту пользователя.
  insert into public.mushroom_bot_accounts (user_id, telegram_id, linked_at)
  values (v_user_id, p_telegram_id, now())
  on conflict (user_id) do update
    set telegram_id = excluded.telegram_id,
        linked_at = now(),
        updated_at = now()
  returning balance into v_balance;

  return jsonb_build_object(
    'success', true,
    'linked', true,
    'user_id', v_user_id,
    'balance', coalesce(v_balance, 0)
  );
end;
$$ language plpgsql security definer;


-- ============================================================
-- 4. Статус по telegram_id (вызывает бот)
-- ============================================================

create or replace function public.mushroom_bot_status(
  p_telegram_id bigint
) returns jsonb as $$
declare
  v_user_id uuid;
  v_balance integer;
  v_token_balance integer;
begin
  if auth.role() != 'service_role' then
    return jsonb_build_object('linked', false, 'remaining', 0);
  end if;

  select user_id, balance
    into v_user_id, v_balance
    from public.mushroom_bot_accounts
    where telegram_id = p_telegram_id;

  if v_user_id is null then
    return jsonb_build_object('linked', false, 'remaining', 0, 'token_balance', null);
  end if;

  select balance + coalesce(bonus_balance, 0)
    into v_token_balance
    from public.token_balances
    where user_id = v_user_id;

  return jsonb_build_object(
    'linked', true,
    'user_id', v_user_id,
    'remaining', coalesce(v_balance, 0),
    'token_balance', coalesce(v_token_balance, 0)
  );
end;
$$ language plpgsql stable security definer;


-- ============================================================
-- 5. Списание одного распознавания (идемпотентно по request_id)
-- ============================================================

create or replace function public.mushroom_bot_consume(
  p_telegram_id bigint,
  p_request_id text
) returns jsonb as $$
declare
  v_user_id uuid;
  v_balance integer;
begin
  if auth.role() != 'service_role' then
    return jsonb_build_object('success', false, 'error', 'forbidden', 'remaining', 0);
  end if;

  select user_id, balance
    into v_user_id, v_balance
    from public.mushroom_bot_accounts
    where telegram_id = p_telegram_id
    for update;

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'not_linked', 'remaining', 0);
  end if;

  -- Идемпотентность: тот же request_id не списывает повторно.
  if exists (
    select 1 from public.mushroom_bot_consume_log where request_id = p_request_id
  ) then
    return jsonb_build_object('success', true, 'remaining', coalesce(v_balance, 0), 'duplicate', true);
  end if;

  if coalesce(v_balance, 0) <= 0 then
    -- Нечего списывать. Не уходим в минус, но фиксируем запрос, чтобы избежать
    -- бесконечных повторов.
    insert into public.mushroom_bot_consume_log (request_id, user_id, telegram_id)
    values (p_request_id, v_user_id, p_telegram_id)
    on conflict (request_id) do nothing;
    return jsonb_build_object('success', false, 'error', 'insufficient', 'remaining', 0);
  end if;

  update public.mushroom_bot_accounts
    set balance = balance - 1,
        total_consumed = total_consumed + 1,
        updated_at = now()
    where user_id = v_user_id
    returning balance into v_balance;

  insert into public.mushroom_bot_consume_log (request_id, user_id, telegram_id)
  values (p_request_id, v_user_id, p_telegram_id);

  return jsonb_build_object('success', true, 'remaining', coalesce(v_balance, 0));
end;
$$ language plpgsql security definer;


-- ============================================================
-- 6. Перевод токенов с сайта на баланс бота (вызывает пользователь из ЛК)
--    Списываются ТОЛЬКО реальные токены (не приветственный бонус).
-- ============================================================

create or replace function public.mushroom_bot_transfer(
  p_user_id uuid,
  p_amount integer
) returns jsonb as $$
declare
  v_spend jsonb;
  v_bot_balance integer;
begin
  if auth.role() != 'service_role'
     and (auth.uid() is null or auth.uid() != p_user_id) then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  -- Списываем реальные токены (p_use_bonus => false), атомарно через spend_tokens.
  v_spend := public.spend_tokens(
    p_user_id,
    p_amount,
    'Перевод на баланс Telegram-бота (определение грибов): ' || p_amount || ' расп.',
    false
  );

  if not coalesce((v_spend->>'success')::boolean, false) then
    return jsonb_build_object(
      'success', false,
      'error', coalesce(v_spend->>'error', 'spend_failed'),
      'token_balance', coalesce((v_spend->>'balance')::int, 0)
    );
  end if;

  -- Зачисляем распознавания на баланс бота.
  insert into public.mushroom_bot_accounts (user_id, balance, total_added)
  values (p_user_id, p_amount, p_amount)
  on conflict (user_id) do update
    set balance = mushroom_bot_accounts.balance + p_amount,
        total_added = mushroom_bot_accounts.total_added + p_amount,
        updated_at = now()
  returning balance into v_bot_balance;

  return jsonb_build_object(
    'success', true,
    'transferred', p_amount,
    'token_balance', coalesce((v_spend->>'balance')::int, 0),
    'bot_balance', v_bot_balance
  );
end;
$$ language plpgsql security definer;


-- ============================================================
-- 7. Права: запретить прямой вызов серверных функций обычным ролям
-- ============================================================

revoke execute on function public.mushroom_bot_link(bigint, text) from anon, authenticated;
revoke execute on function public.mushroom_bot_status(bigint) from anon, authenticated;
revoke execute on function public.mushroom_bot_consume(bigint, text) from anon, authenticated;
