import { ORDER_STATUSES } from '@brorepack/shared'
import { PROPERTY_DEFAULTS, PROPERTY_KEYS, SECRET_PROPERTY_KEYS, loadConfig, type PropertyKey } from './config'
import { describeError } from './errors'
import {
  LIGHT_STAND_NO,
  LIGHT_STAND_YES,
  NUMBER_FORMATS,
  ORDERS_SHEET_NAME,
  ORDER_COLUMNS,
  SPREADSHEET_TITLE,
  normalizeHeader,
  openOrdersSheet,
} from './sheets'
import { MENU_BUTTON_TEXT, buildWebAppUrl, callTelegram } from './telegram'
import { appendQueryParam } from './util'

// Функции для запуска из редактора Apps Script (выпадающий список рядом с «Выполнить»).

const ALLOWED_UPDATES = ['message', 'pre_checkout_query']
const HEADER_BACKGROUND = '#1F2937'
const HEADER_COLOR = '#FFFFFF'

function ensureOrdersSheet(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): GoogleAppsScript.Spreadsheet.Sheet {
  const existing = spreadsheet.getSheetByName(ORDERS_SHEET_NAME)
  if (existing) return existing
  const sheets = spreadsheet.getSheets()
  // В новой таблице есть пустой «Лист1» — переименовываем его, а не плодим второй
  const first = sheets[0]
  if (sheets.length === 1 && first && first.getLastRow() === 0 && first.getLastColumn() === 0) {
    return first.setName(ORDERS_SHEET_NAME)
  }
  return spreadsheet.insertSheet(ORDERS_SHEET_NAME)
}

/** Заголовки: пустой лист — пишем все; иначе дописываем недостающие справа, существующие не трогаем */
function ensureHeaders(sheet: GoogleAppsScript.Spreadsheet.Sheet): string[] {
  const lastColumn = sheet.getLastColumn()
  const headers =
    lastColumn > 0 ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0]!.map((value) => String(value ?? '')) : []
  const known = headers.map(normalizeHeader)
  const missing = ORDER_COLUMNS.filter((column) => !known.includes(normalizeHeader(column.header))).map((column) => column.header)
  if (missing.length === 0) return headers

  const nextHeaders = [...headers, ...missing]
  const maxColumns = sheet.getMaxColumns()
  if (nextHeaders.length > maxColumns) sheet.insertColumnsAfter(maxColumns, nextHeaders.length - maxColumns)
  sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing])
  return nextHeaders
}

function formatOrdersSheet(sheet: GoogleAppsScript.Spreadsheet.Sheet, headers: string[]): void {
  const known = headers.map(normalizeHeader)
  sheet.setFrozenRows(1)
  sheet
    .getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground(HEADER_BACKGROUND)
    .setFontColor(HEADER_COLOR)
    .setVerticalAlignment('middle')

  const dataRows = sheet.getMaxRows() - 1
  for (const column of ORDER_COLUMNS) {
    const columnNumber = known.indexOf(normalizeHeader(column.header)) + 1
    if (columnNumber === 0) continue
    sheet.setColumnWidth(columnNumber, column.width)
    if (dataRows < 1) continue

    const range = sheet.getRange(2, columnNumber, dataRows, 1)
    range.setNumberFormat(NUMBER_FORMATS[column.type])
    if (column.key === 'status') {
      range.setDataValidation(
        SpreadsheetApp.newDataValidation()
          .requireValueInList([...ORDER_STATUSES], true)
          .setAllowInvalid(false)
          .setHelpText('Код статуса: awaiting_payment, paid, printing, shipped, delivered, cancelled')
          .build(),
      )
    }
    if (column.key === 'lightStand') {
      range.setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList([LIGHT_STAND_YES, LIGHT_STAND_NO], true).build(),
      )
    }
  }
}

/**
 * Создаёт таблицу «BROREPACK — заказы» (если SPREADSHEET_ID пуст), лист «Заказы» с заголовками,
 * форматами и выпадающим списком статусов. Запускать можно сколько угодно раз.
 */
export function setup(): void {
  const props = PropertiesService.getScriptProperties()
  let spreadsheetId = props.getProperty('SPREADSHEET_ID')?.trim() ?? ''
  let spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId)
  } else {
    spreadsheet = SpreadsheetApp.create(SPREADSHEET_TITLE)
    spreadsheetId = spreadsheet.getId()
    props.setProperty('SPREADSHEET_ID', spreadsheetId)
    console.log(`Создана таблица «${SPREADSHEET_TITLE}», id сохранён в SPREADSHEET_ID`)
  }

  const sheet = ensureOrdersSheet(spreadsheet)
  const headers = ensureHeaders(sheet)
  formatOrdersSheet(sheet, headers)
  SpreadsheetApp.flush()

  for (const [key, value] of Object.entries(PROPERTY_DEFAULTS)) {
    if (value !== undefined && !props.getProperty(key)) props.setProperty(key, value)
  }

  console.log(`Таблица заказов готова: ${spreadsheet.getUrl()}`)
  const missing = PROPERTY_KEYS.filter((key) => !props.getProperty(key))
  if (missing.length > 0) console.log(`Не заданы свойства скрипта: ${missing.join(', ')}`)
}

