// Запуск собранного dist/Code.js в vm-контексте, где есть только встроенные объекты ECMAScript
// и эмуляция сервисов Apps Script из gas-env.ts. Никаких fetch, URL, Buffer, setTimeout, process, require.
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { createGasEnv, FakeHtmlOutput, FakeTextOutput, type FetchCall, type GasEnv } from './gas-env'

export const BUNDLE_PATH = fileURLToPath(new URL('../dist/Code.js', import.meta.url))

export const BOT_TOKEN = '123456789:TEST-token_for-gas-tests'
export const WEBHOOK_SECRET = 'test_webhook-secret'
export const WEBAPP_URL = 'https://app.example.com/'
export const FACEIT_API_KEY = 'faceit-test-key'

/** Глобалы Node, которых нет в Apps Script: в песочнице их быть не должно */
export const FORBIDDEN_GLOBALS = [
  'fetch',
  'URLSearchParams',
  'URL',
  'TextEncoder',
  'TextDecoder',
  'Buffer',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'structuredClone',
  'process',
  'require',
  'module',
  'exports',
  'atob',
  'btoa',
]

let compiled: vm.Script | null = null

function getScript(): vm.Script {
  if (!compiled) {
    assert.ok(existsSync(BUNDLE_PATH), 'Нет dist/Code.js — сначала `node build.mjs` (это делает `pnpm test`)')
    compiled = new vm.Script(readFileSync(BUNDLE_PATH, 'utf8'), { filename: 'Code.js' })
  }
  return compiled
}

export interface ApiResult<T = any> {
  ok: boolean
  data: T
  status?: number
  error?: string
  message?: string
  issues?: { path: string; message: string }[]
}

interface GasEntryPoints {
  doGet(e?: unknown): FakeTextOutput
  doPost(e?: unknown): FakeTextOutput | FakeHtmlOutput
  setup(): void
  setWebhook(): void
  deleteWebhook(): void
  setMenuButton(): void
  checkConfig(): void
}

export interface TelegramCall {
  method: string
  /** Параметры из query string и тела вместе */
  payload: any
  query: Record<string, string>
  contentType?: string
}

export function postEvent(contents: string, parameter: Record<string, string> = {}) {
  return {
    postData: { contents, type: 'application/json', length: contents.length, name: 'postData' },
    parameter,
    parameters: Object.fromEntries(Object.entries(parameter).map(([key, value]) => [key, [value]])),
    queryString: Object.entries(parameter)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&'),
    contentLength: contents.length,
    contextPath: '',
    pathInfo: '',
  }
}

// --- Telegram Bot API (фейк) ---

function defaultTelegramResult(method: string, payload: any): unknown {
  switch (method) {
    case 'sendMessage':
    case 'sendDocument':
      return { message_id: 1, chat: { id: Number(payload?.chat_id) } }
    case 'createInvoiceLink':
      return `https://t.me/$invoice-test-${payload?.payload}`
    case 'getMe':
      return { id: 123456789, is_bot: true, username: 'brorepack_test_bot' }
    case 'getWebhookInfo':
      return { url: '', pending_update_count: 0 }
    default:
      return true
  }
}

export function installTelegram(env: GasEnv, token = BOT_TOKEN) {
  const calls: TelegramCall[] = []
  const failures = new Map<string, { code: number; description: string }>()
  env.urlFetch.handlers.push((call: FetchCall) => {
    if (!call.url.startsWith('https://api.telegram.org/')) return undefined
    const prefix = `https://api.telegram.org/bot${token}/`
    if (!call.url.startsWith(prefix)) return { code: 401, body: { ok: false, error_code: 401, description: 'Unauthorized' } }
    // Bot API берёт параметры и из query string, и из тела — склеиваем, как сервер Telegram
    const url = new URL(call.url)
    const method = url.pathname.slice(new URL(prefix).pathname.length)
    const body = typeof call.params.payload === 'string' ? JSON.parse(call.params.payload) : call.params.payload
    const payload = { ...Object.fromEntries(url.searchParams), ...body }
    calls.push({ method, payload, query: Object.fromEntries(url.searchParams), contentType: call.params.contentType })
    const failure = failures.get(method)
    if (failure) return { code: failure.code, body: { ok: false, error_code: failure.code, description: failure.description } }
    return { code: 200, body: { ok: true, result: defaultTelegramResult(method, payload) } }
  })
  return {
    calls,
    failures,
    byMethod: (method: string) => calls.filter((call) => call.method === method),
    clear: () => {
      calls.length = 0
    },
  }
}

// --- FACEIT Data API (фейк) ---

