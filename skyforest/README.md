# Skyforest.by

Сервис поиска грибных локаций. Next.js 15 + Supabase + Vercel.

## Стек

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS 4
- **Auth & DB**: Supabase (PostgreSQL, Auth)
- **Maps**: Leaflet + OpenStreetMap + Global Forest Watch
- **Weather**: Open-Meteo API
- **Payments**: bePaid
- **Deploy**: Vercel

## Запуск

```bash
npm install
cp .env.local.example .env.local
# Заполните переменные окружения
npm run dev
```

## Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com)
2. Выполните SQL из `supabase/schema.sql` в SQL Editor
3. Скопируйте URL и ключи в `.env.local`

## Настройка bePaid

1. Получите Shop ID и Secret Key в [личном кабинете bePaid](https://bepaid.by)
2. Добавьте их в `.env.local`
3. Настройте webhook URL: `https://skyforest.by/api/payment/webhook`

## Деплой на Vercel

1. Push в Git-репозиторий
2. Импортируйте в Vercel
3. Добавьте переменные окружения
4. Привяжите домен `skyforest.by`

## Структура

```
src/
  app/
    (marketing)/    - Лендинг и юридические страницы
    (app)/          - Приложение (карта, оплата, аккаунт)
    (auth)/         - Вход и регистрация
    api/            - Weather proxy, payment webhooks
  components/
    marketing/      - Header, Hero, About, Subscription, Contacts, Footer
    app/            - AppHeader, MapView
  lib/
    supabase/       - Client и Server клиенты Supabase
    payment.ts      - bePaid интеграция
    utils.ts        - Утилиты (cn)
```
