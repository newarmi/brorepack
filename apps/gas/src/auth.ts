import type { Config } from './config'
import { parseQueryString, safeEqual, toHex, utf8Bytes } from './util'

export interface AuthUser {
  id: number
  firstName: string
  username: string | null
}

export interface ValidateOptions {
  /** Срок жизни initData, по умолчанию сутки */
  maxAgeSeconds?: number
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
  { maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS, now = Date.now }: ValidateOptions = {},
): AuthUser | null {
  const pairs = parseQueryString(initData)
  if (!pairs) return null
  const get = (key: string) => pairs.find(([name]) => name === key)?.[1] ?? null

  const hash = get('hash')
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return null

  const dataCheckString = pairs
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  // computeHmacSha256Signature(value, key) — сначала сообщение, потом ключ
  const secretKey = Utilities.computeHmacSha256Signature(utf8Bytes(botToken), utf8Bytes('WebAppData'))
  const expected = Utilities.computeHmacSha256Signature(utf8Bytes(dataCheckString), secretKey)
  if (!safeEqual(toHex(expected), hash.toLowerCase())) return null

  const authDate = Number(get('auth_date'))
  if (!Number.isFinite(authDate) || authDate <= 0) return null
  if (now() / 1000 - authDate > maxAgeSeconds) return null

  return parseTelegramUser(get('user'))
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

/**
 * Поле `auth` запроса: initData (как в заголовке `Authorization: tma …` у REST, префикс `tma ` можно не писать)
 * или `dev:<id>` при DEV_AUTH_BYPASS=1. null — не авторизован.
 */
export function authenticate(
  auth: unknown,
  config: Pick<Config, 'botToken' | 'devAuthBypass'>,
  options: ValidateOptions = {},
): AuthUser | null {
  if (typeof auth !== 'string') return null
  const payload = auth.trim().replace(/^tma\s+/i, '')
  if (!payload) return null

  if (config.devAuthBypass) {
    const devMatch = DEV_USER_PATTERN.exec(payload)
    const devId = devMatch?.[1] ? Number(devMatch[1]) : null
    if (devId && Number.isSafeInteger(devId) && devId > 0) {
      return { id: devId, firstName: 'Dev', username: 'dev' }
    }
  }

  if (!config.botToken) return null
  return validateInitData(payload, config.botToken, options)
}
