import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { CreateOrderResponse, Order } from '@brorepack/shared'
import { FakeHtmlOutput } from './gas-env'
import { BOT_PROPERTIES, DEV_PROPERTIES, WEBAPP_URL, createGas, orderInput } from './harness'

const PROPERTIES = { ...DEV_PROPERTIES, ...BOT_PROPERTIES, ADMIN_IDS: '1,2', PAYMENTS_MODE: 'telegram', PAYMENT_PROVIDER_TOKEN: '381764678:TEST:123' }

let updateId = 1000
const from = { id: 7, is_bot: false, first_name: 'Лёха', username: 'lexa' }
const chat = { id: 7, type: 'private', first_name: 'Лёха' }

function commandUpdate(text: string, user = from) {
  const command = text.split(' ')[0]!
  return {
    update_id: ++updateId,
    message: {
      message_id: 1,
      date: Math.floor(Date.now() / 1000),
      chat: { ...chat, id: user.id },
      from: user,
      text,
      entities: [{ type: 'bot_command', offset: 0, length: command.length }],
    },
  }
}

function preCheckoutUpdate(order: Order, totalAmount = order.price.total * 100, currency = 'RUB') {
  return {
    update_id: ++updateId,
    pre_checkout_query: { id: `pcq-${updateId}`, from, currency, total_amount: totalAmount, invoice_payload: String(order.id) },
  }
}

function successfulPaymentUpdate(order: Order, chargeId = `tg-charge-${order.id}`) {
  return {
    update_id: ++updateId,
    message: {
      message_id: 2,
      date: Math.floor(Date.now() / 1000),
      chat,
      from,
      successful_payment: {
        currency: 'RUB',
        total_amount: order.price.total * 100,
        invoice_payload: String(order.id),
        telegram_payment_charge_id: chargeId,
        provider_payment_charge_id: `yookassa-${order.id}`,
      },
    },
  }
}

function keyboardUrl(payload: any): string | undefined {
  return payload?.reply_markup?.inline_keyboard?.[0]?.[0]?.web_app?.url
}

function setupWithOrder() {
  const gas = createGas({ properties: PROPERTIES })
  const order = gas.api<CreateOrderResponse>('orders.create', orderInput(), 'dev:7').data.order
  gas.telegram!.clear()
  return { ...gas, order }
}

