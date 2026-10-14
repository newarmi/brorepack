import { createOrderInputSchema, nicknameSchema, type MeResponse } from '@brorepack/shared'
import type { FastifyInstance } from 'fastify'
import { HttpError, notFound } from '../errors'
import { orderNotPayable, parseOrderId } from '../orders'
import type { AppDeps } from '../app'

interface IdParams {
  id: string
}

export function parseIdParam(params: IdParams): number {
  const id = parseOrderId(params.id)
  if (!id) throw notFound('Заказ не найден')
  return id
}

export async function registerClientRoutes(api: FastifyInstance, { config, orders, faceit }: AppDeps): Promise<void> {
  api.get('/me', async (request): Promise<MeResponse> => ({
    user: { id: request.user.id, firstName: request.user.firstName, username: request.user.username },
    isAdmin: request.isAdmin,
  }))

  api.get<{ Querystring: { nickname?: string } }>('/faceit/player', async (request) => {
    const parsed = nicknameSchema.safeParse(request.query.nickname ?? '')
    if (!parsed.success) {
      throw new HttpError(400, 'invalid_nickname', parsed.error.issues[0]?.message ?? 'Проверь ник')
    }
    return faceit.getPlayer(parsed.data)
  })

  api.post('/orders', async (request, reply) => {
    const input = createOrderInputSchema.parse(request.body)
    const result = await orders.create(request.user, input)
    return reply.code(201).send(result)
  })

  api.get('/orders', async (request) => orders.listForCustomer(request.user.id))

  api.get<{ Params: IdParams }>('/orders/:id', async (request) =>
    orders.getAccessible(parseIdParam(request.params), request.user, request.isAdmin),
  )

  api.post<{ Params: IdParams }>('/orders/:id/invoice', async (request) => {
    const order = await orders.getAccessible(parseIdParam(request.params), request.user, request.isAdmin)
    return orders.createInvoice(order)
  })

  api.post<{ Params: IdParams }>('/orders/:id/mock-pay', async (request) => {
    if (config.paymentsMode !== 'mock') throw notFound()
    const order = await orders.getAccessible(parseIdParam(request.params), request.user, request.isAdmin)
    if (order.status !== 'awaiting_payment') throw orderNotPayable()
    const result = await orders.markOrderPaid(order.id, {
      telegramChargeId: `mock_${order.id}_${Date.now()}`,
      providerChargeId: null,
    })
    return result.order
  })
}
