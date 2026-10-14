# API-контракт

Типы — в `packages/shared/src/types.ts`, схемы тел запросов — в `packages/shared/src/schemas.ts`.
Базовый путь — `/api`. Все ответы — JSON, кроме файлов. Ошибки: `{ "error": "<code>", "message"?: "<для людей>" }`.

## Авторизация

Каждый запрос к `/api/*` (кроме `/api/health`) несёт заголовок:

```
Authorization: tma <Telegram.WebApp.initData>
```

Сервер проверяет подпись initData (HMAC-SHA256, ключ = HMAC_SHA256(key="WebAppData", msg=BOT_TOKEN))
и свежесть `auth_date` (не старше 24 ч), берёт из неё `user`.

Режим разработки (`DEV_AUTH_BYPASS=1` на сервере): принимается `Authorization: tma dev:<telegramUserId>`,
пользователь `{ id, first_name: "Dev", username: "dev" }`.

Админ — пользователь, чей Telegram id есть в `ADMIN_IDS` (через запятую).

Коды: `401 unauthorized` — нет или битая initData; `403 forbidden` — не админ / чужой заказ.

## Клиент

| Метод | Путь | Ответ |
|---|---|---|
| GET | `/api/health` | `{ ok: true }` (без авторизации) |
| GET | `/api/me` | `MeResponse` |
| GET | `/api/faceit/player?nickname=<ник>` | `FaceitProfile` · `400 invalid_nickname` · `404 player_not_found` · `502 faceit_unavailable` |
| POST | `/api/orders` | тело `CreateOrderInput` → `201 CreateOrderResponse` · `400 validation_error` · `404 player_not_found` |
| GET | `/api/orders` | `Order[]` — заказы текущего пользователя, новые сверху, без `awaiting_payment` старше суток |
| GET | `/api/orders/:id` | `Order` (свой или любой для админа) |
| POST | `/api/orders/:id/invoice` | `{ invoiceUrl: string \| null, paymentMode }` — повторная ссылка на оплату для заказа в `awaiting_payment` |
| POST | `/api/orders/:id/mock-pay` | `Order` — только при `PAYMENTS_MODE=mock`, иначе `404` |

`POST /api/orders`:
1. Валидирует тело по `createOrderInputSchema`.
2. Заново получает профиль FACEIT по `nickname` — `level`, `elo`, `playerId` и подпись
   `caption` («for reaching 9 lvl · 1809 elo») собираются оттуда; клиент их не присылает и подделать не может.
   Формат — только `A5`.
3. Считает цену `calcPrice({ templateId, size, extras, deliveryMethod })`.
4. Создаёт заказ в статусе `awaiting_payment`.
5. `PAYMENTS_MODE=telegram` → `bot.api.createInvoiceLink(...)`, валюта RUB, суммы в копейках,
   `payload = String(order.id)`; `PAYMENTS_MODE=mock` → `invoiceUrl: null`.

## Админ

| Метод | Путь | Ответ |
|---|---|---|
| GET | `/api/admin/orders?status=<OrderStatus>` | `Order[]`, новые сверху; без `status` — все, кроме `awaiting_payment` |
| PATCH | `/api/admin/orders/:id` | тело `UpdateOrderStatusInput` → `Order`; клиенту уходит сообщение от бота о новом статусе |
| POST | `/api/admin/orders/:id/send-print` | `{ ok: true }` — бот присылает админу в личку `print.svg` (шрифты вшиты) и `print.png` (300 dpi) |
| GET | `/api/admin/orders/:id/print.svg` | файл SVG (`Content-Disposition: attachment`) |
| GET | `/api/admin/orders/:id/print.png` | файл PNG 300 dpi |

## Бот

- `/start` — приветствие и кнопка web_app «Собрать плашку». `start` с параметром `order_<id>`
  открывает заказ: у кнопки web_app URL `WEBAPP_URL#/orders/<id>`.
- При старте сервер ставит кнопку меню чата → Mini App.
- `pre_checkout_query` — подтверждает, только если заказ существует, в `awaiting_payment` и сумма совпадает.
- `successful_payment` — заказ → `paid`, сохраняются charge id; клиенту — «Заказ №… оплачен»,
  админам — сводка и кнопка «Открыть в админке» (`WEBAPP_URL#/admin/orders/<id>`).
- Смена статуса админом — клиенту сообщение со статусом (для `shipped` — с трек-номером).

## Фронтенд-маршруты (hash history)

`#/` старт · `#/profile/:nickname` · `#/constructor` · `#/checkout` · `#/orders` · `#/orders/:id` ·
`#/admin` · `#/admin/orders/:id`. `Telegram.WebApp.initDataUnsafe.start_param` = `order_<id>` или `admin`
открывает соответствующий экран при запуске.