describe('webhook Telegram', () => {
  it('без secret или с чужим — апдейт игнорируется, ответ всё равно HtmlService «ok»', () => {
    const { webhook, telegram, env } = createGas({ properties: PROPERTIES })
    for (const secret of [null, 'wrong-secret', '']) {
      const output = webhook(commandUpdate('/start'), secret)
      assert.ok(output instanceof FakeHtmlOutput, 'ответ на апдейт — HtmlService (200 без редиректа)')
      assert.equal(output.getContent(), 'ok')
    }
    assert.equal(telegram!.calls.length, 0)
    assert.ok(env.logs.some((entry) => /неверный secret/.test(entry.message)))
  })

  it('без BOT_WEBHOOK_SECRET в настройках апдейты не принимаются вовсе', () => {
    const { webhook, telegram } = createGas({ properties: { ...PROPERTIES, BOT_WEBHOOK_SECRET: '' } })
    webhook(commandUpdate('/start'), '')
    webhook(commandUpdate('/start'), 'anything')
    assert.equal(telegram!.calls.length, 0)
  })

  it('/start — приветствие с кнопкой Mini App', () => {
    const { webhook, telegram } = createGas({ properties: PROPERTIES })
    const output = webhook(commandUpdate('/start'))
    assert.ok(output instanceof FakeHtmlOutput)
    const [call] = telegram!.byMethod('sendMessage')
    assert.equal(call!.payload.chat_id, 7)
    assert.equal(call!.payload.parse_mode, 'HTML')
    assert.match(call!.payload.text, /^Привет! Это <b>BROREPACK<\/b>/)
    assert.equal(keyboardUrl(call!.payload), WEBAPP_URL)
    assert.equal(call!.payload.reply_markup.inline_keyboard[0][0].text, 'Собрать плашку')
  })

  it('/start order_<id> и /start admin', () => {
    const { webhook, telegram } = createGas({ properties: PROPERTIES })
    webhook(commandUpdate('/start order_42'))
    let [call] = telegram!.byMethod('sendMessage')
    assert.equal(call!.payload.text, 'Заказ №1042 — открой, чтобы посмотреть статус.')
    assert.equal(keyboardUrl(call!.payload), `${WEBAPP_URL}#/orders/42`)

    telegram!.clear()
    webhook(commandUpdate('/start admin', { ...from, id: 1 }))
    ;[call] = telegram!.byMethod('sendMessage')
    assert.equal(call!.payload.reply_markup.inline_keyboard[0][0].text, 'Открыть админку')
    assert.equal(keyboardUrl(call!.payload), `${WEBAPP_URL}#/admin`)

    // Не админ по ссылке admin получает обычное приветствие
    telegram!.clear()
    webhook(commandUpdate('/start admin'))
    ;[call] = telegram!.byMethod('sendMessage')
    assert.equal(keyboardUrl(call!.payload), WEBAPP_URL)
  })

  it('WEBAPP_URL не https — сообщение без кнопки', () => {
    const { webhook, telegram } = createGas({ properties: { ...PROPERTIES, WEBAPP_URL: 'http://localhost:5173' } })
    webhook(commandUpdate('/start'))
    const [call] = telegram!.byMethod('sendMessage')
    assert.equal(call!.payload.reply_markup, undefined)
  })

  it('pre_checkout_query: ok, если заказ ждёт оплаты и сумма совпадает; иначе ok=false', () => {
    const { webhook, telegram, order } = setupWithOrder()

    webhook(preCheckoutUpdate(order))
    let [answer] = telegram!.byMethod('answerPreCheckoutQuery')
    assert.deepEqual(answer!.payload, { pre_checkout_query_id: `pcq-${updateId}`, ok: true })

    telegram!.clear()
    webhook(preCheckoutUpdate(order, order.price.total * 100 - 100))
    ;[answer] = telegram!.byMethod('answerPreCheckoutQuery')
    assert.deepEqual(answer!.payload, {
      pre_checkout_query_id: `pcq-${updateId}`,
      ok: false,
      error_message: 'Сумма заказа изменилась. Открой заказ и оплати заново.',
    })

    telegram!.clear()
    webhook(preCheckoutUpdate({ ...order, id: 999 }))
    ;[answer] = telegram!.byMethod('answerPreCheckoutQuery')
    assert.equal(answer!.payload.ok, false)
    assert.equal(answer!.payload.error_message, 'Заказ не найден. Собери плашку заново.')
  })

  it('successful_payment: заказ → paid, charge id в таблице, сообщения клиенту и админам', () => {
    const { webhook, telegram, order, api, ordersSheet } = setupWithOrder()
    const output = webhook(successfulPaymentUpdate(order))
    assert.ok(output instanceof FakeHtmlOutput)

    const stored = api<Order>('orders.get', { id: order.id }, 'dev:7').data
    assert.equal(stored.status, 'paid')
    assert.ok(stored.paidAt)

    const row = ordersSheet().records()[0]!
    assert.equal(row['статус'], 'paid')
    assert.equal(row['telegram charge id'], `tg-charge-${order.id}`)
    assert.equal(row['provider charge id'], `yookassa-${order.id}`)

    const messages = telegram!.byMethod('sendMessage')
    assert.deepEqual(
      messages.map((call) => call.payload.chat_id),
      [7, 1, 2],
    )
    assert.match(messages[0]!.payload.text, new RegExp(`^Заказ №${order.number} оплачен — спасибо!`))
    assert.equal(keyboardUrl(messages[0]!.payload), `${WEBAPP_URL}#/orders/${order.id}`)
    assert.match(messages[1]!.payload.text, new RegExp(`^<b>Новый заказ №${order.number}</b> — оплачен`))
    assert.match(messages[1]!.payload.text, /Надпись: Леха Гей/)
    assert.match(messages[1]!.payload.text, /Клиент: @dev \(id <code>7<\/code>\)/)
    assert.equal(messages[1]!.payload.reply_markup.inline_keyboard[0][0].text, 'Открыть в админке')
    assert.equal(keyboardUrl(messages[1]!.payload), `${WEBAPP_URL}#/admin/orders/${order.id}`)
  })

  it('один и тот же апдейт дважды — обрабатывается один раз', () => {
    const { webhook, telegram, order } = setupWithOrder()
    const update = successfulPaymentUpdate(order)
    webhook(update)
    const afterFirst = telegram!.calls.length
    assert.equal(afterFirst, 3)
    const output = webhook(update)
    assert.ok(output instanceof FakeHtmlOutput)
    assert.equal(telegram!.calls.length, afterFirst)

    const start = commandUpdate('/start')
    webhook(start)
    webhook(start)
    assert.equal(telegram!.byMethod('sendMessage').length, 4)
  })

  it('повторная оплата другим charge id (новый update_id) — заказ не трогаем, зовём админов', () => {
    const { webhook, telegram, order, ordersSheet } = setupWithOrder()
    webhook(successfulPaymentUpdate(order, 'charge-1'))
    telegram!.clear()

    // Тот же charge — тихо (идемпотентность markOrderPaid)
    webhook(successfulPaymentUpdate(order, 'charge-1'))
    assert.equal(telegram!.calls.length, 0)

    webhook(successfulPaymentUpdate(order, 'charge-2'))
    const messages = telegram!.byMethod('sendMessage')
    assert.deepEqual(
      messages.map((call) => call.payload.chat_id),
      [1, 2],
    )
    assert.match(messages[0]!.payload.text, /пришла оплата для заказа №\d+ в статусе «Оплачен»/)
    assert.equal(ordersSheet().records()[0]!['telegram charge id'], 'charge-1')
  })

  it('оплата несуществующего заказа и мусорного payload — сообщение админам, ответ ok', () => {
    const { webhook, telegram, order } = setupWithOrder()
    const output = webhook(successfulPaymentUpdate({ ...order, id: 777 }))
    assert.ok(output instanceof FakeHtmlOutput)
    let messages = telegram!.byMethod('sendMessage')
    assert.equal(messages.length, 2)
    assert.match(messages[0]!.payload.text, /несуществующего заказа id 777/)

    telegram!.clear()
    const junk = successfulPaymentUpdate(order)
    junk.message.successful_payment.invoice_payload = 'hello<script>'
    webhook(junk)
    messages = telegram!.byMethod('sendMessage')
    assert.equal(messages.length, 2)
    assert.match(messages[0]!.payload.text, /неизвестным payload <code>hello&lt;script&gt;<\/code>/)
  })

  it('ошибка Telegram внутри обработчика не вылетает из doPost', () => {
    const { webhook, telegram, env } = createGas({ properties: PROPERTIES })
    telegram!.failures.set('sendMessage', { code: 403, description: 'Forbidden: bot was blocked by the user' })
    const output = webhook(commandUpdate('/start'))
    assert.ok(output instanceof FakeHtmlOutput)
    assert.ok(env.logs.some((entry) => entry.level === 'error' && /bot was blocked/.test(entry.message)))
    assert.ok(env.logs.every((entry) => !entry.message.includes(BOT_PROPERTIES.BOT_TOKEN)), 'токен не должен попадать в лог')
  })

  it('mockPay и successful_payment дают одинаковый результат (общий markOrderPaid)', () => {
    const { api, telegram } = createGas({ properties: { ...PROPERTIES, PAYMENTS_MODE: 'mock' } })
    const { order } = api<CreateOrderResponse>('orders.create', orderInput(), 'dev:7').data
    telegram!.clear()
    const paid = api<Order>('orders.mockPay', { id: order.id }, 'dev:7').data
    assert.equal(paid.status, 'paid')
    assert.deepEqual(
      telegram!.byMethod('sendMessage').map((call) => call.payload.chat_id),
      [7, 1, 2],
    )
  })
})
