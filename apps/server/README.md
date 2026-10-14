# BROREPACK — сервер

Fastify 5 + grammY + Prisma 6 (SQLite). Отдаёт API для Mini App (контракт — [`docs/api.md`](../../docs/api.md)),
принимает платежи Telegram (ЮKassa), ходит в FACEIT Data API, рендерит файлы для печати и в проде
раздаёт собранный фронтенд (`apps/web/dist`).

## Быстрый старт (всё в моках)

```bash
nvm use                                   # Node 22
pnpm install                              # из корня монорепо; postinstall сгенерирует Prisma Client
pnpm --filter @brorepack/server fonts     # один раз: скачать TTF для файлов печати
cp apps/server/.env.example apps/server/.env   # по желанию — без .env тоже стартует
pnpm --filter @brorepack/server dev       # создаст/обновит prisma/dev.db и запустит tsx watch на :3000
```

Без ключа FACEIT сервер не стартует: по умолчанию `FACEIT_MODE=live`. Для разработки без ключа в `.env` явно
задаётся `FACEIT_MODE=mock` (так в `.env.example`), а приложение помечает такие профили «Тестовые данные».
При `NODE_ENV=production` заглушки `FACEIT_MODE=mock` и `PAYMENTS_MODE=mock` запрещены. Бот без токена выключен. Для запуска фронтенда в
обычном браузере нужны `DEV_AUTH_BYPASS=1` и `ADMIN_IDS=1` — тогда фронт ходит с заголовком
`Authorization: tma dev:1` и видит админку.

Проверка руками:

```bash
H='Authorization: tma dev:1'
curl localhost:3000/api/health
curl -H "$H" localhost:3000/api/me
curl -H "$H" 'localhost:3000/api/faceit/player?nickname=goodlifeee'   # профиль из макета: 9 lvl, 1809 elo
curl -H "$H" 'localhost:3000/api/faceit/player?nickname=notfound'     # 404 player_not_found
```

Оплата в моке: `POST /api/orders` → `POST /api/orders/:id/mock-pay` (та же логика, что у настоящего
`successful_payment`: статус `paid`, уведомления клиенту и админам).

## Скрипты

| Команда | Что делает |
|---|---|
| `dev` | `prisma db push` + `tsx watch` с `.env` (если есть) |
| `build` | `prisma generate` + tsup → `dist/index.js` (`@brorepack/shared` вшит, `@prisma/client` и `@resvg/resvg-js` — внешние) |
| `start` | `node dist/index.js` с `.env` (если есть) |
| `typecheck` | `tsc --noEmit` |
| `test` | `node --test` по `src/**/*.test.ts` (initData, FACEIT, бот) |
| `db:push` | применить `prisma/schema.prisma` к базе |
| `db:generate` | сгенерировать Prisma Client |
| `fonts` | скачать Unbounded 700/900 и Onest 400/600 в `fonts/*.ttf` (в git не попадают) |

## Переменные окружения

Полный список с комментариями — в [`.env.example`](.env.example).

| Переменная | По умолчанию | Зачем |
|---|---|---|
| `PORT` / `HOST` | `3000` / `0.0.0.0` | адрес HTTP-сервера |
| `NODE_ENV` | `development` | `production`: JSON-логи, без CORS, запрет `DEV_AUTH_BYPASS` |
| `DATABASE_URL` | `file:./dev.db` | SQLite; относительный путь — от `prisma/` |
| `BOT_TOKEN` | — | токен бота; нужен и для проверки initData |
| `BOT_MODE` | `polling`, если есть токен, иначе `off` | `polling` / `webhook` / `off` |
| `BOT_WEBHOOK_URL` | `<origin WEBAPP_URL>/bot/webhook` | публичный адрес вебхука |
| `BOT_WEBHOOK_SECRET` | выводится из токена | секрет `X-Telegram-Bot-Api-Secret-Token` |
| `WEBAPP_URL` | — | https-адрес Mini App; без https web_app-кнопок не будет |
| `ADMIN_IDS` | — | Telegram id админов через запятую |
| `PAYMENTS_MODE` | `mock` | `mock` / `telegram` |
| `PAYMENT_PROVIDER_TOKEN` | — | токен ЮKassa из BotFather (обязателен для `telegram`) |
| `FACEIT_MODE` | `live` | `live` / `mock` (только разработка) |
| `FACEIT_API_KEY` | — | server-side ключ FACEIT (обязателен для `live`) |
| `DEV_AUTH_BYPASS` | `false` | принимать `tma dev:<id>` (только для разработки) |
| `WEB_DIST_DIR` | `../web/dist` | откуда раздавать фронтенд (если там есть `index.html`) |

Неверная комбинация (например, `PAYMENTS_MODE=telegram` без токена) — сервер не стартует и пишет, чего не хватает.

## Переход на настоящие сервисы

### 1. Бот в @BotFather

1. `/newbot` → имя и username → получаешь `BOT_TOKEN`.
2. Mini App: `/mybots` → бот → **Bot Settings → Configure Mini App** (или `/newapp`, если нужна прямая ссылка
   `t.me/<bot>/<app>`) → URL фронтенда (только https). Этот же адрес — в `WEBAPP_URL`.
