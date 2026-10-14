import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { CreateOrderResponse } from '@brorepack/shared'
import { BOT_PROPERTIES, BOT_TOKEN, DEV_PROPERTIES, WEBAPP_URL, WEBHOOK_SECRET, createGas, orderInput } from './harness'

const STATUSES = ['awaiting_payment', 'paid', 'printing', 'shipped', 'delivered', 'cancelled']

describe('setup()', () => {
  it('создаёт таблицу и лист «Заказы»: заголовки, закреплённая строка, форматы, выпадающий список статусов', () => {
    const { env, gas, ordersSheet } = createGas({ withSheet: false })
    gas.setup()

    const id = env.properties.store.get('SPREADSHEET_ID')!
    const spreadsheet = env.spreadsheetApp.openById(id)
    assert.equal(spreadsheet.getName(), 'BROREPACK — заказы')
    assert.deepEqual(
      spreadsheet.getSheets().map((sheet) => sheet.getName()),
      ['Заказы'],
      'пустой «Лист1» переименован, а не оставлен рядом',
    )

    const sheet = ordersSheet()
    const headers = sheet.dump()[0] as string[]
    assert.equal(headers.length, 29)
    assert.ok(sheet.getMaxColumns() >= 29, 'столбцы добавлены сверх стандартных 26')
    assert.equal(sheet.frozenRows, 1)
    assert.ok(sheet.styles.some((style) => style.row === 1 && style.style === 'fontWeight' && style.value === 'bold'))
    assert.equal(sheet.columnWidths.size, 29)

    const statusColumn = headers.indexOf('статус') + 1
    const statusRule = sheet.validations.find((validation) => validation.column === statusColumn)
    assert.deepEqual(statusRule?.rule.values, STATUSES)
    assert.equal(statusRule?.rule.allowInvalid, false)
    assert.equal(statusRule?.row, 2)

    const phoneColumn = headers.indexOf('телефон') + 1
    const idColumn = headers.indexOf('id') + 1
    assert.equal(sheet.getRange(500, phoneColumn).getNumberFormats()[0]![0], '@')
    assert.equal(sheet.getRange(500, idColumn).getNumberFormats()[0]![0], '0')

    // Режимы по умолчанию — боевые: заглушки включают только явно
    assert.equal(env.properties.store.get('PAYMENTS_MODE'), 'telegram')
    assert.equal(env.properties.store.get('FACEIT_MODE'), 'live')
    assert.equal(env.properties.store.get('DEV_AUTH_BYPASS'), '0')
    assert.ok(env.logs.some((entry) => entry.message.includes(spreadsheet.getUrl())))
  })

  it('повторный запуск ничего не ломает, недостающие столбцы дописывает справа', () => {
    const { gas, api, ordersSheet, env } = createGas({ properties: DEV_PROPERTIES })
    api('orders.create', orderInput(), 'dev:7')
    const sheet = ordersSheet()

    // Владелец переставил столбцы и добавил свой; один наш столбец пропал
    const headers = sheet.dump()[0] as string[]
    const trackColumn = headers.indexOf('трек-номер') + 1
    sheet.getRange(1, trackColumn).setValue('заметки')
    gas.setup()

    const after = sheet.dump()[0] as string[]
    assert.equal(after[trackColumn - 1], 'заметки')
    assert.equal(after.at(-1), 'трек-номер')
    assert.equal(env.spreadsheetApp.spreadsheets.size, 1, 'вторую таблицу не создаёт')

    // Заказы продолжают работать с новым порядком столбцов, «заметки» владельца не трогаются
    sheet.getRange(2, trackColumn).setValue('позвонить клиенту')
    const created = api<CreateOrderResponse>('orders.create', orderInput(), 'dev:7')
    assert.equal(created.data.order.id, 2)
    api('orders.mockPay', { id: 2 }, 'dev:7')
    api('admin.orders.update', { id: 1, status: 'cancelled', trackingNumber: 'RA123' }, 'dev:1')
    const rows = sheet.records()
    assert.equal(rows[0]!['заметки'], 'позвонить клиенту')
    assert.equal(rows[0]!['трек-номер'], 'RA123')
    assert.equal(rows[1]!['статус'], 'paid')
  })

  it('удалённая строка не освобождает id (счётчик LAST_ORDER_ID)', () => {
    const { api, ordersSheet, env } = createGas({ properties: DEV_PROPERTIES })
    api('orders.create', orderInput(), 'dev:7')
    api('orders.create', orderInput(), 'dev:7')
    assert.equal(env.properties.store.get('LAST_ORDER_ID'), '2')
    ordersSheet().deleteRow(3)
    assert.equal(api<CreateOrderResponse>('orders.create', orderInput(), 'dev:7').data.order.id, 3)

    // Счётчик потерян — id всё равно не меньше максимального в листе
    env.properties.store.delete('LAST_ORDER_ID')
    assert.equal(api<CreateOrderResponse>('orders.create', orderInput(), 'dev:7').data.order.id, 4)
  })

  it('больше 1000 заказов: лист растёт сам', () => {
    const { api, ordersSheet } = createGas({ properties: DEV_PROPERTIES })
    const sheet = ordersSheet()
    sheet.maxRows = 3
    for (let index = 0; index < 4; index++) assert.equal(api('orders.create', orderInput(), 'dev:7').ok, true)
    assert.ok(sheet.getMaxRows() > 5)
    assert.equal(sheet.records().length, 4)
  })

  it('чужой лист без нужных столбцов — понятная ошибка в логе', () => {
    const { api, ordersSheet, env } = createGas({ properties: DEV_PROPERTIES })
    ordersSheet().getRange(1, 1).setValue('что-то своё')
    assert.equal(api('orders.list', undefined, 'dev:7').error, 'internal_error')
    assert.ok(env.logs.some((entry) => /нет столбцов «id»/.test(entry.message) && /setup\(\)/.test(entry.message)))
  })
})

