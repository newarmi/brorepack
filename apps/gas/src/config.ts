import type { PaymentMode } from '@brorepack/shared'

// Настройки — Script Properties (Проект → Настройки проекта → Свойства скрипта).
// Читаются на каждый запрос одним вызовом: Apps Script не держит состояние между запусками.

export const PROPERTY_KEYS = [
  'BOT_TOKEN',
  'BOT_WEBHOOK_SECRET',
  'WEBAPP_URL',
  'ADMIN_IDS',
  'PAYMENTS_MODE',
  'PAYMENT_PROVIDER_TOKEN',
  'FACEIT_MODE',
  'FACEIT_API_KEY',
  'DEV_AUTH_BYPASS',
  'SPREADSHEET_ID',
  'WEBHOOK_URL',
] as const

export type PropertyKey = (typeof PROPERTY_KEYS)[number]

/** Значения этих свойств никогда не пишем в лог */
export const SECRET_PROPERTY_KEYS: ReadonlySet<PropertyKey> = new Set<PropertyKey>([
  'BOT_TOKEN',
  'BOT_WEBHOOK_SECRET',
  'PAYMENT_PROVIDER_TOKEN',
  'FACEIT_API_KEY',
])

/** Что `setup()` подставляет, если свойство не задано */
// По умолчанию — настоящая оплата и настоящие данные FACEIT; заглушки включают явно и только для проверки
export const PROPERTY_DEFAULTS: Partial<Record<PropertyKey, string>> = {
  PAYMENTS_MODE: 'telegram',
  FACEIT_MODE: 'live',
  DEV_AUTH_BYPASS: '0',
}

export type FaceitMode = 'mock' | 'live'

export interface Config {
  botToken: string | null
  botWebhookSecret: string | null
  webappUrl: string | null
  /** web_app-кнопки Telegram открываются только по https */
  isWebAppButtonAvailable: boolean
  adminIds: ReadonlySet<number>
  paymentsMode: PaymentMode
  paymentProviderToken: string | null
  faceitMode: FaceitMode
  faceitApiKey: string | null
  devAuthBypass: boolean
  spreadsheetId: string | null
  webhookUrl: string | null
  /** Ошибки настройки для checkConfig(): запросы работают дальше, сколько получится */
  problems: string[]
}

const TRUE_FLAGS = ['1', 'true', 'yes', 'on']

function optionalString(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

function parseEnum<T extends string>(
  key: PropertyKey,
  raw: string | undefined,
  allowed: readonly T[],
  fallback: T,
  problems: string[],
): T {
  const value = optionalString(raw)?.toLowerCase()
  if (!value) return fallback
  if ((allowed as readonly string[]).includes(value)) return value as T
  problems.push(`${key}: «${value}» — допустимо ${allowed.join(' | ')}, использую ${fallback}`)
  return fallback
}

function parseAdminIds(raw: string | undefined, problems: string[]): Set<number> {
  const ids = new Set<number>()
  for (const item of (raw ?? '').split(',')) {
    const trimmed = item.trim()
    if (!trimmed) continue
    const id = /^\d{1,16}$/.test(trimmed) ? Number(trimmed) : NaN
    if (Number.isSafeInteger(id) && id > 0) ids.add(id)
    else problems.push(`ADMIN_IDS: «${trimmed}» — не Telegram id, пропускаю`)
  }
  return ids
}

/** Разбор свойств без обращения к Apps Script — отдельно, чтобы было что тестировать */
export function parseConfig(props: Record<string, string | undefined>): Config {
  const problems: string[] = []
  const botToken = optionalString(props.BOT_TOKEN)
  const botWebhookSecret = optionalString(props.BOT_WEBHOOK_SECRET)
  const webappUrl = optionalString(props.WEBAPP_URL)
  const paymentsMode = parseEnum('PAYMENTS_MODE', props.PAYMENTS_MODE, ['mock', 'telegram'], 'telegram', problems)
  const paymentProviderToken = optionalString(props.PAYMENT_PROVIDER_TOKEN)
  const faceitMode = parseEnum('FACEIT_MODE', props.FACEIT_MODE, ['mock', 'live'], 'live', problems)
  const faceitApiKey = optionalString(props.FACEIT_API_KEY)
  const devAuthBypass = TRUE_FLAGS.includes((props.DEV_AUTH_BYPASS ?? '').trim().toLowerCase())
  const adminIds = parseAdminIds(props.ADMIN_IDS, problems)
  const webhookUrl = optionalString(props.WEBHOOK_URL)

  if (botWebhookSecret && !/^[A-Za-z0-9_-]{1,256}$/.test(botWebhookSecret)) {
    problems.push('BOT_WEBHOOK_SECRET: только A-Z, a-z, 0-9, «_» и «-» (удали его — setWebhook сгенерирует новый)')
  }
  if (webappUrl && !/^https?:\/\/[^/?#\s]+/i.test(webappUrl)) problems.push('WEBAPP_URL: это не похоже на адрес')
  if (webappUrl && !webappUrl.startsWith('https://')) {
    problems.push('WEBAPP_URL не https — кнопок Mini App в боте не будет')
  }
  if (paymentsMode === 'telegram') {
    if (!paymentProviderToken) problems.push('PAYMENTS_MODE=telegram требует PAYMENT_PROVIDER_TOKEN')
    if (!botToken) problems.push('PAYMENTS_MODE=telegram требует BOT_TOKEN')
  }
  if (faceitMode === 'live' && !faceitApiKey) {
    problems.push('FACEIT_API_KEY не задан — профили не загрузятся (ключ: developers.faceit.com → App Studio → API Keys → Server side)')
  }
  // Заглушки в бою: выдуманный рейтинг на плашке и «оплата» без денег через orders.mockPay
  if (faceitMode === 'mock') problems.push('FACEIT_MODE=mock: рейтинг выдуманный — только для проверки, в бою поставь live')
  if (paymentsMode === 'mock') problems.push('PAYMENTS_MODE=mock: любой может «оплатить» заказ без денег — только для проверки')
  // dev:<id> пускает кого угодно под любым id, включая админский
  if (devAuthBypass) problems.push('DEV_AUTH_BYPASS=1: вход по dev:<id> открыт всем — для боевого бота выключи')
  if (adminIds.size === 0) problems.push('ADMIN_IDS пуст — админки не будет ни у кого')
  if (!optionalString(props.SPREADSHEET_ID)) problems.push('SPREADSHEET_ID не задан — запусти setup()')
  if (botToken && !botWebhookSecret) problems.push('BOT_WEBHOOK_SECRET не задан — запусти setWebhook()')
  if (webhookUrl && /\/dev\/?$/.test(webhookUrl)) problems.push('WEBHOOK_URL оканчивается на /dev — нужен адрес /exec')

  return {
    botToken,
    botWebhookSecret,
    webappUrl,
    isWebAppButtonAvailable: webappUrl?.startsWith('https://') ?? false,
    adminIds,
    paymentsMode,
    paymentProviderToken,
    faceitMode,
    faceitApiKey,
    devAuthBypass,
    spreadsheetId: optionalString(props.SPREADSHEET_ID),
    webhookUrl,
    problems,
  }
}

export function loadConfig(): Config {
  return parseConfig(PropertiesService.getScriptProperties().getProperties())
}
