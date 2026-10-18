import {
  ORDER_STATUS_LABELS,
  calcPrice,
  formatOrderNumber,
  getDefaultCaption,
  type CreateOrderInput,
  type CreateOrderResponse,
  type Order,
  type OrderStatus,
  type PaymentMode,
  type UpdateOrderStatusInput,
} from '@brorepack/shared'
import type { AuthUser } from './auth'
import { HttpError, describeError, forbidden, notFound } from './errors'
import type { FaceitClient } from './faceit'
import type { OrderRepository, StoredOrder } from './sheets'
import type { TelegramGateway } from './telegram'

// Порт OrderService из apps/server/src/orders.ts: те же правила, синхронно и поверх таблицы.

/** Неоплаченные заказы старше суток клиенту не показываем */
const UNPAID_VISIBLE_MS = 24 * 60 * 60 * 1000
const ADMIN_LIST_LIMIT = 500

export interface PaymentCharge {
  telegramChargeId: string
  providerChargeId: string | null
}

interface OrderServiceDeps {
  repo: OrderRepository
  /** Лениво: клиент FACEIT нужен только при создании заказа */
  faceit: () => FaceitClient
  telegram: TelegramGateway
  paymentsMode: PaymentMode
}

export const orderNotPayable = () => new HttpError(409, 'order_not_payable', 'Заказ уже оплачен или отменён')

/** "42" → 42; всё остальное → null */
export function parseOrderId(value: string): number | null {
  if (!/^\d{1,9}$/.test(value)) return null
  const id = Number(value)
  return id > 0 ? id : null
}

function timeOf(iso: string): number {
  const time = Date.parse(iso)
  return Number.isFinite(time) ? time : 0
}

/** Новые сверху; при равном времени — больший id выше */
function newestFirst(a: Order, b: Order): number {
  return timeOf(b.createdAt) - timeOf(a.createdAt) || b.id - a.id
}

export class OrderService {
  constructor(private readonly deps: OrderServiceDeps) {}

  create(user: AuthUser, input: CreateOrderInput): CreateOrderResponse {
    // Уровень, ELO и playerId — только из FACEIT, с клиента их не принимаем
    const profile = this.deps.faceit().getPlayer(input.nickname)
    const price = calcPrice({
      templateId: input.design.templateId,
      size: input.design.size,
      extras: { lightStand: input.extras.lightStand },
      deliveryMethod: input.delivery.method,
    })

    const stored = this.deps.repo.insert((id, nowIso) => ({
      order: {
        id,
        number: formatOrderNumber(id),
        status: 'awaiting_payment',
        faceitPlayerId: profile.playerId,
        faceitNickname: profile.nickname,
        design: {
          templateId: input.design.templateId,
          size: input.design.size,
          displayName: input.design.displayName,
          caption: getDefaultCaption(profile.level, profile.elo),
          level: profile.level,
          elo: profile.elo,
        },
        extras: { lightStand: input.extras.lightStand },
        delivery: {
          method: input.delivery.method,
          city: input.delivery.city,
          address: input.delivery.address,
          location: input.delivery.location ?? null,
        },
        recipient: { name: input.recipient.name, phone: input.recipient.phone },
        price,
        trackingNumber: null,
        comment: input.comment || null,
        customer: { telegramId: user.id, username: user.username, firstName: user.firstName },
        createdAt: nowIso,
        paidAt: null,
        updatedAt: nowIso,
      },
      telegramChargeId: null,
      providerChargeId: null,
    }))
    const order = stored.order
    console.info(`Заказ создан: id ${order.id}, ${price.total} ₽, клиент ${user.id}`)

    const { invoiceUrl, paymentMode } = this.createInvoice(order)
    return { order, invoiceUrl, paymentMode }
  }

  /** Ссылка для Telegram.WebApp.openInvoice; в mock-режиме — null */
  createInvoice(order: Order): { invoiceUrl: string | null; paymentMode: PaymentMode } {
    if (order.status !== 'awaiting_payment') throw orderNotPayable()
    if (this.deps.paymentsMode === 'mock') return { invoiceUrl: null, paymentMode: 'mock' }

    try {
      return { invoiceUrl: this.deps.telegram.createInvoiceLink(order), paymentMode: 'telegram' }
    } catch (error) {
      console.error(`Не удалось создать ссылку на оплату заказа ${order.id}: ${describeError(error)}`)
      throw new HttpError(502, 'payment_unavailable', 'Не получилось создать счёт, попробуй ещё раз')
    }
  }

  findById(id: number): Order | null {
    return this.deps.repo.findById(id)?.order ?? null
  }

  /** Свой заказ или любой для админа */
  getAccessible(id: number, user: AuthUser, isAdmin: boolean): Order {
    const order = this.findById(id)
    if (!order) throw notFound('Заказ не найден')
    if (!isAdmin && order.customer.telegramId !== user.id) throw forbidden('Это не твой заказ')
    return order
  }

