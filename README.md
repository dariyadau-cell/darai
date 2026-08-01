# IELTS Route

Веб-сервис для подготовки к IELTS: дашборд прогресса, тренажёры Listening/Reading/Writing/Speaking с AI-оценкой, словарь. Регистрация и прогресс синхронизируются через Supabase (Postgres + Auth), AI-оценка идёт через свой сервер (Vercel Function), ключ Claude не попадает в браузер.

Никакой сборки не требуется — чистые HTML/JS + одна serverless-функция.

## 1. Создать проект Supabase

1. Зарегистрируйтесь на [supabase.com](https://supabase.com) → **New project** (выберите регион, задайте пароль БД — он не понадобится дальше, только для прямого доступа к БД).
2. В проекте откройте **SQL Editor** → **New query**, вставьте содержимое [`supabase/schema.sql`](supabase/schema.sql) и выполните (Run). Это создаст таблицу `progress` с политиками RLS (каждый пользователь видит только свои данные).
3. В **Project Settings → API** скопируйте:
   - `Project URL` → это `SUPABASE_URL`
   - `anon public` key → это `SUPABASE_ANON_KEY`

## 2. Вставить ключи Supabase в код

Откройте [`index.html`](index.html), найдите в начале `<script>`:

```js
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';
```

Замените на свои значения из шага 1.3. Это публичные значения (не секрет) — безопасность обеспечивают RLS-политики в БД, а не сокрытие этого ключа.

## 3. Завести ключ Anthropic (для AI-оценки эссе/speaking)

1. Зарегистрируйтесь на [console.anthropic.com](https://console.anthropic.com), пополните баланс.
2. Создайте API-ключ (Settings → API Keys).
3. Этот ключ **никуда в код не вставляется** — он пойдёт только в переменные окружения Vercel (шаг 5). AI-оценка платная (по факту использования Anthropic API).

## 4. Запушить код в GitHub

```bash
cd ielts-route-app
git init
git add .
git commit -m "IELTS Route web service"
```

Создайте пустой репозиторий на [github.com/new](https://github.com/new), затем:

```bash
git remote add origin <URL вашего репозитория>
git branch -M main
git push -u origin main
```

## 5. Задеплоить на Vercel

1. Зарегистрируйтесь на [vercel.com](https://vercel.com) (можно через GitHub).
2. **Add New… → Project → Import** ваш репозиторий.
3. Framework Preset — **Other** (без сборки, ничего менять не нужно).
4. В **Environment Variables** добавьте:
   - `ANTHROPIC_API_KEY` — ключ из шага 3
   - `SUPABASE_URL` — тот же, что в шаге 1.3
   - `SUPABASE_ANON_KEY` — тот же, что в шаге 1.3
5. **Deploy**. После сборки откройте выданный `*.vercel.app` URL.

Каждый следующий `git push` в `main` автоматически передеплоит сайт.

## Проверка

- Откройте сайт → должна появиться форма входа/регистрации.
- Зарегистрируйтесь → Supabase пришлёт письмо с подтверждением на почту → перейдите по ссылке → войдите.
- Пройдите один тренажёр (например Listening) → обновите страницу → результат должен остаться (данные из БД, не из памяти браузера).
- Войдите под тем же аккаунтом в другом браузере/инкогнито → прогресс должен подхватиться — это и есть синхронизация.
- Отправьте эссе на AI-оценку (Writing) → должен прийти band и фидбек через `/api/grade`.

## Задел под iOS

Бэкенд — обычный Supabase-проект (Postgres + Auth + REST). Когда дойдёте до iOS-приложения, оно сможет подключиться к тому же проекту через официальный [`supabase-swift`](https://github.com/supabase/supabase-swift) SDK: та же таблица `progress`, те же RLS-политики (каждый пользователь видит только свои строки), тот же `/api/grade` для AI-оценки. Переделывать сервер не придётся — только писать нативный UI.