3. Кнопку меню чата сервер ставит сам при старте (`setChatMenuButton` → `WEBAPP_URL`).
4. Свой Telegram id (например, через @userinfobot) — в `ADMIN_IDS`. Админу нужно один раз написать боту
   `/start`, иначе бот не сможет присылать ему заказы и файлы.

### 2. Платежи (ЮKassa через Telegram Payments)

1. `/mybots` → бот → **Payments** → **ЮKassa** → сначала **тестовый** токен (`…:TEST:…`).
2. `.env`: `PAYMENTS_MODE=telegram`, `PAYMENT_PROVIDER_TOKEN=<токен>`, бот должен работать (`BOT_MODE` не `off`).
3. Платить тестовыми картами из документации ЮKassa (раздел «Тестирование» → тестовые банковские карты).
4. После проверки — подключить боевой магазин ЮKassa и заменить токен на боевой.

Как это работает: `POST /api/orders` создаёт заказ `awaiting_payment` и счёт `createInvoiceLink`
(RUB, суммы в копейках, `payload` = id заказа) → фронт открывает его через `Telegram.WebApp.openInvoice` →
бот на `pre_checkout_query` проверяет, что заказ ждёт оплаты и сумма совпадает → на `successful_payment`
заказ становится `paid`, сохраняются charge id, клиенту и админам уходят сообщения.

### 3. FACEIT

1. https://developers.faceit.com → App Studio → создать приложение → **API Keys** → Server-side key.
2. `.env`: `FACEIT_MODE=live`, `FACEIT_API_KEY=<ключ>`. Профили кэшируются в памяти на 60 секунд.

### Polling или webhook

- **polling** (по умолчанию при наличии токена) — удобно локально и на сервере без входящего https.
  Сервер сам снимает вебхук. Нельзя запускать два процесса с одним токеном.
- **webhook** — для прода за https: `BOT_MODE=webhook`, сервер регистрирует `POST /bot/webhook` и вызывает
  `setWebhook` с секретом. Адрес по умолчанию — `<origin WEBAPP_URL>/bot/webhook`, иначе задай `BOT_WEBHOOK_URL`.

## Файлы для печати

- `GET /api/admin/orders/:id/print.svg` — SVG в размер формата (мм), шрифты вшиты base64 (`@font-face`).
- `GET /api/admin/orders/:id/print.png` — PNG 300 dpi: A5 — 1748×2480, A4 — 2480×3508 (в файле прописан pHYs 300 dpi).
- `POST /api/admin/orders/:id/send-print` — бот присылает оба файла админу в личку.

PNG рендерит resvg из `fonts/*.ttf`. Если шрифтов нет — в логе предупреждение, и рендер идёт системными
шрифтами (на сервере без шрифтов текст может пропасть) — не забудь `pnpm --filter @brorepack/server fonts`.

## Прод

```bash
pnpm install --frozen-lockfile
pnpm --filter @brorepack/server fonts
pnpm build                                 # фронт + сервер
pnpm --filter @brorepack/server db:push    # схема БД (при первом запуске и после изменений schema.prisma)
NODE_ENV=production pnpm start
```

- Один процесс: сервер раздаёт `apps/web/dist` (index.html — `no-cache`, `assets/*` — immutable) и API.
- Перед сервером — reverse proxy с HTTPS (Caddy/nginx), домен из `WEBAPP_URL`. `trustProxy` включён.
- `NODE_ENV=production`, `DEV_AUTH_BYPASS` не задан (иначе сервер не стартует).
- SQLite — один файл (`prisma/dev.db` или путь из `DATABASE_URL`): положи его на постоянный диск и бэкапь.
- Остановка по SIGINT/SIGTERM корректная: бот, HTTP, база.

## Структура

```
src/
  index.ts        запуск, сборка зависимостей, graceful shutdown
  app.ts          Fastify: парсер JSON, обработчик ошибок, CORS, маршруты, статика
  config.ts       env → конфиг (zod), дефолты для разработки
  auth.ts         проверка Telegram initData, dev-обход, request.user / isAdmin
  faceit.ts       клиент FACEIT (live/mock) + кэш
  orders.ts       сервис заказов, маппер строки БД → Order, markOrderPaid
  bot.ts          grammY: /start, оплата, уведомления, отправка файлов
  print.ts        SVG с вшитыми шрифтами и PNG 300 dpi
  routes/         client.ts (/api/...), admin.ts (/api/admin/...)
prisma/schema.prisma
scripts/          fetch-fonts.mjs, prisma.mjs (Prisma CLI с DATABASE_URL по умолчанию)
```

## Не сделано / TODO

- Фискальные чеки 54-ФЗ (`provider_data.receipt`, `need_email`/`need_phone_number`) — нужны перед боевыми продажами.
- Нет rate limit на `/api/faceit/player` (кэш 60 с спасает только от повторов одного ника).
- Скачивание файлов печати требует заголовок `Authorization` — прямой ссылкой (`<a href>`) не открыть,
  только `fetch` → blob или кнопка «прислать в бот».
- Миграции — через `prisma db push` (для SQLite MVP достаточно); при росте — `prisma migrate`.