  listForCustomer(telegramId: number, now = new Date()): Order[] {
    const unpaidSince = now.getTime() - UNPAID_VISIBLE_MS
    return this.deps.repo
      .list()
      .map((stored) => stored.order)
      .filter((order) => order.customer.telegramId === telegramId)
      .filter((order) => order.status !== 'awaiting_payment' || timeOf(order.createdAt) >= unpaidSince)
      .sort(newestFirst)
  }

  listForAdmin(status?: OrderStatus): Order[] {
    return this.deps.repo
      .list()
      .map((stored) => stored.order)
      .filter((order) => (status ? order.status === status : order.status !== 'awaiting_payment'))
      .sort(newestFirst)
      .slice(0, ADMIN_LIST_LIMIT)
  }

  /** Проверка перед списанием: null — всё в порядке, иначе текст ошибки для покупателя */
  checkPreCheckout(payload: string, totalAmount: number, currency: string): string | null {
    const orderId = parseOrderId(payload)
    const order = orderId ? this.findById(orderId) : null
    if (!order) return 'Заказ не найден. Собери плашку заново.'
    if (order.status !== 'awaiting_payment') return 'Этот заказ уже оплачен или отменён.'
    if (currency !== 'RUB' || order.price.total * 100 !== totalAmount) {
      console.warn(
        `pre_checkout: сумма не совпала — заказ ${orderId}, пришло ${totalAmount} ${currency}, ждали ${order.price.total * 100} RUB`,
      )
      return 'Сумма заказа изменилась. Открой заказ и оплати заново.'
    }
    return null
  }

  /**
   * Заказ → paid. Общая логика для настоящего successful_payment и для mock-pay:
   * сохраняем charge id, пишем клиенту и админам. Повторный вызов ничего не ломает.
   */
  markOrderPaid(orderId: number, charge: PaymentCharge): { order: Order; isNewlyPaid: boolean } {
    const result = this.deps.repo.update(orderId, (current) => {
      if (current.order.status === 'awaiting_payment') {
        return {
          order: { ...current.order, status: 'paid', paidAt: new Date().toISOString() },
          telegramChargeId: charge.telegramChargeId,
          providerChargeId: charge.providerChargeId,
        }
      }
      // Деньги списаны, но заказ уже не ждал оплаты — charge id сохраняем, если его ещё нет
      if (current.telegramChargeId !== charge.telegramChargeId && !current.telegramChargeId) {
        return { ...current, telegramChargeId: charge.telegramChargeId, providerChargeId: charge.providerChargeId }
      }
      return null
    })

    if (!result) {
      console.error(`Оплата пришла для несуществующего заказа ${orderId}, charge ${charge.telegramChargeId}`)
      this.deps.telegram.notifyAdmins(
        `<b>Внимание:</b> пришла оплата для несуществующего заказа id ${orderId}. Charge id: <code>${charge.telegramChargeId}</code>`,
      )
      throw notFound('Заказ не найден')
    }

    const { before, after } = result
    if (before.order.status !== 'awaiting_payment') {
      const isDuplicate = before.telegramChargeId === charge.telegramChargeId
      if (!isDuplicate) {
        console.error(
          `Оплата пришла для заказа ${orderId} в статусе ${before.order.status}, charge ${charge.telegramChargeId}`,
        )
        this.deps.telegram.notifyAdmins(
          `<b>Внимание:</b> пришла оплата для заказа №${formatOrderNumber(orderId)} в статусе «${ORDER_STATUS_LABELS[before.order.status] ?? before.order.status}». ` +
            `Проверь вручную. Charge id: <code>${charge.telegramChargeId}</code>`,
        )
      }
      return { order: before.order, isNewlyPaid: false }
    }

    console.info(`Заказ оплачен: id ${orderId}, ${after.order.price.total} ₽`)
    this.deps.telegram.notifyOrderPaid(after.order)
    return { order: after.order, isNewlyPaid: true }
  }

  updateStatus(id: number, input: UpdateOrderStatusInput): Order {
    const result = this.deps.repo.update(id, (current): StoredOrder => {
      const order: Order = { ...current.order, status: input.status }
      if (input.trackingNumber !== undefined) order.trackingNumber = input.trackingNumber || null
      if (input.status === 'paid' && !current.order.paidAt) order.paidAt = new Date().toISOString()
      return { ...current, order }
    })
    if (!result) throw notFound('Заказ не найден')

    const existing = result.before.order
    const order = result.after.order
    const isStatusChanged = existing.status !== order.status
    const isTrackingAdded = order.status === 'shipped' && !!order.trackingNumber && order.trackingNumber !== existing.trackingNumber
    console.info(`Статус заказа ${id}: ${existing.status} → ${order.status}`)

    if (isStatusChanged || isTrackingAdded) this.deps.telegram.notifyStatusChanged(order)
    return order
  }
}
