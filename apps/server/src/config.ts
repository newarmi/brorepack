import { existsSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

// Сообщения zod по умолчанию — по-русски (свои тексты из схем shared имеют приоритет).
// config.ts импортируется первым, поэтому настройка действует на весь сервер.
z.config(z.locales.ru())

/** apps/server — и из src/config.ts (tsx), и из dist/index.js (tsup собирает в один файл) */
export const SERVER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const FONTS_DIR = resolve(SERVER_ROOT, 'fonts')
const PRISMA_DIR = resolve(SERVER_ROOT, 'prisma')

const emptyToUndefined = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value)
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional())
const optionalUrl = z.preprocess(emptyToUndefined, z.url().optional())
const booleanFlag = z.preprocess(
  (value) => (typeof value === 'string' ? ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase()) : value),
  z.boolean().default(false),
)

const envSchema = z
  .object({
    NODE_ENV: z.preprocess(emptyToUndefined, z.enum(['development', 'production', 'test']).default('development')),
    HOST: z.preprocess(emptyToUndefined, z.string().default('0.0.0.0')),
    PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(3000)),
    DATABASE_URL: z.preprocess(emptyToUndefined, z.string().default('file:./dev.db')),
    BOT_TOKEN: optionalString,
    BOT_MODE: z.preprocess(emptyToUndefined, z.enum(['polling', 'webhook', 'off']).optional()),
    BOT_WEBHOOK_URL: optionalUrl,
    BOT_WEBHOOK_SECRET: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .regex(/^[A-Za-z0-9_-]{1,256}$/, 'BOT_WEBHOOK_SECRET: только A-Z, a-z, 0-9, «_» и «-»')
        .optional(),
    ),
    WEBAPP_URL: optionalUrl,
    ADMIN_IDS: z.preprocess(
      (value) =>
        typeof value === 'string'
          ? value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
          : value,
      z.array(z.coerce.number().int().positive()).default([]),
    ),
    PAYMENTS_MODE: z.preprocess(emptyToUndefined, z.enum(['mock', 'telegram']).default('mock')),
    PAYMENT_PROVIDER_TOKEN: optionalString,
    // По умолчанию — настоящие данные FACEIT; заглушку включают явно и только для разработки
    FACEIT_MODE: z.preprocess(emptyToUndefined, z.enum(['mock', 'live']).default('live')),
    FACEIT_API_KEY: optionalString,
    DEV_AUTH_BYPASS: booleanFlag,
    WEB_DIST_DIR: z.preprocess(emptyToUndefined, z.string().default('../web/dist')),
  })
  .superRefine((env, ctx) => {
    const botMode = env.BOT_MODE ?? (env.BOT_TOKEN ? 'polling' : 'off')
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message })

    if (botMode !== 'off' && !env.BOT_TOKEN) fail(`BOT_MODE=${botMode} требует BOT_TOKEN`)
    if (botMode === 'webhook' && !env.BOT_WEBHOOK_URL && !env.WEBAPP_URL) {
      fail('BOT_MODE=webhook требует BOT_WEBHOOK_URL (или WEBAPP_URL, от которого он будет построен)')
    }
    if (env.PAYMENTS_MODE === 'telegram') {
      if (!env.PAYMENT_PROVIDER_TOKEN) fail('PAYMENTS_MODE=telegram требует PAYMENT_PROVIDER_TOKEN')
      if (botMode === 'off') fail('PAYMENTS_MODE=telegram требует работающего бота (BOT_TOKEN и BOT_MODE=polling|webhook)')
    }
    if (env.FACEIT_MODE === 'live' && !env.FACEIT_API_KEY) {
      fail('Нужен FACEIT_API_KEY (developers.faceit.com) — для разработки без ключа задай FACEIT_MODE=mock')
    }
    // Заглушки в проде: выдуманный рейтинг на плашке и «оплата» без денег через mock-pay
    if (env.NODE_ENV === 'production') {
      if (env.FACEIT_MODE === 'mock') fail('FACEIT_MODE=mock нельзя включать при NODE_ENV=production')
      if (env.PAYMENTS_MODE === 'mock') fail('PAYMENTS_MODE=mock нельзя включать при NODE_ENV=production')
    }
    // dev:<id> пускает кого угодно под любым id, включая админский
    if (env.DEV_AUTH_BYPASS && env.NODE_ENV === 'production') fail('DEV_AUTH_BYPASS нельзя включать при NODE_ENV=production')
  })

/** Относительный путь SQLite считаем от prisma/, как это делает Prisma CLI */
function resolveDatabaseUrl(url: string): string {
  if (!url.startsWith('file:')) return url
  const [path = '', query] = url.slice('file:'.length).split('?')
  if (isAbsolute(path)) return url
  return `file:${resolve(PRISMA_DIR, path)}${query ? `?${query}` : ''}`
}

function buildWebhookUrl(webhookUrl: string | undefined, webappUrl: string | undefined): string | null {
  if (webhookUrl) return webhookUrl
  if (!webappUrl) return null
  return new URL('/bot/webhook', webappUrl).toString()
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `  - ${issue.path.length ? `${issue.path.join('.')}: ` : ''}${issue.message}`)
    throw new Error(`Неверные переменные окружения:\n${details.join('\n')}`)
  }

  const env = parsed.data
  const botMode = env.BOT_MODE ?? (env.BOT_TOKEN ? 'polling' : 'off')
  const webappUrl = env.WEBAPP_URL ?? null
  const webDistDir = isAbsolute(env.WEB_DIST_DIR) ? env.WEB_DIST_DIR : resolve(SERVER_ROOT, env.WEB_DIST_DIR)

  return {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    host: env.HOST,
    port: env.PORT,
    databaseUrl: resolveDatabaseUrl(env.DATABASE_URL),
    botToken: env.BOT_TOKEN ?? null,
    botMode,
    botWebhookUrl: botMode === 'webhook' ? buildWebhookUrl(env.BOT_WEBHOOK_URL, env.WEBAPP_URL) : null,
    botWebhookSecret: env.BOT_WEBHOOK_SECRET ?? null,
    webappUrl,
    /** web_app-кнопки Telegram открываются только по https */
    isWebAppButtonAvailable: webappUrl?.startsWith('https://') ?? false,
    adminIds: new Set(env.ADMIN_IDS),
    paymentsMode: env.PAYMENTS_MODE,
    paymentProviderToken: env.PAYMENT_PROVIDER_TOKEN ?? null,
    faceitMode: env.FACEIT_MODE,
    faceitApiKey: env.FACEIT_API_KEY ?? null,
    devAuthBypass: env.DEV_AUTH_BYPASS,
    webDistDir,
    hasWebDist: existsSync(resolve(webDistDir, 'index.html')),
  } as const
}

export type Config = ReturnType<typeof loadConfig>