describe('setWebhook / deleteWebhook / setMenuButton / checkConfig', () => {
  const EXEC_URL = 'https://script.google.com/macros/s/AKfy-test/exec'

  it('setWebhook генерирует секрет и ставит вебхук на WEBHOOK_URL?secret=…', () => {
    const { gas, telegram, env } = createGas({ properties: { BOT_TOKEN, WEBHOOK_URL: EXEC_URL } })
    gas.setWebhook()
    const secret = env.properties.store.get('BOT_WEBHOOK_SECRET')!
    assert.match(secret, /^[0-9a-f]{64}$/)
    const [call] = telegram!.byMethod('setWebhook')
    assert.deepEqual(call!.payload, { url: `${EXEC_URL}?secret=${secret}`, allowed_updates: ['message', 'pre_checkout_query'] })
    assert.ok(env.logs.every((entry) => !entry.message.includes(secret)), 'секрет не пишем в лог')

    // Существующий секрет не меняется
    telegram!.clear()
    gas.setWebhook()
    assert.equal(env.properties.store.get('BOT_WEBHOOK_SECRET'), secret)
  })

  it('setWebhook без WEBHOOK_URL или с /dev — понятная ошибка', () => {
    const { gas } = createGas({ properties: { BOT_TOKEN } })
    assert.throws(() => gas.setWebhook(), /WEBHOOK_URL/)
    const dev = createGas({ properties: { BOT_TOKEN, WEBHOOK_URL: 'https://script.google.com/macros/s/AKfy-test/dev' } })
    assert.throws(() => dev.gas.setWebhook(), /\/exec/)
    const noToken = createGas({ properties: { WEBHOOK_URL: EXEC_URL } })
    assert.throws(() => noToken.gas.setWebhook(), /BOT_TOKEN/)
  })

  it('deleteWebhook и setMenuButton', () => {
    const { gas, telegram } = createGas({ properties: { ...BOT_PROPERTIES } })
    gas.deleteWebhook()
    assert.equal(telegram!.byMethod('deleteWebhook').length, 1)
    gas.setMenuButton()
    const [call] = telegram!.byMethod('setChatMenuButton')
    assert.deepEqual(call!.payload, { menu_button: { type: 'web_app', text: 'Собрать плашку', web_app: { url: WEBAPP_URL } } })

    const insecure = createGas({ properties: { BOT_TOKEN, WEBAPP_URL: 'http://localhost:5173' } })
    assert.throws(() => insecure.gas.setMenuButton(), /https/)
  })

  it('checkConfig показывает, что задано, но не значения секретов', () => {
    const properties = {
      ...BOT_PROPERTIES,
      ADMIN_IDS: '1, 2, abc',
      PAYMENTS_MODE: 'telegram',
      PAYMENT_PROVIDER_TOKEN: '381764678:TEST:secret-provider',
      FACEIT_MODE: 'live',
      FACEIT_API_KEY: 'faceit-secret-key',
      DEV_AUTH_BYPASS: '1',
    }
    const { gas, env } = createGas({ properties })
    gas.checkConfig()
    const output = env.logs.map((entry) => entry.message).join('\n')
    for (const secret of [BOT_TOKEN, WEBHOOK_SECRET, properties.PAYMENT_PROVIDER_TOKEN, properties.FACEIT_API_KEY]) {
      assert.ok(!output.includes(secret), `в логе секрет: ${secret}`)
    }
    assert.match(output, /BOT_TOKEN: задано/)
    assert.match(output, /PAYMENTS_MODE: telegram/)
    assert.match(output, /WEBHOOK_URL: не задано/)
    assert.match(output, /ADMIN_IDS: «abc»/)
    assert.match(output, /DEV_AUTH_BYPASS=1/)
    assert.match(output, /Бот: @brorepack_test_bot/)
    assert.match(output, /Таблица: OK/)
  })
})
