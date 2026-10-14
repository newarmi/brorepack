import { createHash } from 'node:crypto'
import {
  LIGHT_STAND,
  formatOrderNumber,
  formatPrice,
  getDeliveryMethod,
  getSize,
  getTemplate,
  type Order,
} from '@brorepack/shared'
import type { FastifyBaseLogger, FastifyInstance } from 'fastify'
import { Bot, InlineKeyboard, InputFile, webhookCallback } from 'grammy'
import type { Config } from './config'
import type { OrderService, OrderTelegramGateway } from './orders'
import { parseOrderId } from './orders'

export const BOT_WEBHOOK_PATH = '/bot/webhook'

export interface PrintFiles {
  svg: { content: string; fileName: string }
  png: { content: Buffer; fileName: string; width: number; height: number }
}

export interface TelegramService extends OrderTelegramGateway {
  readonly isEnabled: boolean
  /** null, когда бот выключен */
  readonly bot: Bot | null
  /** Подписка на апдейты, которым нужен сервис заказов (pre_checkout_query, successful_payment) */
  registerOrderHandlers(orders: OrderService): void
  /** Вызывается до app.listen: в режиме webhook регистрирует POST /bot/webhook */
  registerWebhookRoute(app: FastifyInstance): void
  /** Вызывается после app.listen: polling / setWebhook, кнопка меню */
  start(): Promise<void>
  stop(): Promise<void>
  sendPrintFiles(chatId: number, order: Order, files: PrintFiles): Promise<void>
}

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** WEBAPP_URL + hash-маршрут фронтенда; null, если web_app-кнопку показать нельзя (нужен https) */
export function buildWebAppUrl(config: Pick<Config, 'webappUrl' | 'isWebAppButtonAvailable'>, path = ''): string | null {
  if (!config.webappUrl || !config.isWebAppButtonAvailable) return null
  const url = new URL(config.webappUrl)
  url.hash = path ? `#${path}` : ''
  return url.toString()
}

function webAppKeyboard(text: string, url: string | null): { reply_markup?: InlineKeyboard } {
  return url ? { reply_markup: new InlineKeyboard().webApp(text, url) } : {}
}

const GREETING =
  'Привет! Это <b>BROREPACK</b> — акриловые плашки за достижения на FACEIT.\n\n' +
  'Введи свой ник, мы подтянем уровень и ELO, а ты соберёшь плашку: шаблон, размер, надпись и подсветку. ' +
  'Оплата — прямо в Telegram, а о статусе заказа напишем сюда.'

function statusMessage(order: Order): string | null {
  const number = `№${order.number}`
  switch (order.status) {
    case 'awaiting_payment':
      return null
    case 'paid':
      return `Заказ ${number} оплачен. Скоро отправим его в печать.`
    case 'printing':
      return `Заказ ${number} в печати. Как только плашка будет готова — отправим.`
    case 'shipped':
      return order.trackingNumber
        ? `Заказ ${number} отправлен! Трек-номер: <code>${escapeHtml(order.trackingNumber)}</code>`
        : `Заказ ${number} отправлен! Трек-номер пришлём отдельно.`
    case 'delivered':
      return `Заказ ${number} получен. Спасибо, что выбрал BROREPACK!`
    case 'cancelled':
      return `Заказ ${number} отменён.`
  }
}

export function formatAdminSummary(order: Order): string {
  const { design, delivery, recipient, price, customer } = order
  const size = getSize(design.size)
  const customerName = customer.username ? `@${customer.username}` : customer.firstName || 'без имени'
  const lines = [
    `<b>Новый заказ №${order.number}</b> — оплачен, ${formatPrice(price.total)}`,
    '',
    `Шаблон: ${escapeHtml(getTemplate(design.templateId).name)}`,
    `Размер: ${size.label} (${size.dimensions})`,
    `Надпись: ${escapeHtml(design.displayName)}`,
    `Подпись: ${design.caption ? escapeHtml(design.caption) : '—'}`,
    `FACEIT: ${escapeHtml(order.faceitNickname)} — ${design.level} lvl, ${design.elo} elo`,
    `${LIGHT_STAND.label}: ${order.extras.lightStand ? 'да' : 'нет'}`,
    '',
    `Доставка: ${getDeliveryMethod(delivery.method).label}, ${escapeHtml(delivery.city)}, ${escapeHtml(delivery.address)}`,
    `Получатель: ${escapeHtml(recipient.name)}`,
    `Телефон: ${escapeHtml(recipient.phone)}`,
    `Клиент: ${escapeHtml(customerName)} (id <code>${customer.telegramId}</code>)`,
  ]
  if (order.comment) lines.push(`Комментарий: ${escapeHtml(order.comment)}`)
  lines.push('', ...price.lines.map((line) => `${escapeHtml(line.label)} — ${formatPrice(line.amount)}`))
  lines.push(`<b>Итого: ${formatPrice(price.total)}</b>`)
  return lines.join('\n')
}

