# Бэкенд на Google Apps Script — протокол

Альтернатива `apps/server` (Node): тот же функционал на Apps Script, база — Google Таблица.
Фронт выбирает бэкенд переменной `VITE_API_TRANSPORT` (`rest` — Node, `gas` — Apps Script).
Типы данных те же — `packages/shared/src/types.ts`, схемы — `packages/shared/src/schemas.ts`.

## Почему протокол отличается от REST

- Веб-приложение Apps Script имеет один адрес (`.../exec`) и **не видит заголовки запроса** —
  поэтому подпись Telegram передаётся в теле, а метод выбирается полем `action`.
- Код ответа всегда 200 — статус передаётся в теле.
- CORS: запрос должен быть «простым» — `POST` с `Content-Type: text/plain;charset=utf-8`,
  без своих заголовков. Apps Script отвечает редиректом на `script.googleusercontent.com`,
  `fetch` проходит его сам (`redirect: 'follow'`), там стоит `Access-Control-Allow-Origin: *`.

## Запрос

```
POST <GAS_EXEC_URL>
Content-Type: text/plain;charset=utf-8

{ "action": "orders.create", "auth": "<Telegram.WebApp.initData | dev:<id>>", "params": { ... } }
```

`auth` проверяется так же, как в REST (`docs/api.md` → Авторизация): HMAC initData с ключом
от `BOT_TOKEN`, свежесть `auth_date` ≤ 24 ч; `dev:<id>` — только при `DEV_AUTH_BYPASS=1`.

## Ответ

```json
{ "ok": true, "data": <payload> }
{ "ok": false, "status": 400, "error": "validation_error", "message": "…", "issues": [{ "path": "recipient.phone", "message": "…" }] }
```

`status` и `error` — те же коды, что в REST (`401 unauthorized`, `403 forbidden`, `404 not_found`,
`404 player_not_found`, `409 order_not_payable`, `502 faceit_unavailable`, `502 payment_unavailable`,
`503 bot_unavailable`, `500 internal_error`).

## Действия

| action | params | data |
|---|---|---|
| `health` | — (без `auth`) | `{ ok: true }` |
| `me` | — | `MeResponse` |
| `faceit.player` | `{ nickname }` | `FaceitProfile` |
| `orders.create` | `CreateOrderInput` | `CreateOrderResponse` |
| `orders.list` | — | `Order[]` — свои, новые сверху, без `awaiting_payment` старше суток |
| `orders.get` | `{ id }` | `Order` (свой или любой для админа) |
| `orders.invoice` | `{ id }` | `{ invoiceUrl: string \| null, paymentMode }` |
| `orders.mockPay` | `{ id }` | `Order` — только при `PAYMENTS_MODE=mock`, иначе `404 not_found` |
| `admin.orders.list` | `{ status? }` | `Order[]`, новые сверху; без `status` — все, кроме `awaiting_payment` |
| `admin.orders.update` | `{ id, status, trackingNumber? }` | `Order` + сообщение клиенту от бота |
| `admin.orders.sendPrint` | `{ id, files: [{ name, mimeType, base64 }] }` | `{ ok: true }` — бот присылает файлы админу |

`admin.orders.sendPrint`: Apps Script не умеет рендерить PNG, поэтому файлы для печати
(`print.svg` со вшитыми шрифтами и `print.png` 300 dpi) рендерит браузер админа и присылает
в base64; сервер только отправляет их документами в чат админа (requester).

## Webhook Telegram

Telegram шлёт апдейты на `<GAS_EXEC_URL>?secret=<BOT_WEBHOOK_SECRET>` (заголовок
`X-Telegram-Bot-Api-Secret-Token` Apps Script прочитать не может — секрет в query).

- Тело с `update_id` → это апдейт Telegram, иначе — запрос API.
- Ответ на апдейт — `HtmlService` (200 без редиректа; на ответ `ContentService` Apps Script
  отдаёт 302, Telegram считает доставку неудачной и шлёт апдейт повторно).
- Дедупликация по `update_id` в `CacheService` на 6 ч; `markOrderPaid` идемпотентен.
- Логика бота — как в `docs/api.md` → Бот (`/start`, `pre_checkout_query`, `successful_payment`).

## Настройки — Script Properties

`BOT_TOKEN`, `BOT_WEBHOOK_SECRET`, `WEBAPP_URL`, `ADMIN_IDS`, `PAYMENTS_MODE` (`mock`|`telegram`),
`PAYMENT_PROVIDER_TOKEN`, `FACEIT_MODE` (`mock`|`live`), `FACEIT_API_KEY`, `DEV_AUTH_BYPASS` (`0`|`1`),
`SPREADSHEET_ID` (заполняет `setup()`), `WEBHOOK_URL` (адрес `/exec` развёртывания).

## Таблица

Лист «Заказы», одна строка — один заказ, первая строка — заголовки по-русски.
Статус хранится кодом (`paid`, `printing`…), на столбце — выпадающий список кодов.
Запись — под `LockService`, id — следующий после максимального.
