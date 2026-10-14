# BROREPACK — Telegram Mini App

Плашки за уровень на FACEIT: клиент вводит ник, собирает плашку, платит в Telegram,
владелец получает заказ и файл для печати в боте.

- **Запуск с нуля по шагам — [docs/DEPLOY.md](docs/DEPLOY.md)**
- План и архитектура — [docs/PLAN.md](docs/PLAN.md)
- API-контракт — [docs/api.md](docs/api.md)
- Сервер — [apps/server/README.md](apps/server/README.md)
- Макет — https://www.figma.com/design/h1eE9FVhdUFxGoGw0k5NfQ

## Структура

```
packages/shared   типы, цены, уровни FACEIT, zod-схемы, рендер плашки (SVG)
apps/gas          бэкенд на Google Apps Script, база — Google Таблица (основной вариант)
apps/server       бэкенд на Node: Fastify + grammY + Prisma/SQLite (запасной вариант)
apps/web          Vue 3 + Vite: Mini App и кабинет администратора
```

Фронт работает с любым бэкендом: `VITE_API_TRANSPORT=gas` (Apps Script) или `rest` (Node).
Протокол Apps Script — [docs/gas.md](docs/gas.md).

## Боевой запуск: Google Apps Script + GitHub Pages

Бесплатно и без своего сервера. Заказы лежат в Google Таблице владельца.

1. **Бэкенд** — по шагам в [apps/gas/README.md](apps/gas/README.md): `clasp login`, `push`,
   `setup()` (создаст таблицу «BROREPACK — заказы»), свойства скрипта, развёртывание веб-приложения,
   `setWebhook()`.
2. **Фронт** — репозиторий на GitHub → Settings → Pages → Source: GitHub Actions →
   Variables: `GAS_URL` (адрес `…/exec`), `BOT_URL` (`https://t.me/<бот>`). Пуш в `main`
   соберёт и выложит Mini App ([.github/workflows/deploy-web.yml](.github/workflows/deploy-web.yml)).
3. Адрес Pages (`https://<логин>.github.io/<репозиторий>/`) — в свойство скрипта `WEBAPP_URL`,
   затем `setMenuButton()`.

**Кабинет администратора** — раздел «Админка» внутри Mini App. Виден и открывается только
пользователям из `ADMIN_IDS` (проверка на сервере по подписи Telegram). По умолчанию показывает
текущие заказы: оплаченные, в печати и отправленные. Файл для печати рендерится в браузере
админа и приходит в чат с ботом.

Ограничения Apps Script: ответ 1–3 с, лимиты Google на запросы в сутки и 30 одновременных
выполнений — для небольшого магазина хватает с запасом. Если упрётесь — переключитесь на
`apps/server` без переписывания фронта.

## Локальный запуск (всё в моках, без Telegram)

```bash
nvm use
```

```bash
pnpm install
```

```bash
cp apps/server/.env.example apps/server/.env
```

```bash
pnpm --filter @brorepack/server db:push
```

```bash
pnpm --filter @brorepack/server fonts
```

```bash
pnpm dev
```

Открыть http://localhost:5173 — приложение работает в обычном браузере: сверху и снизу
нарисованы заглушки шапки и главной кнопки Telegram. Пользователь `dev:1` — админ (`#/admin`).
Ник `goodlifeee` даёт 9 уровень и 1809 ELO, `notfound` — «игрок не найден».

## Где менять цены и шаблоны

`packages/shared/src/catalog.ts` — размеры, допы, доставка, шаблоны и их цвета.
Сервер считает итог по тем же данным, поэтому менять нужно только здесь.

## Запасной вариант: свой сервер на Node

Всё ниже делает владелец — нужны его аккаунты. Пункты про бота, ЮKassa, FACEIT и `ADMIN_IDS`
нужны и для варианта с Apps Script — там они задаются в свойствах скрипта.

1. **Бот.** @BotFather → `/newbot` → получить `BOT_TOKEN`.
2. **Хостинг с HTTPS.** Mini App и web_app-кнопки работают только по https. Подойдёт VPS
   (Node 22 + Caddy/nginx) или PaaS. Собрать `pnpm build`, запустить `pnpm start` —
   сервер сам раздаёт фронт. Прописать `WEBAPP_URL=https://<домен>`.
3. **Mini App в боте.** @BotFather → `/mybots` → бот → Bot Settings → Menu Button → URL
   приложения (сервер также ставит кнопку меню сам при старте).
4. **Оплата.** @BotFather → `/mybots` → Payments → ЮKassa. Сначала тестовый токен
   (`PAYMENTS_MODE=telegram`, `PAYMENT_PROVIDER_TOKEN=...TEST...`), потом боевой после договора с ЮKassa.
5. **FACEIT.** https://developers.faceit.com → войти аккаунтом FACEIT → App Studio → создать приложение →
   API Keys → тип Server side → `FACEIT_API_KEY=...`. Ключ бесплатный. Без него приложение не покажет
   настоящий уровень и ELO.
6. **Админы.** Узнать свой Telegram id (например, через @userinfobot) → `ADMIN_IDS=123,456`.
7. **Webhook вместо polling** (для продакшна): `BOT_MODE=webhook`,
   `BOT_WEBHOOK_URL=https://<домен>/bot/webhook`, `BOT_WEBHOOK_SECRET=<случайная строка>`.

## Перед боевыми продажами

- **Чеки 54-ФЗ.** ЮKassa требует передавать состав чека (`provider_data.receipt`) — добавить
  в создание инвойса вместе с телефоном или email покупателя.
- **Логотип FACEIT.** Плашки не используют товарный знак FACEIT, но упоминание в текстах и
  рекламе лучше согласовать.
- **Требования типографии.** Уточнить вылеты (bleed), формат (PDF/SVG/PNG) и цветовой профиль.
