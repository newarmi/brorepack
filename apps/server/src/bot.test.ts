import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import type { Order } from '@brorepack/shared'
import type { FastifyBaseLogger } from 'fastify'
import type { Bot } from 'grammy'
import { createTelegram, formatAdminSummary, type TelegramService } from './bot'
import { loadConfig } from './config'
import type { OrderService, PaymentCharge } from './orders'

const silentLogger: FastifyBaseLogger = new Proxy({} as FastifyBaseLogger, {
  get: (_target, key) => (key === 'child' ? () => silentLogger : () => {}),
})

const config = loadConfig({
  BOT_TOKEN: '123456:TEST',
  BOT_MODE: 'polling',
  WEBAPP_URL: 'https://app.example.com/',
  ADMIN_IDS: '1,2',
  PAYMENTS_MODE: 'telegram',
  PAYMENT_PROVIDER_TOKEN: '381764678:TEST:123',
  FACEIT_MODE: 'mock',
})

const order: Order = {
  id: 42,
  number: '1042',
  status: 'awaiting_payment',
  faceitPlayerId: 'p1',
  faceitNickname: 'goodlifeee',
  design: { templateId: 'graphite', size: 'A5', displayName: 'Леха <Гей>', caption: 'for reaching 9 lvl 1809 elo', level: 9, elo: 1809 },
  extras: { lightStand: true },
  delivery: {
    method: 'cdek_pvz',
    city: 'Москва',
    address: '1, Тверская улица, Москва, Россия',
    location: { lat: 55.7576, lon: 37.6136 },
  },
  recipient: { name: 'Алексей', phone: '+79991234567' },
  price: {
    lines: [
      { code: 'plaque', label: 'Плашка A5', amount: 2490 },
      { code: 'light_stand', label: 'Подставка с подсветкой', amount: 590 },
      { code: 'delivery', label: 'Доставка: Пункт СДЭК', amount: 390 },
    ],
    total: 3470,
  },
  trackingNumber: null,
  comment: null,
  customer: { telegramId: 10, username: 'lexa', firstName: 'Лёха' },
  createdAt: '2026-10-13T00:00:00.000Z',
  paidAt: null,
  updatedAt: '2026-10-13T00:00:00.000Z',
}

interface ApiCall {
  method: string
  payload: Record<string, unknown>
}

let telegram: TelegramService
let bot: Bot
let calls: ApiCall[]
let paidCalls: { orderId: number; charge: PaymentCharge }[]

const from = { id: 10, is_bot: false, first_name: 'Лёха' }
const chat = { id: 10, type: 'private' as const, first_name: 'Лёха' }
const date = Math.floor(Date.now() / 1000)

function commandUpdate(text: string) {
  const command = text.split(' ')[0]!
  return {
    update_id: 1,
    message: { message_id: 1, date, chat, from, text, entities: [{ type: 'bot_command' as const, offset: 0, length: command.length }] },
  }
}

function keyboardUrl(call: ApiCall | undefined): string | undefined {
  const markup = call?.payload.reply_markup as { inline_keyboard?: { web_app?: { url: string } }[][] } | undefined
  return markup?.inline_keyboard?.[0]?.[0]?.web_app?.url
}

beforeEach(() => {
  calls = []
  paidCalls = []
  telegram = createTelegram(config, silentLogger)
  bot = telegram.bot!
  bot.botInfo = { id: 1, is_bot: true, first_name: 'BROREPACK', username: 'brorepack_bot' } as Bot['botInfo']
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> })
    const result = method === 'createInvoiceLink' ? 'https://t.me/$invoice' : true
    return { ok: true, result } as never
  })

  const fakeOrders = {
    async checkPreCheckout(payload: string, totalAmount: number, currency: string) {
      return payload === '42' && totalAmount === 347_000 && currency === 'RUB' ? null : 'Сумма заказа изменилась.'
    },
    async markOrderPaid(orderId: number, charge: PaymentCharge) {
      paidCalls.push({ orderId, charge })
      return { order: { ...order, status: 'paid' }, isNewlyPaid: true }
    },
  } as unknown as OrderService
  telegram.registerOrderHandlers(fakeOrders)
})

