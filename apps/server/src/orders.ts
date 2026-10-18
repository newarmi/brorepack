import {
  ORDER_STATUS_LABELS,
  calcPrice,
  formatOrderNumber,
  getDefaultCaption,
  type CreateOrderInput,
  type CreateOrderResponse,
  type Order,
  type OrderDelivery,
  type OrderExtras,
  type OrderRecipient,
  type OrderStatus,
  type PaymentMode,
  type PlaqueDesign,
  type PriceBreakdown,
  type UpdateOrderStatusInput,
} from '@brorepack/shared'
import type { Prisma, PrismaClient, Order as OrderRow } from '@prisma/client'
import type { FastifyBaseLogger } from 'fastify'
import type { AuthUser } from './auth'
import { HttpError, forbidden, notFound } from './errors'
import type { FaceitClient } from './faceit'

/** Неоплаченные заказы старше суток клиенту не показываем */
const UNPAID_VISIBLE_MS = 24 * 60 * 60 * 1000
const ADMIN_LIST_LIMIT = 500

/** Единственное место, где строка БД превращается в Order из shared */
export function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    number: formatOrderNumber(row.id),
    status: row.status as OrderStatus,
    faceitPlayerId: row.faceitPlayerId,
    faceitNickname: row.faceitNickname,
    design: row.design as unknown as PlaqueDesign,
    extras: row.extras as unknown as OrderExtras,
    // У заказов до появления координат поля location в JSON нет
    delivery: { location: null, ...(row.delivery as unknown as Partial<OrderDelivery>) } as OrderDelivery,
    recipient: row.recipient as unknown as OrderRecipient,
    price: row.price as unknown as PriceBreakdown,
    trackingNumber: row.trackingNumber,
    comment: row.comment,
    customer: {
      telegramId: Number(row.customerTelegramId),
      username: row.customerUsername,
      firstName: row.customerFirstName,
    },
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }
}

/** То, что сервису заказов нужно от Telegram (реализация — в bot.ts) */
export interface OrderTelegramGateway {
  createInvoiceLink(order: Order): Promise<string>
  notifyOrderPaid(order: Order): Promise<void>
  notifyStatusChanged(order: Order): Promise<void>
  notifyAdmins(html: string): Promise<void>
}

export interface PaymentCharge {
  telegramChargeId: string
  providerChargeId: string | null
}

interface OrderServiceDeps {
  prisma: PrismaClient
  faceit: FaceitClient
  telegram: OrderTelegramGateway
  paymentsMode: PaymentMode
  logger: FastifyBaseLogger
}

export const orderNotPayable = () => new HttpError(409, 'order_not_payable', 'Заказ уже оплачен или отменён')

export class OrderService {
  constructor(private readonly deps: OrderServiceDeps) {}

  async create(user: AuthUser, input: CreateOrderInput): Promise<CreateOrderResponse> {
    // Уровень, ELO и playerId — только из FACEIT, с клиента их не принимаем
    const profile = await this.deps.faceit.getPlayer(input.nickname)
    const design: PlaqueDesign = {
      templateId: input.design.templateId,
      size: input.design.size,
      displayName: input.design.displayName,
      caption: getDefaultCaption(profile.level, profile.elo),
      level: profile.level,
      elo: profile.elo,
    }
    const extras: OrderExtras = { lightStand: input.extras.lightStand }
    const delivery: OrderDelivery = { ...input.delivery, location: input.delivery.location ?? null }
    const recipient: OrderRecipient = { ...input.recipient }
    const price = calcPrice({
      templateId: design.templateId,
      size: design.size,
      extras,
      deliveryMethod: delivery.method,
    })

    const row = await this.deps.prisma.order.create({
      data: {
        status: 'awaiting_payment',
        customerTelegramId: BigInt(user.id),
        customerUsername: user.username,
        customerFirstName: user.firstName,
        faceitPlayerId: profile.playerId,
        faceitNickname: profile.nickname,
        design: toJson(design),
        extras: toJson(extras),
        delivery: toJson(delivery),
        recipient: toJson(recipient),
        price: toJson(price),
        total: price.total,
        comment: input.comment || null,
      },
    })
    const order = mapOrder(row)
    this.deps.logger.info({ orderId: order.id, total: price.total, customer: user.id }, 'Заказ создан')

    const { invoiceUrl, paymentMode } = await this.createInvoice(order)
    return { order, invoiceUrl, paymentMode }
  }

  /** Ссылка для Telegram.WebApp.openInvoice; в mock-режиме — null */
  async createInvoice(order: Order): Promise<{ invoiceUrl: string | null; paymentMode: PaymentMode }> {
    if (order.status !== 'awaiting_payment') throw orderNotPayable()
    if (this.deps.paymentsMode === 'mock') return { invoiceUrl: null, paymentMode: 'mock' }

    try {
      return { invoiceUrl: await this.deps.telegram.createInvoiceLink(order), paymentMode: 'telegram' }
    } catch (error) {
      this.deps.logger.error({ err: error, orderId: order.id }, 'Не удалось создать ссылку на оплату')
      throw new HttpError(502, 'payment_unavailable', 'Не получилось создать счёт, попробуй ещё раз')
    }
  }

  async findById(id: number): Promise<Order | null> {
    const row = await this.deps.prisma.order.findUnique({ where: { id } })
    return row ? mapOrder(row) : null
  }