function requireBotToken(): string {
  const config = loadConfig()
  if (!config.botToken) throw new Error('Заполни BOT_TOKEN в свойствах скрипта (Настройки проекта → Свойства скрипта)')
  return config.botToken
}

function generateSecret(): string {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '')
}

/** Адрес вебхука для лога — без секрета */
function redactSecret(url: string): string {
  return url.replace(/([?&]secret=)[^&#]*/, '$1***')
}

/**
 * Регистрирует вебхук: Telegram будет слать апдейты на WEBHOOK_URL?secret=BOT_WEBHOOK_SECRET.
 * Секрет создаётся сам, если его нет.
 */
export function setWebhook(): void {
  const token = requireBotToken()
  const config = loadConfig()
  if (!config.webhookUrl) {
    throw new Error('Заполни WEBHOOK_URL — адрес развёртывания веб-приложения, который оканчивается на /exec')
  }
  if (/\/dev\/?$/.test(config.webhookUrl)) {
    throw new Error('WEBHOOK_URL оканчивается на /dev — такой адрес требует входа в Google. Нужен адрес /exec')
  }

  let secret = config.botWebhookSecret
  if (!secret || !/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
    secret = generateSecret()
    PropertiesService.getScriptProperties().setProperty('BOT_WEBHOOK_SECRET', secret)
    console.log('Сгенерирован новый BOT_WEBHOOK_SECRET')
  }

  const url = appendQueryParam(config.webhookUrl, 'secret', secret)
  callTelegram(token, 'setWebhook', { url, allowed_updates: ALLOWED_UPDATES })
  console.log(`Webhook установлен: ${redactSecret(url)}`)
  logWebhookInfo(token)
}

export function deleteWebhook(): void {
  const token = requireBotToken()
  callTelegram(token, 'deleteWebhook', { drop_pending_updates: false })
  console.log('Webhook удалён — бот больше не получает апдейты')
}

/** Кнопка меню чата с ботом → Mini App (WEBAPP_URL) */
export function setMenuButton(): void {
  const token = requireBotToken()
  const url = buildWebAppUrl(loadConfig())
  if (!url) throw new Error('WEBAPP_URL не задан или не https — кнопку Mini App поставить нельзя')
  callTelegram(token, 'setChatMenuButton', {
    menu_button: { type: 'web_app', text: MENU_BUTTON_TEXT, web_app: { url } },
  })
  console.log(`Кнопка меню «${MENU_BUTTON_TEXT}» → ${url}`)
}

function logWebhookInfo(token: string): void {
  const info = callTelegram<{
    url?: string
    pending_update_count?: number
    last_error_date?: number
    last_error_message?: string
  }>(token, 'getWebhookInfo')
  console.log(`Webhook сейчас: ${info.url ? redactSecret(info.url) : 'не установлен'}, в очереди апдейтов: ${info.pending_update_count ?? 0}`)
  if (info.last_error_message) {
    const when = info.last_error_date ? new Date(info.last_error_date * 1000).toISOString() : '—'
    console.log(`Последняя ошибка доставки (${when}): ${info.last_error_message}`)
  }
}

function describeProperty(key: PropertyKey, value: string | null): string {
  if (!value?.trim()) return 'не задано'
  return SECRET_PROPERTY_KEYS.has(key) ? 'задано' : value
}

/** Показывает, какие свойства заданы (значения секретов — никогда), и проверяет таблицу и бота */
export function checkConfig(): void {
  const props = PropertiesService.getScriptProperties()
  const config = loadConfig()
  const lines = PROPERTY_KEYS.map((key) => `${key}: ${describeProperty(key, props.getProperty(key))}`)
  console.log(`Свойства скрипта:\n${lines.join('\n')}`)

  try {
    openOrdersSheet(config.spreadsheetId).getDataRange()
    console.log('Таблица: OK')
  } catch (error) {
    config.problems.push(`Таблица недоступна: ${describeError(error).split('\n')[0]}`)
  }

  if (config.botToken) {
    try {
      const me = callTelegram<{ username?: string }>(config.botToken, 'getMe')
      console.log(`Бот: @${me.username ?? '?'}`)
      logWebhookInfo(config.botToken)
    } catch (error) {
      config.problems.push(`Telegram не принял BOT_TOKEN: ${describeError(error).split('\n')[0]}`)
    }
  }

  if (config.problems.length > 0) console.warn(`Что поправить:\n- ${config.problems.join('\n- ')}`)
  else console.log('Настройки в порядке')
}
