# SkyForest

Сервис поиска грибных локаций. Next.js 16 + Supabase + Vercel.

Два продакшен-деплоя из одного репозитория:

| Домен | Юрлицо | Платежи | `NEXT_PUBLIC_BRAND` |
|-------|--------|---------|---------------------|
| skyforest.by | ИП Горбацевич М.С. | bePaid (BYN) | *(пусто / skyforest)* |
| skyforest.ai | SAMPLIFY FZCO | Stripe (USD) | `samplify` |

База Supabase **общая** для обоих доменов.

## Стек

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS 4
- **Auth & DB**: Supabase (PostgreSQL, Auth)
- **Maps**: Leaflet + OpenStreetMap + Global Forest Watch
- **Weather**: Open-Meteo API
- **Payments**: bePaid (.by) / Stripe (.ai)
- **Deploy**: Vercel (два проекта или два env-набора)
- **i18n**: [next-intl](https://next-intl.dev) — `ru` и `en`. Для `.by` локаль по умолчанию `ru`, для `.ai` — `en`.

## Запуск

```bash
npm install
cp .env.local.example .env.local
# Заполните переменные окружения
npm run dev
```

Локальная проверка `.ai`-сборки:

```bash
NEXT_PUBLIC_BRAND=samplify NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run dev
```

## Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com)
2. Выполните SQL из `supabase/schema.sql` в SQL Editor
3. Скопируйте URL и ключи в `.env.local`
4. В **Authentication → URL Configuration** добавьте redirect URLs (общий Supabase для обоих доменов):
   - `https://skyforest.by/**`
   - `https://www.skyforest.by/**`
   - `https://skyforest.ai/**`
   - `https://www.skyforest.ai/**`
   - Явные callback-URL (если wildcard недоступен):
     - `https://www.skyforest.by/auth/callback`
     - `https://skyforest.by/auth/callback`
     - `https://skyforest.ai/auth/callback`
     - `https://www.skyforest.ai/auth/callback`
   - **Site URL** для `.by`-деплоя: `https://www.skyforest.by` (или основной домен того проекта Vercel, где включён Google provider).
5. В **Authentication → Providers → Google** убедитесь, что Client ID/Secret из Google Cloud Console подключены.
6. В [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth 2.0 Client (тот же, что в Supabase):
   - **Authorized redirect URIs**: `https://<project-ref>.supabase.co/auth/v1/callback`
   - **Authorized JavaScript origins** (для web OAuth): `https://www.skyforest.by`, `https://skyforest.by`, `https://skyforest.ai`, `https://www.skyforest.ai`

## Настройка bePaid (skyforest.by)

1. Shop ID и Secret Key в [личном кабинете bePaid](https://bepaid.by)
2. Webhook: `https://skyforest.by/api/payment/webhook`

## Настройка Stripe (skyforest.ai)

1. Создайте аккаунт Stripe для SAMPLIFY FZCO
2. Добавьте в env деплоя `.ai`:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
3. Webhook endpoint: `https://skyforest.ai/api/payment/stripe-webhook`
4. Событие: `checkout.session.completed`

## Деплой на Vercel

### skyforest.by

```
NEXT_PUBLIC_BRAND=skyforest   # или не задавать
NEXT_PUBLIC_APP_URL=https://www.skyforest.by
BEPAID_SHOP_ID=...
BEPAID_SECRET_KEY=...
# + Supabase, SMTP, CRON_SECRET
```

### skyforest.ai

```
NEXT_PUBLIC_BRAND=samplify
NEXT_PUBLIC_APP_URL=https://skyforest.ai
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
SMTP_FROM=noreply@skyforest.ai
# + те же Supabase keys, CRON_SECRET
```

## Структура

```
src/
  lib/
    brand.ts           - конфиг бренда (.by / .ai)
    payment.ts         - bePaid
    stripe.ts          - Stripe Checkout
    payment-credit.ts  - начисление токенов (общее)
  app/api/payment/
    checkout/          - создание сессии оплаты
    webhook/           - bePaid webhook
    stripe-webhook/    - Stripe webhook
  components/legal/    - юридические тексты для .ai
```