  /** Свой заказ или любой для админа */
  async getAccessible(id: number, user: AuthUser, isAdmin: boolean): Promise<Order> {
    const order = await this.findById(id)
    if (!order) throw notFound('Заказ не найден')
    if (!isAdmin && order.customer.telegramId !== user.id) throw forbidden('Это не твой заказ')
    return order
  }

  async listForCustomer(telegramId: number, now = new Date()): Promise<Order[]> {
    const rows = await this.deps.prisma.order.findMany({
      where: {
        customerTelegramId: BigInt(telegramId),
        OR: [{ status: { not: 'awaiting_payment' } }, { createdAt: { gte: new Date(now.getTime() - UNPAID_VISIBLE_MS) } }],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })
    return rows.map(mapOrder)
  }

  async listForAdmin(status?: OrderStatus): Promise<Order[]> {
    const rows = await this.deps.prisma.order.findMany({
      where: status ? { status } : { status: { not: 'awaiting_payment' } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: ADMIN_LIST_LIMIT,
    })
    return rows.map(mapOrder)
  }

  /** Проверка перед списанием: null — всё в порядке, иначе текст ошибки для покупателя */
  async checkPreCheckout(payload: string, totalAmount: number, currency: string): Promise<string | null> {
    const orderId = parseOrderId(payload)
    const order = orderId ? await this.findById(orderId) : null
    if (!order) return 'Заказ не найден. Собери плашку заново.'
    if (order.status !== 'awaiting_payment') return 'Этот заказ уже оплачен или отменён.'
    if (currency !== 'RUB' || order.price.total * 100 !== totalAmount) {
      this.deps.logger.warn({ orderId, totalAmount, currency, expected: order.price.total * 100 }, 'pre_checkout: сумма не совпала')
      return 'Сумма заказа изменилась. Открой заказ и оплати заново.'
    }
    return null
  }

  /**
   * Заказ → paid. Общая логика для настоящего successful_payment и для mock-pay:
   * сохраняем charge id, пишем клиенту и админам. Повторный вызов ничего не ломает.
   */
  async markOrderPaid(orderId: number, charge: PaymentCharge): Promise<{ order: Order; isNewlyPaid: boolean }> {
    const { prisma, logger, telegram } = this.deps
    const updated = await prisma.order.updateMany({
      where: { id: orderId, status: 'awaiting_payment' },
      data: {
        status: 'paid',
        paidAt: new Date(),
        telegramChargeId: charge.telegramChargeId,
        providerChargeId: charge.providerChargeId,
      },
    })

    const row = await prisma.order.findUnique({ where: { id: orderId } })
    if (!row) {
      logger.error({ orderId, charge }, 'Оплата пришла для несуществующего заказа')
      await telegram.notifyAdmins(
        `<b>Внимание:</b> пришла оплата для несуществующего заказа id ${orderId}. Charge id: <code>${charge.telegramChargeId}</code>`,
      )
      throw notFound('Заказ не найден')
    }

    if (updated.count === 0) {
      const isDuplicate = row.telegramChargeId === charge.telegramChargeId
      if (!isDuplicate) {
        // Деньги списаны, но заказ уже не ждал оплаты (например, отменён) — сохраняем и зовём человека
        logger.error({ orderId, status: row.status, charge }, 'Оплата пришла для заказа не в статусе awaiting_payment')
        if (!row.telegramChargeId) {
          await prisma.order.update({
            where: { id: orderId },
            data: { telegramChargeId: charge.telegramChargeId, providerChargeId: charge.providerChargeId },
          })
        }
        await telegram.notifyAdmins(
          `<b>Внимание:</b> пришла оплата для заказа №${formatOrderNumber(orderId)} в статусе «${ORDER_STATUS_LABELS[row.status as OrderStatus] ?? row.status}». ` +
            `Проверь вручную. Charge id: <code>${charge.telegramChargeId}</code>`,
        )
      }
      return { order: mapOrder(row), isNewlyPaid: false }
    }

    const order = mapOrder(row)
    logger.info({ orderId, total: order.price.total }, 'Заказ оплачен')
    await telegram.notifyOrderPaid(order)
    return { order, isNewlyPaid: true }
  }

  async updateStatus(id: number, input: UpdateOrderStatusInput): Promise<Order> {
    const existing = await this.deps.prisma.order.findUnique({ where: { id } })
    if (!existing) throw notFound('Заказ не найден')

    const data: Prisma.OrderUpdateInput = { status: input.status }
    if (input.trackingNumber !== undefined) data.trackingNumber = input.trackingNumber || null
    if (input.status === 'paid' && !existing.paidAt) data.paidAt = new Date()

    const order = mapOrder(await this.deps.prisma.order.update({ where: { id }, data }))
    const isStatusChanged = existing.status !== order.status
    const isTrackingAdded = order.status === 'shipped' && !!order.trackingNumber && order.trackingNumber !== existing.trackingNumber
    this.deps.logger.info({ orderId: id, from: existing.status, to: order.status }, 'Статус заказа обновлён')

    if (isStatusChanged || isTrackingAdded) await this.deps.telegram.notifyStatusChanged(order)
    return order
  }
}

function toJson<T extends object>(value: T): Prisma.InputJsonObject {
  return value as unknown as Prisma.InputJsonObject
}

/** "42" → 42; всё остальное → null */
export function parseOrderId(value: string): number | null {
  if (!/^\d{1,9}$/.test(value)) return null
  const id = Number(value)
  return id > 0 ? id : null
}
