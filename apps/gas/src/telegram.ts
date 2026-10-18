import {
  LIGHT_STAND,
  formatDeliveryAddress,
  formatGeoPoint,
  formatPrice,
  getDeliveryMethod,
  getSize,
  getTemplate,
  type Order,
} from '@brorepack/shared'
import type { Config } from './config'
import { describeError } from './errors'
import { escapeHtml } from './util'

// Bot API через UrlFetchApp. Тексты сообщений — те же, что у Node-бэкенда (apps/server/src/bot.ts).

const TELEGRAM_API_URL = 'https://api.telegram.org'

export class TelegramApiError extends Error {
  constructor(
    readonly method: string,
    readonly errorCode: number,
    readonly description: string,
  ) {
    super(`Telegram ${method}: ${errorCode} ${description}`)
    this.name = 'TelegramApiError'
  }
}

interface TelegramResponse<T> {
  ok?: boolean
  result?: T
  description?: string
  error_code?: number
}

function fetchTelegram<T>(
  token: string,
  method: string,
  options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions,
  query = '',
): T {
  let response: GoogleAppsScript.URL_Fetch.HTTPResponse
  try {
    response = UrlFetchApp.fetch(`${TELEGRAM_API_URL}/bot${token}/${method}${query}`, { ...options, muteHttpExceptions: true })
  } catch (error) {
    // В тексте исключения UrlFetchApp бывает адрес, а в адресе — токен бота
    throw new TelegramApiError(method, 0, describeError(error).split(token).join('<BOT_TOKEN>'))
  }

  let body: TelegramResponse<T>
  try {
    body = JSON.parse(response.getContentText()) as TelegramResponse<T>
  } catch {
    throw new TelegramApiError(method, response.getResponseCode(), 'некорректный ответ')
  }
  if (!body.ok) throw new TelegramApiError(method, body.error_code ?? response.getResponseCode(), body.description ?? '')
  return body.result as T
}

/** Вызов метода Bot API с JSON-телом */
export function callTelegram<T = unknown>(token: string, method: string, payload: Record<string, unknown> = {}): T {
  return fetchTelegram<T>(token, method, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
  })
}

/**
 * sendDocument — multipart: UrlFetchApp сам собирает multipart/form-data, если в payload есть Blob.
 * Текстовые поля (chat_id, caption) — в query string: Bot API принимает параметры и оттуда,
 * а кодировку кириллицы в URL мы контролируем сами (encodeURIComponent → UTF-8).
 */
export function sendTelegramDocument(
  token: string,
  chatId: number,
  document: GoogleAppsScript.Base.Blob,
  caption: string,
): void {
  const query = `?chat_id=${encodeURIComponent(String(chatId))}&caption=${encodeURIComponent(caption)}`
  fetchTelegram(token, 'sendDocument', { method: 'post', payload: { document } }, query)
}

// --- Кнопки и тексты ---

export interface WebAppButton {
  text: string
  url: string | null
}

type InlineKeyboard = { inline_keyboard: { text: string; web_app: { url: string } }[][] }