function invoiceDescription(order: Order): string {
  const parts = [
    getTemplate(order.design.templateId).name,
    getSize(order.design.size).label,
    `«${order.design.displayName}»`,
  ]
  if (order.extras.lightStand) parts.push('с подсветкой')
  parts.push(`доставка: ${getDeliveryMethod(order.delivery.method).label}`)
  return `Акриловая плашка FACEIT: ${parts.join(', ')}`.slice(0, 255)
}

/** Бот выключен (BOT_MODE=off): уведомления — только строка в логе */
function createDisabledTelegram(logger: FastifyBaseLogger): TelegramService {
  return {
    isEnabled: false,
    bot: null,
    registerOrderHandlers() {},
    registerWebhookRoute() {},
    async start() {
      logger.info('Бот выключен (BOT_MODE=off) — уведомления в Telegram отправляться не будут')
    },
    async stop() {},
    async createInvoiceLink() {
      throw new Error('Бот выключен: создать счёт нельзя')
    },
    async notifyOrderPaid(order) {
      logger.info({ orderId: order.id }, 'Бот выключен: пропускаю уведомление об оплате')
    },
    async notifyStatusChanged(order) {
      logger.info({ orderId: order.id, status: order.status }, 'Бот выключен: пропускаю уведомление о статусе')
    },
    async notifyAdmins(html) {
      logger.info({ html }, 'Бот выключен: пропускаю сообщение админам')
    },
    async sendPrintFiles() {
      throw new Error('Бот выключен')
    },
  }
}

