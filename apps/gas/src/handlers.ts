import {
  ORDER_STATUSES,
  createOrderInputSchema,
  nicknameSchema,
  updateOrderStatusSchema,
  type MeResponse,
} from '@brorepack/shared'
import { z } from 'zod'
import { authenticate, type AuthUser } from './auth'
import { loadConfig } from './config'
import {
  HttpError,
  badRequest,
  describeError,
  forbidden,
  notFound,
  unauthorized,
  validationError,
  type ValidationIssue,
} from './errors'
import { orderNotPayable, parseOrderId } from './orders'
import { createServices, type Services } from './services'
import type { PrintFile } from './telegram'
import { isPlainObject } from './util'

// Роутер API: тело `{ action, auth, params }` → `{ ok: true, data }` | `{ ok: false, status, error, message, issues? }`.
// Правила доступа и ответы — как у REST-маршрутов apps/server/src/routes/*.ts.

export type ApiEnvelope =
  | { ok: true; data: unknown }
  | { ok: false; status: number; error: string; message?: string; issues?: ValidationIssue[] }

type Access = 'public' | 'user' | 'admin'

interface ActionContext {
  services: Services
  /** Для public-действий не заполняется */
  user: AuthUser
  isAdmin: boolean
  params: Record<string, unknown>
}

interface ActionDef {
  access: Access
  run(ctx: ActionContext): unknown
}

const MAX_PRINT_FILES = 2
const MAX_PRINT_FILE_BYTES = 10 * 1024 * 1024
/** base64 длиннее этого заведомо больше 10 МБ — не декодируем */
const MAX_PRINT_FILE_BASE64 = Math.ceil(MAX_PRINT_FILE_BYTES / 3) * 4

const adminListSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
})

const PRINT_MIME_BY_EXTENSION = { svg: 'image/svg+xml', png: 'image/png' } as const

const printFileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(5, 'Укажи имя файла')
      .max(120, 'Слишком длинное имя файла')
      .regex(/^[^\\/:*?"<>|\r\n]+\.(svg|png)$/i, 'Файл для печати — только .svg или .png'),
    mimeType: z.enum(['image/svg+xml', 'image/png'], 'Тип файла — image/svg+xml или image/png'),
    base64: z
      .string()
      // FileReader.readAsDataURL отдаёт «data:…;base64,» — принимаем и так
      .transform((value) => value.replace(/^data:[^,]*;base64,/, '').replace(/\s+/g, ''))
      .pipe(
        z
          .string()
          .min(1, 'Файл пустой')
          .max(MAX_PRINT_FILE_BASE64, 'Файл больше 10 МБ')
          .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Файл не в base64'),
      ),
  })
  .superRefine((file, ctx) => {
    const extension = file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase() as keyof typeof PRINT_MIME_BY_EXTENSION
    if (PRINT_MIME_BY_EXTENSION[extension] && PRINT_MIME_BY_EXTENSION[extension] !== file.mimeType) {
      ctx.addIssue({ code: 'custom', path: ['mimeType'], message: 'Тип файла не совпадает с расширением' })
    }
    const padding = file.base64.endsWith('==') ? 2 : file.base64.endsWith('=') ? 1 : 0
    if (Math.floor((file.base64.length * 3) / 4) - padding > MAX_PRINT_FILE_BYTES) {
      ctx.addIssue({ code: 'custom', path: ['base64'], message: 'Файл больше 10 МБ' })
    }
  })

const sendPrintSchema = z.object({
  files: z
    .array(printFileSchema, 'Нет файлов для печати')
    .min(1, 'Нет файлов для печати')
    .max(MAX_PRINT_FILES, `Не больше ${MAX_PRINT_FILES} файлов`),
})

/** id заказа из params: число или строка из цифр; иначе — 404, как у REST с кривым :id */
function parseIdParam(params: Record<string, unknown>): number {
  const raw = params.id
  const text = typeof raw === 'number' && Number.isSafeInteger(raw) ? String(raw) : typeof raw === 'string' ? raw.trim() : ''
  const id = parseOrderId(text)
  if (!id) throw notFound('Заказ не найден')
  return id
}

function loadOrder(ctx: ActionContext) {
  const order = ctx.services.orders.findById(parseIdParam(ctx.params))
  if (!order) throw notFound('Заказ не найден')
  return order
}

function decodePrintFiles(files: z.infer<typeof sendPrintSchema>['files']): PrintFile[] {
  return files.map((file, index) => {
    let bytes: GoogleAppsScript.Byte[]
    try {
      bytes = Utilities.base64Decode(file.base64)
    } catch {
      throw validationError([{ path: `files.${index}.base64`, message: 'Файл повреждён: не получилось декодировать base64' }])
    }
    if (bytes.length === 0) throw validationError([{ path: `files.${index}.base64`, message: 'Файл пустой' }])
    if (bytes.length > MAX_PRINT_FILE_BYTES) throw validationError([{ path: `files.${index}.base64`, message: 'Файл больше 10 МБ' }])
    return { name: file.name, mimeType: file.mimeType, bytes }
  })
}

