import { createHmac, timingSafeEqual } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { HttpError } from './errors'

export interface AuthUser {
  id: number
  firstName: string
  username: string | null
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser
    isAdmin: boolean
  }
}

export interface AuthOptions {
  botToken: string | null
  devAuthBypass: boolean
  adminIds: ReadonlySet<number>
  /** Срок жизни initData, по умолчанию сутки */
  maxAgeSeconds?: number
  /** Для тестов */
  now?: () => number
}

const DEFAULT_MAX_AGE_SECONDS = 24 * 60 * 60
const DEV_USER_PATTERN = /^dev:(\d{1,15})$/

/**
 * Проверка Telegram.WebApp.initData по https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * Возвращает пользователя или null, если подпись неверна, данные устарели или пользователя нет.
 */
export function validateInitData(
  initData: string,
  botToken: string,
  { maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS, now = Date.now }: Pick<AuthOptions, 'maxAgeSeconds' | 'now'> = {},
): AuthUser | null {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return null

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const expected = createHmac('sha256', secretKey).update(dataCheckString).digest()
  const received = Buffer.from(hash, 'hex')
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null

  const authDate = Number(params.get('auth_date'))
  if (!Number.isFinite(authDate) || authDate <= 0) return null
  if (now() / 1000 - authDate > maxAgeSeconds) return null

  return parseTelegramUser(params.get('user'))
}

function parseTelegramUser(raw: string | null): AuthUser | null {
  if (!raw) return null
  try {
    const user = JSON.parse(raw) as { id?: unknown; first_name?: unknown; username?: unknown }
    if (typeof user.id !== 'number' || !Number.isSafeInteger(user.id) || user.id <= 0) return null
    return {
      id: user.id,
      firstName: typeof user.first_name === 'string' ? user.first_name : '',
      username: typeof user.username === 'string' && user.username ? user.username : null,
    }
  } catch {
    return null
  }
}

/** Разбирает `Authorization: tma <initData>`; null — не авторизован */
export function authenticate(header: string | undefined, options: AuthOptions): AuthUser | null {
  if (!header) return null
  const match = /^tma\s+(.+)$/i.exec(header.trim())
  const payload = match?.[1]
  if (!payload) return null

  if (options.devAuthBypass) {
    const devMatch = DEV_USER_PATTERN.exec(payload)
    const devId = devMatch?.[1] ? Number(devMatch[1]) : null
    if (devId && Number.isSafeInteger(devId) && devId > 0) {
      return { id: devId, firstName: 'Dev', username: 'dev' }
    }
  }

  if (!options.botToken) return null
  return validateInitData(payload, options.botToken, options)
}

/** preHandler для /api/*: кладёт request.user и request.isAdmin */
export function createAuthHook(options: AuthOptions) {
  return async function authHook(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const user = authenticate(request.headers.authorization, options)
    if (!user) throw new HttpError(401, 'unauthorized', 'Открой приложение из Telegram')
    request.user = user
    request.isAdmin = options.adminIds.has(user.id)
  }
}

export function requireAdmin(request: FastifyRequest): void {
  if (!request.isAdmin) throw new HttpError(403, 'forbidden', 'Только для администратора')
}
