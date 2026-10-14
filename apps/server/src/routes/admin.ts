import { ORDER_STATUSES, updateOrderStatusSchema, type Order } from '@brorepack/shared'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import type { AppDeps } from '../app'
import { requireAdmin } from '../auth'
import { HttpError, notFound } from '../errors'
import { printFileName } from '../print'
import { parseIdParam } from './client'

interface IdParams {
  id: string
}

const listQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
})

export async function registerAdminRoutes(api: FastifyInstance, { orders, print, telegram }: AppDeps): Promise<void> {
  api.addHook('preHandler', async (request) => requireAdmin(request))

  async function loadOrder(params: IdParams): Promise<Order> {
    const order = await orders.findById(parseIdParam(params))
    if (!order) throw notFound('Заказ не найден')
    return order
  }

  function sendAttachment(reply: FastifyReply, contentType: string, fileName: string, body: string | Buffer) {
    return reply
      .header('Content-Type', contentType)
      .header('Content-Disposition', `attachment; filename="${fileName}"`)
      .header('Cache-Control', 'no-store')
      .send(body)
  }

  api.get<{ Querystring: { status?: string } }>('/orders', async (request) => {
    const { status } = listQuerySchema.parse(request.query)
    return orders.listForAdmin(status)
  })

  api.patch<{ Params: IdParams }>('/orders/:id', async (request) => {
    const id = parseIdParam(request.params)
    const input = updateOrderStatusSchema.parse(request.body)
    return orders.updateStatus(id, input)
  })

  api.get<{ Params: IdParams }>('/orders/:id/print.svg', async (request, reply) => {
    const order = await loadOrder(request.params)
    const svg = await print.renderSvg(order.design)
    return sendAttachment(reply, 'image/svg+xml; charset=utf-8', printFileName(order.number, 'svg'), svg)
  })

  api.get<{ Params: IdParams }>('/orders/:id/print.png', async (request, reply) => {
    const order = await loadOrder(request.params)
    const png = await print.renderPng(order.design)
    return sendAttachment(reply, 'image/png', printFileName(order.number, 'png'), png.buffer)
  })

  api.post<{ Params: IdParams }>('/orders/:id/send-print', async (request) => {
    const order = await loadOrder(request.params)
    if (!telegram.isEnabled) {
      throw new HttpError(503, 'bot_unavailable', 'Бот выключен — скачай файлы для печати по ссылкам')
    }

    const [svg, png] = await Promise.all([print.renderSvg(order.design), print.renderPng(order.design)])
    try {
      await telegram.sendPrintFiles(request.user.id, order, {
        svg: { content: svg, fileName: printFileName(order.number, 'svg') },
        png: { content: png.buffer, fileName: printFileName(order.number, 'png'), width: png.width, height: png.height },
      })
    } catch (error) {
      request.log.warn({ err: error, orderId: order.id }, 'Не удалось отправить файлы для печати')
      throw new HttpError(502, 'telegram_error', 'Бот не смог прислать файлы. Напиши боту /start и попробуй снова')
    }
    return { ok: true }
  })
}