describe('бот', () => {
  it('/start — приветствие с web_app-кнопкой на WEBAPP_URL', async () => {
    await bot.handleUpdate(commandUpdate('/start'))
    assert.equal(calls[0]?.method, 'sendMessage')
    assert.equal(keyboardUrl(calls[0]), 'https://app.example.com/')
  })

  it('/start order_<id> — кнопка ведёт на #/orders/<id>', async () => {
    await bot.handleUpdate(commandUpdate('/start order_42'))
    assert.equal(keyboardUrl(calls[0]), 'https://app.example.com/#/orders/42')
    assert.match(String(calls[0]?.payload.text), /№1042/)
  })

  it('pre_checkout_query подтверждается только при совпадении суммы', async () => {
    const query = { id: 'q1', from, currency: 'RUB', total_amount: 347_000, invoice_payload: '42' }
    await bot.handleUpdate({ update_id: 2, pre_checkout_query: query })
    await bot.handleUpdate({ update_id: 3, pre_checkout_query: { ...query, id: 'q2', total_amount: 100 } })
    assert.deepEqual(calls[0], { method: 'answerPreCheckoutQuery', payload: { pre_checkout_query_id: 'q1', ok: true } })
    assert.equal(calls[1]?.payload.ok, false)
    assert.equal(calls[1]?.payload.error_message, 'Сумма заказа изменилась.')
  })

  it('successful_payment → markOrderPaid с charge id', async () => {
    await bot.handleUpdate({
      update_id: 4,
      message: {
        message_id: 2,
        date,
        chat,
        from,
        successful_payment: {
          currency: 'RUB',
          total_amount: 347_000,
          invoice_payload: '42',
          telegram_payment_charge_id: 'tg_charge',
          provider_payment_charge_id: 'yk_charge',
        },
      },
    })
    assert.deepEqual(paidCalls, [{ orderId: 42, charge: { telegramChargeId: 'tg_charge', providerChargeId: 'yk_charge' } }])
  })

  it('createInvoiceLink: RUB, суммы в копейках, payload = id заказа', async () => {
    const url = await telegram.createInvoiceLink(order)
    assert.equal(url, 'https://t.me/$invoice')
    const payload = calls[0]?.payload
    assert.equal(calls[0]?.method, 'createInvoiceLink')
    assert.equal(payload?.payload, '42')
    assert.equal(payload?.currency, 'RUB')
    assert.equal(payload?.provider_token, '381764678:TEST:123')
    assert.deepEqual(payload?.prices, [
      { label: 'Плашка A5', amount: 249_000 },
      { label: 'Подставка с подсветкой', amount: 59_000 },
      { label: 'Доставка: Пункт СДЭК', amount: 39_000 },
    ])
    assert.ok(String(payload?.title).length <= 32)
  })

  it('оплата: клиенту — сообщение с кнопкой заказа, каждому админу — сводка с кнопкой админки', async () => {
    await telegram.notifyOrderPaid({ ...order, status: 'paid' })
    const byChat = new Map(calls.map((call) => [call.payload.chat_id, call]))
    assert.match(String(byChat.get(10)?.payload.text), /Заказ №1042 оплачен/)
    assert.equal(keyboardUrl(byChat.get(10)), 'https://app.example.com/#/orders/42')
    for (const adminId of [1, 2]) {
      assert.equal(keyboardUrl(byChat.get(adminId)), 'https://app.example.com/#/admin/orders/42')
    }
  })

  it('смена статуса на shipped — с трек-номером', async () => {
    await telegram.notifyStatusChanged({ ...order, status: 'shipped', trackingNumber: 'CDEK123' })
    assert.equal(calls[0]?.payload.chat_id, 10)
    assert.match(String(calls[0]?.payload.text), /отправлен.*CDEK123/)
  })

  it('сводка для админа экранирует HTML', () => {
    const summary = formatAdminSummary(order)
    assert.match(summary, /Леха &lt;Гей&gt;/)
    assert.match(summary, /Телефон: \+79991234567/)
  })

  it('сводка для админа: полный адрес без повтора города и координаты', () => {
    const summary = formatAdminSummary(order)
    assert.match(summary, /Доставка: Пункт СДЭК, 1, Тверская улица, Москва, Россия\n/)
    assert.match(summary, /Координаты: 55\.757600, 37\.613600/)

    const manual = formatAdminSummary({ ...order, delivery: { method: 'courier', city: '', address: 'Казань, Баумана, 1', location: null } })
    assert.match(manual, /Доставка: Курьер, Казань, Баумана, 1\n/)
    assert.match(manual, /Координаты: нет — адрес введён вручную/)
  })
})

describe('бот без https WEBAPP_URL', () => {
  it('не добавляет web_app-кнопку', async () => {
    const httpTelegram = createTelegram(
      loadConfig({ BOT_TOKEN: '123456:TEST', WEBAPP_URL: 'http://localhost:5173/', FACEIT_MODE: 'mock' }),
      silentLogger,
    )
    const httpBot = httpTelegram.bot!
    const httpCalls: ApiCall[] = []
    httpBot.botInfo = bot.botInfo
    httpBot.api.config.use(async (_prev, method, payload) => {
      httpCalls.push({ method, payload: payload as Record<string, unknown> })
      return { ok: true, result: true } as never
    })
    await httpBot.handleUpdate(commandUpdate('/start'))
    assert.equal(httpCalls[0]?.payload.reply_markup, undefined)
  })
})