export const ACTIONS: Record<string, ActionDef> = {
  health: {
    access: 'public',
    run: () => ({ ok: true }),
  },

  me: {
    access: 'user',
    run: ({ user, isAdmin }): MeResponse => ({
      user: { id: user.id, firstName: user.firstName, username: user.username },
      isAdmin,
    }),
  },

  'faceit.player': {
    access: 'user',
    run: ({ services, params }) => {
      const parsed = nicknameSchema.safeParse(params.nickname ?? '')
      if (!parsed.success) {
        throw new HttpError(400, 'invalid_nickname', parsed.error.issues[0]?.message ?? 'Проверь ник')
      }
      return services.faceit().getPlayer(parsed.data)
    },
  },

  'orders.create': {
    access: 'user',
    run: ({ services, user, params }) => services.orders.create(user, createOrderInputSchema.parse(params)),
  },

  'orders.list': {
    access: 'user',
    run: ({ services, user }) => services.orders.listForCustomer(user.id),
  },

  'orders.get': {
    access: 'user',
    run: ({ services, user, isAdmin, params }) => services.orders.getAccessible(parseIdParam(params), user, isAdmin),
  },

  'orders.invoice': {
    access: 'user',
    run: ({ services, user, isAdmin, params }) => {
      const order = services.orders.getAccessible(parseIdParam(params), user, isAdmin)
      return services.orders.createInvoice(order)
    },
  },

  'orders.mockPay': {
    access: 'user',
    run: ({ services, user, isAdmin, params }) => {
      if (services.config.paymentsMode !== 'mock') throw notFound()
      const order = services.orders.getAccessible(parseIdParam(params), user, isAdmin)
      if (order.status !== 'awaiting_payment') throw orderNotPayable()
      const result = services.orders.markOrderPaid(order.id, {
        telegramChargeId: `mock_${order.id}_${Date.now()}`,
        providerChargeId: null,
      })
      return result.order
    },
  },

  'admin.orders.list': {
    access: 'admin',
    run: ({ services, params }) => services.orders.listForAdmin(adminListSchema.parse(params).status),
  },

  'admin.orders.update': {
    access: 'admin',
    run: ({ services, params }) => {
      const id = parseIdParam(params)
      const input = updateOrderStatusSchema.parse({ status: params.status, trackingNumber: params.trackingNumber })
      return services.orders.updateStatus(id, input)
    },
  },

  'admin.orders.sendPrint': {
    access: 'admin',
    run: (ctx) => {
      const { services, user, params } = ctx
      const { files } = sendPrintSchema.parse({ files: params.files })
      const order = loadOrder(ctx)
      if (!services.telegram.isEnabled) {
        throw new HttpError(503, 'bot_unavailable', 'Бот выключен — скачай файлы для печати по ссылкам')
      }
      const printFiles = decodePrintFiles(files)
      try {
        services.telegram.sendPrintFiles(user.id, order, printFiles)
      } catch (error) {
        console.warn(`Не удалось отправить файлы для печати заказа ${order.id}: ${describeError(error)}`)
        throw new HttpError(502, 'telegram_error', 'Бот не смог прислать файлы. Напиши боту /start и попробуй снова')
      }
      return { ok: true }
    },
  },
}

function isZodError(error: unknown): error is z.ZodError {
  if (error instanceof z.ZodError) return true
  // Страховка на случай второй копии zod в сборке
  return (
    typeof error === 'object' &&
    error !== null &&
    Array.isArray((error as { issues?: unknown }).issues) &&
    /ZodError/.test(String((error as { name?: unknown }).name))
  )
}

export function toErrorEnvelope(error: unknown, action: string): ApiEnvelope {
  if (isZodError(error)) {
    const issues = error.issues.map((issue) => ({ path: issue.path.map(String).join('.'), message: issue.message }))
    return { ok: false, status: 400, error: 'validation_error', message: issues[0]?.message ?? 'Проверь данные', issues }
  }
  if (error instanceof HttpError) {
    if (error.statusCode >= 500) console.warn(`${action}: ${error.code} — ${error.message}`)
    const envelope: ApiEnvelope = { ok: false, status: error.statusCode, error: error.code }
    if (error.publicMessage) envelope.message = error.publicMessage
    if (error.issues) envelope.issues = error.issues
    return envelope
  }
  console.error(`${action}: необработанная ошибка: ${describeError(error)}`)
  return { ok: false, status: 500, error: 'internal_error', message: 'Что-то пошло не так, попробуй ещё раз' }
}

/** Запрос API (не апдейт Telegram). Никогда не бросает — ошибка превращается в конверт */
export function handleApiRequest(body: unknown): ApiEnvelope {
  const action = isPlainObject(body) && typeof body.action === 'string' ? body.action : ''
  try {
    if (!isPlainObject(body) || !action) throw badRequest('Некорректный запрос: нужно поле action')
    const definition = Object.prototype.hasOwnProperty.call(ACTIONS, action) ? ACTIONS[action] : undefined
    if (!definition) throw notFound('Неизвестное действие')

    const params = isPlainObject(body.params) ? body.params : {}
    if (definition.access === 'public') {
      return { ok: true, data: definition.run({ params } as ActionContext) }
    }

    const config = loadConfig()
    const user = authenticate(body.auth, config)
    if (!user) throw unauthorized()
    const isAdmin = config.adminIds.has(user.id)
    if (definition.access === 'admin' && !isAdmin) throw forbidden('Только для администратора')

    const services = createServices(config)
    return { ok: true, data: definition.run({ services, user, isAdmin, params }) }
  } catch (error) {
    return toErrorEnvelope(error, action || '(без action)')
  }
}