export function createTelegram(config: Config, logger: FastifyBaseLogger): TelegramService {
  if (config.botMode === 'off' || !config.botToken) return createDisabledTelegram(logger)

  const bot = new Bot(config.botToken)
  const log = logger.child({ module: 'bot' })
  const webhookSecret =
    config.botWebhookSecret ?? createHash('sha256').update(`webhook:${config.botToken}`).digest('hex').slice(0, 64)

  bot.catch((error) => {
    log.error({ err: error.error, updateId: error.ctx.update.update_id }, 'Ошибка в обработчике бота')
  })

  bot.command('start', async (ctx) => {
    const payload = ctx.match.trim()
    const orderId = payload.startsWith('order_') ? parseOrderId(payload.slice('order_'.length)) : null

    if (orderId) {
      const url = buildWebAppUrl(config, `/orders/${orderId}`)
      await ctx.reply(`Заказ №${formatOrderNumber(orderId)} — открой, чтобы посмотреть статус.`, {
        parse_mode: 'HTML',
        ...webAppKeyboard('Открыть заказ', url),
      })
      return
    }

    const isAdminLink = payload === 'admin' && !!ctx.from && config.adminIds.has(ctx.from.id)
    const url = buildWebAppUrl(config, isAdminLink ? '/admin' : '')
    await ctx.reply(GREETING, {
      parse_mode: 'HTML',
      ...webAppKeyboard(isAdminLink ? 'Открыть админку' : 'Собрать плашку', url),
    })
  })

  /** Ошибки отправки (клиент заблокировал бота и т. п.) не должны ронять запрос — только лог */
  async function safeSend(chatId: number, html: string, button?: { text: string; url: string | null }): Promise<void> {
    try {
      await bot.api.sendMessage(chatId, html, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        ...(button ? webAppKeyboard(button.text, button.url) : {}),
      })
    } catch (error) {
      log.warn({ err: error, chatId }, 'Не удалось отправить сообщение')
    }
  }

  const service: TelegramService = {
    isEnabled: true,
    bot,

    registerOrderHandlers(orders) {
      bot.on('pre_checkout_query', async (ctx) => {
        const query = ctx.preCheckoutQuery
        let errorMessage: string | null
        try {
          errorMessage = await orders.checkPreCheckout(query.invoice_payload, query.total_amount, query.currency)
        } catch (error) {
          log.error({ err: error }, 'pre_checkout: ошибка проверки заказа')
          errorMessage = 'Не получилось проверить заказ, попробуй ещё раз.'
        }
        if (errorMessage) await ctx.answerPreCheckoutQuery(false, { error_message: errorMessage })
        else await ctx.answerPreCheckoutQuery(true)
      })

      bot.on('message:successful_payment', async (ctx) => {
        const payment = ctx.message.successful_payment
        const orderId = parseOrderId(payment.invoice_payload)
        if (!orderId) {
          log.error({ payment }, 'successful_payment с непонятным payload')
          await service.notifyAdmins(
            `<b>Внимание:</b> оплата с неизвестным payload <code>${escapeHtml(payment.invoice_payload)}</code>, ` +
              `charge id <code>${escapeHtml(payment.telegram_payment_charge_id)}</code>`,
          )
          return
        }
        await orders.markOrderPaid(orderId, {
          telegramChargeId: payment.telegram_payment_charge_id,
          providerChargeId: payment.provider_payment_charge_id || null,
        })
      })
    },

    registerWebhookRoute(app) {
      if (config.botMode !== 'webhook') return
      app.post(BOT_WEBHOOK_PATH, webhookCallback(bot, 'fastify', { secretToken: webhookSecret }))
    },

    async start() {
      await bot.init()
      log.info({ username: bot.botInfo.username, mode: config.botMode }, 'Бот запущен')

      const menuUrl = buildWebAppUrl(config)
      if (menuUrl) {
        await bot.api
          .setChatMenuButton({ menu_button: { type: 'web_app', text: 'Собрать плашку', web_app: { url: menuUrl } } })
          .catch((error: unknown) => log.warn({ err: error }, 'Не удалось поставить кнопку меню'))
      } else {
        log.warn('WEBAPP_URL не задан или не https — кнопки Mini App в боте не будет')
      }

      if (config.botMode === 'webhook' && config.botWebhookUrl) {
        await bot.api.setWebhook(config.botWebhookUrl, {
          secret_token: webhookSecret,
          allowed_updates: ['message', 'pre_checkout_query'],
        })
        log.info({ url: config.botWebhookUrl }, 'Webhook установлен')
        return
      }

      // polling: bot.start() резолвится только после остановки, поэтому не ждём
      void bot
        .start({ allowed_updates: ['message', 'pre_checkout_query'] })
        .catch((error: unknown) => log.error({ err: error }, 'Polling остановился с ошибкой'))
    },

    async stop() {
      if (bot.isRunning()) await bot.stop()
    },

    async createInvoiceLink(order) {
      if (!config.paymentProviderToken) throw new Error('PAYMENT_PROVIDER_TOKEN не задан')
      return bot.api.createInvoiceLink(
        `Плашка BROREPACK №${order.number}`,
        invoiceDescription(order),
        String(order.id),
        config.paymentProviderToken,
        'RUB',
        order.price.lines.map((line) => ({ label: line.label, amount: line.amount * 100 })),
      )
    },

    async notifyOrderPaid(order) {
      await safeSend(
        order.customer.telegramId,
        `Заказ №${order.number} оплачен — спасибо!\n` +
          'Скоро отправим плашку в печать, а когда она поедет к тебе — пришлём трек-номер сюда.',
        { text: 'Открыть заказ', url: buildWebAppUrl(config, `/orders/${order.id}`) },
      )
      const summary = formatAdminSummary(order)
      const adminUrl = buildWebAppUrl(config, `/admin/orders/${order.id}`)
      await Promise.all(
        [...config.adminIds].map((adminId) => safeSend(adminId, summary, { text: 'Открыть в админке', url: adminUrl })),
      )
    },

    async notifyStatusChanged(order) {
      const text = statusMessage(order)
      if (!text) return
      await safeSend(order.customer.telegramId, text, {
        text: 'Открыть заказ',
        url: buildWebAppUrl(config, `/orders/${order.id}`),
      })
    },

    async notifyAdmins(html) {
      await Promise.all([...config.adminIds].map((adminId) => safeSend(adminId, html)))
    },

    async sendPrintFiles(chatId, order, files) {
      const size = getSize(order.design.size)
      const title = `Заказ №${order.number}: ${size.label}, «${order.design.displayName}»`
      await bot.api.sendDocument(chatId, new InputFile(Buffer.from(files.svg.content, 'utf8'), files.svg.fileName), {
        caption: `${title}\nSVG в размер ${size.dimensions}, шрифты вшиты`,
      })
      await bot.api.sendDocument(chatId, new InputFile(files.png.content, files.png.fileName), {
        caption: `${title}\nPNG ${files.png.width}×${files.png.height}, 300 dpi`,
      })
    },
  }

  return service
}