export function installFaceit(env: GasEnv, apiKey = FACEIT_API_KEY) {
  const players = new Map<string, unknown>()
  const stats = new Map<string, unknown>()
  const state = { down: false, requests: [] as string[] }
  env.urlFetch.handlers.push((call: FetchCall) => {
    if (!call.url.startsWith('https://open.faceit.com/data/v4/')) return undefined
    state.requests.push(call.url)
    if (call.params.headers?.Authorization !== `Bearer ${apiKey}`) return { code: 401, body: { errors: [] } }
    if (state.down) return { code: 503, body: 'Service Unavailable' }
    const url = new URL(call.url)
    if (url.pathname === '/data/v4/players') {
      const player = players.get((url.searchParams.get('nickname') ?? '').toLowerCase())
      return player ? { code: 200, body: player } : { code: 404, body: { errors: [{ message: 'not found' }] } }
    }
    const statsMatch = /^\/data\/v4\/players\/([^/]+)\/stats\/cs2$/.exec(url.pathname)
    if (statsMatch) {
      const value = stats.get(decodeURIComponent(statsMatch[1]!))
      return value ? { code: 200, body: value } : { code: 404, body: { errors: [] } }
    }
    return { code: 404, body: {} }
  })
  return { players, stats, state }
}

// --- Подписанная initData ---

export function signInitData(fields: Record<string, string>, botToken = BOT_TOKEN): string {
  const dataCheckString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join('\n')
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  return new URLSearchParams({ ...fields, hash }).toString()
}

// --- Сам «проект Apps Script» ---

export interface CreateGasOptions {
  properties?: Record<string, string>
  /** Запустить setup() — создать таблицу (по умолчанию да) */
  withSheet?: boolean
  withTelegram?: boolean
  withFaceit?: boolean
}

export const DEV_PROPERTIES = {
  DEV_AUTH_BYPASS: '1',
  ADMIN_IDS: '1',
  PAYMENTS_MODE: 'mock',
  FACEIT_MODE: 'mock',
}

export const BOT_PROPERTIES = {
  BOT_TOKEN,
  BOT_WEBHOOK_SECRET: WEBHOOK_SECRET,
  WEBAPP_URL,
}

export function createGas({ properties = {}, withSheet = true, withTelegram = true, withFaceit = true }: CreateGasOptions = {}) {
  const env = createGasEnv({ properties })
  const telegram = withTelegram ? installTelegram(env, properties.BOT_TOKEN ?? BOT_TOKEN) : null
  const faceit = withFaceit ? installFaceit(env, properties.FACEIT_API_KEY ?? FACEIT_API_KEY) : null

  const context = vm.createContext({ ...env.globals }, { name: 'apps-script', codeGeneration: { strings: false, wasm: false } })
  getScript().runInContext(context)
  const gas = context as unknown as GasEntryPoints

  if (withSheet) gas.setup()

  function ordersSheet() {
    const id = env.properties.store.get('SPREADSHEET_ID')
    assert.ok(id, 'SPREADSHEET_ID не задан')
    const sheet = env.spreadsheetApp.openById(id).getSheetByName('Заказы')
    assert.ok(sheet, 'нет листа «Заказы»')
    return sheet
  }

  function api<T = any>(action: string, params?: unknown, auth?: string): ApiResult<T> {
    const body: Record<string, unknown> = { action }
    if (auth !== undefined) body.auth = auth
    if (params !== undefined) body.params = params
    const output = gas.doPost(postEvent(JSON.stringify(body)))
    assert.ok(output instanceof FakeTextOutput, 'API должен отвечать через ContentService')
    assert.equal(output.getMimeType(), 'JSON')
    return JSON.parse(output.getContent()) as ApiResult<T>
  }

  function webhook(update: unknown, secret: string | null = WEBHOOK_SECRET) {
    return gas.doPost(postEvent(JSON.stringify(update), secret === null ? {} : { secret }))
  }

  return { env, gas, context, telegram, faceit, api, webhook, ordersSheet }
}

export type Gas = ReturnType<typeof createGas>

/** Корректное тело orders.create */
export function orderInput(overrides: Record<string, unknown> = {}) {
  return {
    nickname: 'goodlifeee',
    design: { templateId: 'graphite', size: 'A5', displayName: 'Леха Гей', caption: 'for reaching 9 lvl 1809 elo' },
    extras: { lightStand: true },
    delivery: { method: 'cdek_pvz', city: 'Москва', address: 'ул. Тверская, 1' },
    recipient: { name: 'Алексей', phone: '+7 999 123-45-67' },
    comment: '',
    ...overrides,
  }
}
