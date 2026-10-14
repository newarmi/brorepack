import { formatOrderNumber } from '@brorepack/shared'
import { loadConfig, type Config } from './config'
import { HttpError, describeError } from './errors'
import { parseOrderId } from './orders'
import { createServices, type Services } from './services'
import { GREETING, buildWebAppUrl } from './telegram'
import { escapeHtml, safeEqual } from './util'

// Webhook Telegram: /start, pre_checkout_query, successful_payment — как в apps/server/src/bot.ts.

/** Telegram повторяет апдейт, если не получил 200; держим id обработанных 6 часов (максимум CacheService) */
const UPDATE_DEDUPE_SECONDS = 6 * 60 * 60
const DEDUPE_LOCK_MS = 5_000

interface TelegramUser {
  id: number
  first_name?: string
  username?: string
}

interface TelegramMessage {
  message_id: number
  chat: { id: number }
  from?: TelegramUser
  text?: string
  successful_payment?: {
    currency: string
    total_amount: number
    invoice_payload: string
    telegram_payment_charge_id: string
    provider_payment_charge_id?: string
  }
}

interface PreCheckoutQuery {
  id: string
  from: TelegramUser
  currency: string
  total_amount: number
  invoice_payload: string
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  pre_checkout_query?: PreCheckoutQuery
}

export function isTelegramUpdate(body: unknown): body is TelegramUpdate {
  return typeof body === 'object' && body !== null && typeof (body as { update_id?: unknown }).update_id === 'number'
}

function isSecretValid(e: GoogleAppsScript.Events.DoPost | undefined, config: Config): boolean {
  const received = e?.parameter?.secret
  if (!config.botWebhookSecret || typeof received !== 'string') return false
  return safeEqual(received, config.botWebhookSecret)
}

/** true — апдейт новый и помечен как обработанный; false — уже видели */
function markUpdateSeen(updateId: number): boolean {
  const cache = CacheService.getScriptCache()
  const key = `tg_update:${updateId}`
  const lock = LockService.getScriptLock()
  const isLocked = lock.tryLock(DEDUPE_LOCK_MS)
  try {
    if (cache.get(key)) return false
    cache.put(key, '1', UPDATE_DEDUPE_SECONDS)
    return true
  } finally {
    if (isLocked) lock.releaseLock()
  }
}

function handleStart(services: Services, message: TelegramMessage, text: string): void {
  const match = /^\/start(?:@\w+)?(?:\s+([\s\S]*))?$/.exec(text.trim())
  if (!match) return
  const { config, telegram } = services
  const payload = (match[1] ?? '').trim()
  const orderId = payload.startsWith('order_') ? parseOrderId(payload.slice('order_'.length)) : null

  if (orderId) {
    telegram.sendMessage(message.chat.id, `Заказ №${formatOrderNumber(orderId)} — открой, чтобы посмотреть статус.`, {
      text: 'Открыть заказ',
      url: buildWebAppUrl(config, `/orders/${orderId}`),
    })
    return
  }

  const isAdminLink = payload === 'admin' && !!message.from && config.adminIds.has(message.from.id)
  telegram.sendMessage(message.chat.id, GREETING, {
    text: isAdminLink ? 'Открыть админку' : 'Собрать плашку',
    url: buildWebAppUrl(config, isAdminLink ? '/admin' : ''),
  })
}

function handlePreCheckout(services: Services, query: PreCheckoutQuery): void {
  let errorMessage: string | null
  try {
    errorMessage = services.orders.checkPreCheckout(query.invoice_payload, query.total_amount, query.currency)
  } catch (error) {
    console.error(`pre_checkout: ошибка проверки заказа: ${describeError(error)}`)
    errorMessage = 'Не получилось проверить заказ, попробуй ещё раз.'
  }
  services.telegram.answerPreCheckoutQuery(query.id, errorMessage)
}

function handleSuccessfulPayment(services: Services, payment: NonNullable<TelegramMessage['successful_payment']>): void {
  const orderId = parseOrderId(payment.invoice_payload)
  if (!orderId) {
    console.error(`successful_payment с непонятным payload: ${JSON.stringify(payment)}`)
    services.telegram.notifyAdmins(
      `<b>Внимание:</b> оплата с неизвестным payload <code>${escapeHtml(payment.invoice_payload)}</code>, ` +
        `charge id <code>${escapeHtml(payment.telegram_payment_charge_id)}</code>`,
    )
    return
  }

  try {
    services.orders.markOrderPaid(orderId, {
      telegramChargeId: payment.telegram_payment_charge_id,
      providerChargeId: payment.provider_payment_charge_id || null,
    })
  } catch (error) {
    // Заказа нет — админам уже написали в markOrderPaid
    if (error instanceof HttpError && error.code === 'not_found') return
    // Telegram апдейт повторно не пришлёт (мы всегда отвечаем 200) — зовём человека
    console.error(`successful_payment: не удалось провести оплату заказа ${orderId}: ${describeError(error)}`)
    services.telegram.notifyAdmins(
      `<b>Внимание:</b> пришла оплата заказа №${formatOrderNumber(orderId)}, но записать её в таблицу не получилось. ` +
        `Поставь статус «paid» вручную. Charge id: <code>${escapeHtml(payment.telegram_payment_charge_id)}</code>`,
    )
  }
}

export function processUpdate(services: Services, update: TelegramUpdate): void {
  const message = update.message
  if (message?.successful_payment) {
    handleSuccessfulPayment(services, message.successful_payment)
    return
  }
  if (typeof message?.text === 'string' && message.text.startsWith('/start')) {
    handleStart(services, message, message.text)
    return
  }
  if (update.pre_checkout_query) handlePreCheckout(services, update.pre_checkout_query)
}

/**
 * Апдейт Telegram. Секрет — в query (`?secret=`), потому что заголовки Apps Script не видит.
 * Никогда не бросает: на апдейт всегда отвечаем 200, иначе Telegram будет слать его снова.
 */
export function handleWebhook(e: GoogleAppsScript.Events.DoPost | undefined, update: TelegramUpdate): void {
  try {
    const config = loadConfig()
    if (!config.botToken) {
      console.warn('Webhook: BOT_TOKEN не задан — апдейт пропущен')
      return
    }
    if (!isSecretValid(e, config)) {
      console.warn(`Webhook: неверный secret — апдейт ${update.update_id} пропущен`)
      return
    }
    if (!markUpdateSeen(update.update_id)) {
      console.info(`Webhook: апдейт ${update.update_id} уже обработан`)
      return
    }
    processUpdate(createServices(config), update)
  } catch (error) {
    console.error(`Webhook: ошибка обработки апдейта ${update.update_id}: ${describeError(error)}`)
  }
}