/** WEBAPP_URL + hash-маршрут фронтенда; null, если web_app-кнопку показать нельзя (нужен https) */
export function buildWebAppUrl(config: Pick<Config, 'webappUrl' | 'isWebAppButtonAvailable'>, path = ''): string | null {
  if (!config.webappUrl || !config.isWebAppButtonAvailable) return null
  // Как new URL(...).toString() в Node: без старого #хвоста и со слешем после хоста
  let base = config.webappUrl.split('#')[0] ?? ''
  base = base.replace(/^(https?:\/\/[^/?#]+)(?=$|\?)/i, '$1/')
  return path ? `${base}#${path}` : base
}

export function webAppKeyboard(button: WebAppButton | undefined): { reply_markup?: InlineKeyboard } {
  return button?.url ? { reply_markup: { inline_keyboard: [[{ text: button.text, web_app: { url: button.url } }]] } } : {}
}

export const GREETING =
  'Привет! Это <b>BROREPACK</b> — акриловые плашки за достижения на FACEIT.\n\n' +
  'Введи свой ник, мы подтянем уровень и ELO, а ты соберёшь плашку: шаблон, размер, надпись и подсветку. ' +
  'Оплата — прямо в Telegram, а о статусе заказа напишем сюда.'

export const MENU_BUTTON_TEXT = 'Собрать плашку'

export function statusMessage(order: Order): string | null {
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
    default:
      return null
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
    `Доставка: ${getDeliveryMethod(delivery.method).label}, ${escapeHtml(formatDeliveryAddress(delivery))}`,
    `Координаты: ${delivery.location ? formatGeoPoint(delivery.location) : 'нет — адрес введён вручную'}`,
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
  const parts = [getTemplate(order.design.templateId).name, getSize(order.design.size).label, `«${order.design.displayName}»`]
  if (order.extras.lightStand) parts.push('с подсветкой')
  parts.push(`доставка: ${getDeliveryMethod(order.delivery.method).label}`)
  return `Акриловая плашка FACEIT: ${parts.join(', ')}`.slice(0, 255)
}

// --- Шлюз: всё, что нужно от Telegram сервису заказов и обработчику апдейтов ---

export interface PrintFile {
  name: string
  mimeType: 'image/svg+xml' | 'image/png'
  bytes: GoogleAppsScript.Byte[]
}

export interface TelegramGateway {
  readonly isEnabled: boolean
  createInvoiceLink(order: Order): string
  notifyOrderPaid(order: Order): void
  notifyStatusChanged(order: Order): void
  notifyAdmins(html: string): void
  /** Ответ в чат; ошибки Telegram пробрасывает */
  sendMessage(chatId: number, html: string, button?: WebAppButton): void
  answerPreCheckoutQuery(queryId: string, errorMessage: string | null): void
  /** Файлы для печати — документами в чат; ошибки Telegram пробрасывает */
  sendPrintFiles(chatId: number, order: Order, files: PrintFile[]): void
}

/** Бот выключен (нет BOT_TOKEN): уведомления — только строка в логе */
function createDisabledTelegram(): TelegramGateway {
  return {
    isEnabled: false,
    createInvoiceLink() {
      throw new Error('Бот выключен: создать счёт нельзя')
    },
    notifyOrderPaid(order) {
      console.info(`Бот выключен: пропускаю уведомление об оплате заказа ${order.id}`)
    },
    notifyStatusChanged(order) {
      console.info(`Бот выключен: пропускаю уведомление о статусе ${order.status} заказа ${order.id}`)
    },
    notifyAdmins(html) {
      console.info(`Бот выключен: пропускаю сообщение админам: ${html}`)
    },
    sendMessage() {
      throw new Error('Бот выключен')
    },
    answerPreCheckoutQuery() {
      throw new Error('Бот выключен')
    },
    sendPrintFiles() {
      throw new Error('Бот выключен')
    },
  }
}

/** Размер PNG из заголовка IHDR: байты 16–23, big-endian */
function readPngSize(bytes: GoogleAppsScript.Byte[]): { width: number; height: number } | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.length < 24 || signature.some((value, index) => ((bytes[index] ?? 0) & 0xff) !== value)) return null
  const uint32 = (offset: number) =>
    (((bytes[offset] ?? 0) & 0xff) * 0x1000000 +
      (((bytes[offset + 1] ?? 0) & 0xff) << 16) +
      (((bytes[offset + 2] ?? 0) & 0xff) << 8) +
      ((bytes[offset + 3] ?? 0) & 0xff))
  return { width: uint32(16), height: uint32(20) }
}

export function createTelegramGateway(config: Config): TelegramGateway {
  const token = config.botToken
  if (!token) return createDisabledTelegram()

  function sendMessage(chatId: number, html: string, button?: WebAppButton): void {
    callTelegram(token!, 'sendMessage', {
      chat_id: chatId,
      text: html,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...webAppKeyboard(button),
    })
  }

  /** Ошибки отправки (клиент заблокировал бота и т. п.) не должны ронять запрос — только лог */
  function safeSend(chatId: number, html: string, button?: WebAppButton): void {
    try {
      sendMessage(chatId, html, button)
    } catch (error) {
      console.warn(`Не удалось отправить сообщение в чат ${chatId}: ${describeError(error)}`)
    }
  }

  const gateway: TelegramGateway = {
    isEnabled: true,

    createInvoiceLink(order) {
      if (!config.paymentProviderToken) throw new Error('PAYMENT_PROVIDER_TOKEN не задан')
      return callTelegram<string>(token, 'createInvoiceLink', {
        title: `Плашка BROREPACK №${order.number}`,
        description: invoiceDescription(order),
        payload: String(order.id),
        provider_token: config.paymentProviderToken,
        currency: 'RUB',
        prices: order.price.lines.map((line) => ({ label: line.label, amount: line.amount * 100 })),
      })
    },

    notifyOrderPaid(order) {
      safeSend(
        order.customer.telegramId,
        `Заказ №${order.number} оплачен — спасибо!\n` +
          'Скоро отправим плашку в печать, а когда она поедет к тебе — пришлём трек-номер сюда.',
        { text: 'Открыть заказ', url: buildWebAppUrl(config, `/orders/${order.id}`) },
      )
      const summary = formatAdminSummary(order)
      const adminUrl = buildWebAppUrl(config, `/admin/orders/${order.id}`)
      for (const adminId of config.adminIds) safeSend(adminId, summary, { text: 'Открыть в админке', url: adminUrl })
    },

    notifyStatusChanged(order) {
      const text = statusMessage(order)
      if (!text) return
      safeSend(order.customer.telegramId, text, { text: 'Открыть заказ', url: buildWebAppUrl(config, `/orders/${order.id}`) })
    },

    notifyAdmins(html) {
      for (const adminId of config.adminIds) safeSend(adminId, html)
    },

    sendMessage,

    answerPreCheckoutQuery(queryId, errorMessage) {
      callTelegram(
        token,
        'answerPreCheckoutQuery',
        errorMessage
          ? { pre_checkout_query_id: queryId, ok: false, error_message: errorMessage }
          : { pre_checkout_query_id: queryId, ok: true },
      )
    },

    sendPrintFiles(chatId, order, files) {
      const size = getSize(order.design.size)
      const title = `Заказ №${order.number}: ${size.label}, «${order.design.displayName}»`
      for (const file of files) {
        let details: string
        if (file.mimeType === 'image/svg+xml') {
          details = `SVG в размер ${size.dimensions}, шрифты вшиты`
        } else {
          const png = readPngSize(file.bytes)
          details = png ? `PNG ${png.width}×${png.height}, 300 dpi` : 'PNG, 300 dpi'
        }
        // Имя файла уходит в заголовок multipart — оставляем только ASCII
        const blob = Utilities.newBlob(file.bytes, file.mimeType, file.name.replace(/[^\w.-]+/g, '_'))
        sendTelegramDocument(token, chatId, blob, `${title}\n${details}`)
      }
    },
  }

  return gateway
}
