import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import { z } from 'zod'
import { createAuthHook } from './auth'
import type { TelegramService } from './bot'
import type { Config } from './config'
import { HttpError } from './errors'
import type { FaceitClient } from './faceit'
import type { OrderService } from './orders'
import type { PrintRenderer } from './print'
import { registerAdminRoutes } from './routes/admin'
import { registerClientRoutes } from './routes/client'

export interface AppDeps {
  config: Config
  orders: OrderService
  faceit: FaceitClient
  telegram: TelegramService
  print: PrintRenderer
}

export function createLoggerOptions(config: Config): FastifyServerOptions['logger'] {
  if (config.isProduction) return { level: 'info' }
  return {
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname', singleLine: true },
    },
  }
}

function formatIssuePath(path: PropertyKey[]): string {
  return path.map(String).join('.')
}

export async function buildApp(app: FastifyInstance, deps: AppDeps): Promise<FastifyInstance> {
  const { config, telegram } = deps

  // Свой JSON-парсер: пустое тело с Content-Type: application/json — это {}, а не 400
  app.removeContentTypeParser('application/json')
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, body, done) => {
    const text = typeof body === 'string' ? body : body.toString('utf8')
    if (text.trim() === '') return done(null, {})
    try {
      done(null, JSON.parse(text))
    } catch {
      done(new HttpError(400, 'bad_request', 'Некорректный JSON'), undefined)
    }
  })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => ({ path: formatIssuePath(issue.path), message: issue.message }))
      return reply.code(400).send({ error: 'validation_error', message: issues[0]?.message ?? 'Проверь данные', issues })
    }
    if (error instanceof HttpError) {
      if (error.statusCode >= 500) request.log.warn({ code: error.code }, error.message)
      return reply.code(error.statusCode).send({ error: error.code, message: error.publicMessage })
    }
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return reply.code(statusCode).send({ error: 'bad_request', message: (error as Error).message })
    }
    request.log.error({ err: error }, 'Необработанная ошибка')
    return reply.code(500).send({ error: 'internal_error', message: 'Что-то пошло не так, попробуй ещё раз' })
  })

  if (!config.isProduction) {
    await app.register(cors, {
      origin: true,
      methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      exposedHeaders: ['Content-Disposition'],
    })
  }

  app.get('/api/health', async () => ({ ok: true }))

  await app.register(
    async (api) => {
      api.addHook(
        'onRequest',
        createAuthHook({ botToken: config.botToken, devAuthBypass: config.devAuthBypass, adminIds: config.adminIds }),
      )
      await registerClientRoutes(api, deps)
      await api.register(async (admin) => registerAdminRoutes(admin, deps), { prefix: '/admin' })
    },
    { prefix: '/api' },
  )

  telegram.registerWebhookRoute(app)

  if (config.hasWebDist) {
    await app.register(fastifyStatic, {
      root: config.webDistDir,
      index: 'index.html',
      setHeaders(reply, path) {
        // index.html не кэшируем (Telegram любит держать старый), ассеты с хэшем — навсегда
        if (path.endsWith('index.html')) reply.header('Cache-Control', 'no-cache')
        else if (/[\\/]assets[\\/]/.test(path)) reply.header('Cache-Control', 'public, max-age=31536000, immutable')
      },
    })
  } else {
    app.log.info({ dir: config.webDistDir }, 'Сборка фронтенда не найдена — статика не раздаётся')
  }

  app.setNotFoundHandler((request, reply) => {
    const path = request.url.split('?')[0] ?? ''
    const isApiPath = path.startsWith('/api') || path.startsWith('/bot')
    if (config.hasWebDist && request.method === 'GET' && !isApiPath) {
      return reply.header('Cache-Control', 'no-cache').sendFile('index.html')
    }
    return reply.code(404).send({ error: 'not_found', message: 'Не найдено' })
  })

  return app
}

export function createFastify(config: Config): FastifyInstance {
  return Fastify({
    logger: createLoggerOptions(config),
    trustProxy: true,
    bodyLimit: 256 * 1024,
  })
}
