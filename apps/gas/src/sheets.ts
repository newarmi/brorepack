import {
  formatOrderNumber,
  type DeliveryMethod,
  type Order,
  type OrderStatus,
  type PlaqueSize,
  type PriceLine,
  type TemplateId,
} from '@brorepack/shared'
import { HttpError } from './errors'
import { isDate } from './util'

// Google Таблица как база: лист «Заказы», одна строка — один заказ, первая строка — заголовки.
// Столбцы ищутся по заголовку, поэтому владелец может переставлять их и добавлять свои.

export const SPREADSHEET_TITLE = 'BROREPACK — заказы'
export const ORDERS_SHEET_NAME = 'Заказы'

/** Свойство скрипта с последним выданным id заказа — ведётся автоматически */
export const LAST_ORDER_ID_PROPERTY = 'LAST_ORDER_ID'

const LOCK_TIMEOUT_MS = 20_000
const ROWS_GROW_BY = 200

/** text — формат «@» (обычный текст: «+7999…» не станет числом, «=…» — формулой), int — «0» */
export type ColumnType = 'text' | 'int'

export interface ColumnDef {
  key: ColumnKey
  header: string
  type: ColumnType
  width: number
}

export type ColumnKey =
  | 'id'
  | 'number'
  | 'status'
  | 'createdAt'
  | 'paidAt'
  | 'updatedAt'
  | 'customerTelegramId'
  | 'customerUsername'
  | 'customerFirstName'
  | 'faceitPlayerId'
  | 'faceitNickname'
  | 'templateId'
  | 'size'
  | 'displayName'
  | 'caption'
  | 'level'
  | 'elo'
  | 'lightStand'
  | 'deliveryMethod'
  | 'city'
  | 'address'
  | 'recipientName'
  | 'phone'
  | 'comment'
  | 'total'
  | 'priceLines'
  | 'trackingNumber'
  | 'telegramChargeId'
  | 'providerChargeId'

export const ORDER_COLUMNS: readonly ColumnDef[] = [
  { key: 'id', header: 'id', type: 'int', width: 50 },
  { key: 'number', header: '№', type: 'int', width: 60 },
  { key: 'status', header: 'статус', type: 'text', width: 140 },
  { key: 'createdAt', header: 'создан', type: 'text', width: 200 },
  { key: 'paidAt', header: 'оплачен', type: 'text', width: 200 },
  { key: 'updatedAt', header: 'обновлён', type: 'text', width: 200 },
  { key: 'customerTelegramId', header: 'Telegram id', type: 'int', width: 110 },
  { key: 'customerUsername', header: 'username', type: 'text', width: 120 },
  { key: 'customerFirstName', header: 'имя', type: 'text', width: 120 },
  { key: 'faceitPlayerId', header: 'FACEIT id', type: 'text', width: 150 },
  { key: 'faceitNickname', header: 'ник FACEIT', type: 'text', width: 130 },
  { key: 'templateId', header: 'шаблон', type: 'text', width: 80 },
  { key: 'size', header: 'размер', type: 'text', width: 70 },
  { key: 'displayName', header: 'надпись', type: 'text', width: 170 },
  { key: 'caption', header: 'подпись', type: 'text', width: 230 },
  { key: 'level', header: 'уровень', type: 'int', width: 70 },
  { key: 'elo', header: 'ELO', type: 'int', width: 70 },
  { key: 'lightStand', header: 'подсветка', type: 'text', width: 90 },
  { key: 'deliveryMethod', header: 'доставка', type: 'text', width: 100 },
  { key: 'city', header: 'город', type: 'text', width: 130 },
  { key: 'address', header: 'адрес', type: 'text', width: 260 },
  { key: 'recipientName', header: 'получатель', type: 'text', width: 170 },
  { key: 'phone', header: 'телефон', type: 'text', width: 140 },
  { key: 'comment', header: 'комментарий', type: 'text', width: 260 },
  { key: 'total', header: 'итого ₽', type: 'int', width: 80 },
  { key: 'priceLines', header: 'расчёт', type: 'text', width: 320 },
  { key: 'trackingNumber', header: 'трек-номер', type: 'text', width: 160 },
  { key: 'telegramChargeId', header: 'telegram charge id', type: 'text', width: 220 },
  { key: 'providerChargeId', header: 'provider charge id', type: 'text', width: 220 },
]

export const NUMBER_FORMATS: Record<ColumnType, string> = { text: '@', int: '0' }

export const LIGHT_STAND_YES = 'да'
export const LIGHT_STAND_NO = 'нет'

/** Заказ вместе с полями, которые клиенту не отдаются */
export interface StoredOrder {
  order: Order
  telegramChargeId: string | null
  providerChargeId: string | null
}

type CellValue = string | number
type Cells = Record<ColumnKey, CellValue>
type SheetValue = string | number | boolean | Date | null | undefined

export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

// --- Маппер: единственное место, где строка таблицы превращается в Order и обратно ---

/** Строка, начинающаяся с «=», в таблице стала бы формулой — экранируем апострофом */
function encodeText(value: string | null): string {
  if (value === null) return ''
  return value.startsWith('=') ? `'${value}` : value
}

function decodeText(value: SheetValue): string {
  if (value === null || value === undefined) return ''
  if (isDate(value)) return value.toISOString()
  const text = String(value)
  return text.startsWith("'=") ? text.slice(1) : text
}

function decodeNullableText(value: SheetValue): string | null {
  const text = decodeText(value)
  return text === '' ? null : text
}

function decodeInt(value: SheetValue): number {
  if (typeof value === 'number') return Math.trunc(value)
  const parsed = Number(decodeText(value).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
}

function decodeBoolean(value: SheetValue): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  return ['да', 'true', '1', 'yes'].includes(decodeText(value).trim().toLowerCase())
}

function decodePriceLines(value: SheetValue): PriceLine[] {
  try {
    const parsed: unknown = JSON.parse(decodeText(value) || '[]')
    return Array.isArray(parsed) ? (parsed as PriceLine[]) : []
  } catch {
    return []
  }
}

export function orderToCells({ order, telegramChargeId, providerChargeId }: StoredOrder): Cells {
  return {
    id: order.id,
    number: Number(order.number),
    status: order.status,
    createdAt: order.createdAt,
    paidAt: order.paidAt ?? '',
    updatedAt: order.updatedAt,
    customerTelegramId: order.customer.telegramId,
    customerUsername: encodeText(order.customer.username),
    customerFirstName: encodeText(order.customer.firstName),
    faceitPlayerId: encodeText(order.faceitPlayerId),
    faceitNickname: encodeText(order.faceitNickname),
    templateId: order.design.templateId,
    size: order.design.size,
    displayName: encodeText(order.design.displayName),
    caption: encodeText(order.design.caption),
    level: order.design.level,
    elo: order.design.elo,
    lightStand: order.extras.lightStand ? LIGHT_STAND_YES : LIGHT_STAND_NO,
    deliveryMethod: order.delivery.method,
    city: encodeText(order.delivery.city),
    address: encodeText(order.delivery.address),
    recipientName: encodeText(order.recipient.name),
    phone: encodeText(order.recipient.phone),
    comment: encodeText(order.comment),
    total: order.price.total,
    priceLines: JSON.stringify(order.price.lines),
    trackingNumber: encodeText(order.trackingNumber),
    telegramChargeId: encodeText(telegramChargeId),
    providerChargeId: encodeText(providerChargeId),
  }
}

/** null — строка без id (пустая или заметка владельца) */
export function cellsToOrder(read: (key: ColumnKey) => SheetValue): StoredOrder | null {
  const id = decodeInt(read('id'))
  if (!Number.isSafeInteger(id) || id <= 0) return null

  const order: Order = {
    id,
    number: formatOrderNumber(id),
    status: decodeText(read('status')).trim() as OrderStatus,
    faceitPlayerId: decodeText(read('faceitPlayerId')),
    faceitNickname: decodeText(read('faceitNickname')),
    design: {
      templateId: decodeText(read('templateId')).trim() as TemplateId,
      size: decodeText(read('size')).trim() as PlaqueSize,
      displayName: decodeText(read('displayName')),
      caption: decodeText(read('caption')),
      level: decodeInt(read('level')),
      elo: decodeInt(read('elo')),
    },
    extras: { lightStand: decodeBoolean(read('lightStand')) },
    delivery: {
      method: decodeText(read('deliveryMethod')).trim() as DeliveryMethod,
      city: decodeText(read('city')),
      address: decodeText(read('address')),
    },
    recipient: {
      name: decodeText(read('recipientName')),
      phone: decodeText(read('phone')),
    },
    price: { lines: decodePriceLines(read('priceLines')), total: decodeInt(read('total')) },
    trackingNumber: decodeNullableText(read('trackingNumber')),
    comment: decodeNullableText(read('comment')),
    customer: {
      telegramId: decodeInt(read('customerTelegramId')),
      username: decodeNullableText(read('customerUsername')),
      firstName: decodeText(read('customerFirstName')),
    },
    createdAt: decodeText(read('createdAt')),
    paidAt: decodeNullableText(read('paidAt')),
    updatedAt: decodeText(read('updatedAt')),
  }

  return {
    order,
    telegramChargeId: decodeNullableText(read('telegramChargeId')),
    providerChargeId: decodeNullableText(read('providerChargeId')),
  }
}

// --- Репозиторий ---

interface TableRow {
  /** Номер строки в листе, с 1 */
  rowNumber: number
  stored: StoredOrder
}

interface Table {
  sheet: GoogleAppsScript.Spreadsheet.Sheet
  /** Индекс столбца (с 0) для каждого поля */
  columns: Record<ColumnKey, number>
  rows: TableRow[]
}

const sheetNotReady = (details: string) => new Error(`Таблица заказов не готова: ${details}. Запусти setup() в редакторе Apps Script`)

export function openOrdersSheet(spreadsheetId: string | null): GoogleAppsScript.Spreadsheet.Sheet {
  if (!spreadsheetId) throw sheetNotReady('не задан SPREADSHEET_ID')
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(ORDERS_SHEET_NAME)
  if (!sheet) throw sheetNotReady(`нет листа «${ORDERS_SHEET_NAME}»`)
  return sheet
}

/** Все записи — под общей блокировкой скрипта: иначе два запроса выдадут одинаковый id */
function withScriptLock<T>(action: () => T): T {
  const lock = LockService.getScriptLock()
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    throw new HttpError(503, 'server_busy', 'Слишком много запросов одновременно, попробуй ещё раз')
  }
  try {
    const result = action()
    SpreadsheetApp.flush()
    return result
  } finally {
    lock.releaseLock()
  }
}

export class OrderRepository {
  private table: Table | null = null
  private sheet: GoogleAppsScript.Spreadsheet.Sheet | null = null

  constructor(private readonly spreadsheetId: string | null) {}

  /** Все заказы в порядке строк листа; лист читается один раз за запрос */
  list(): StoredOrder[] {
    return this.readTable().rows.map((row) => row.stored)
  }

  findById(id: number): StoredOrder | null {
    return this.readTable().rows.find((row) => row.stored.order.id === id)?.stored ?? null
  }

  /**
   * Новая строка: id — следующий после максимального (в листе или когда-либо выданного — счётчик
   * LAST_ORDER_ID в свойствах скрипта). Счётчик нужен, чтобы удалённая строка не освободила id:
   * иначе старый неоплаченный счёт с payload «5» оплатил бы чужой новый заказ №…5.
   * createdAt и updatedAt проставляются здесь.
   */
  insert(build: (id: number, nowIso: string) => StoredOrder): StoredOrder {
    return withScriptLock(() => {
      const table = this.readTable(true)
      const props = PropertiesService.getScriptProperties()
      const lastIssued = Number(props.getProperty(LAST_ORDER_ID_PROPERTY)) || 0
      const maxId = table.rows.reduce((max, row) => Math.max(max, row.stored.order.id), lastIssued)
      const nowIso = new Date().toISOString()
      const stored = build(maxId + 1, nowIso)
      stored.order.createdAt = nowIso
      stored.order.updatedAt = nowIso

      const rowNumber = Math.max(table.sheet.getLastRow(), 1) + 1
      const maxRows = table.sheet.getMaxRows()
      if (rowNumber > maxRows) table.sheet.insertRowsAfter(maxRows, ROWS_GROW_BY)

      const cells = orderToCells(stored)
      writeCells(
        table.sheet,
        rowNumber,
        ORDER_COLUMNS.map((column) => ({ column, index: table.columns[column.key], value: cells[column.key] })),
      )
      props.setProperty(LAST_ORDER_ID_PROPERTY, String(stored.order.id))
      this.table = null
      // Читаем обратно через маппер, чтобы ответ совпадал с тем, что лежит в таблице
      return cellsToOrder((key) => cells[key]) ?? stored
    })
  }

  /**
   * Перечитывает заказ под блокировкой и применяет change. change возвращает новую версию
   * или null, если менять нечего. null из update — заказа нет.
   */
  update(
    id: number,
    change: (current: StoredOrder) => StoredOrder | null,
  ): { before: StoredOrder; after: StoredOrder } | null {
    return withScriptLock(() => {
      const table = this.readTable(true)
      const row = table.rows.find((item) => item.stored.order.id === id)
      if (!row) return null

      const before = row.stored
      const next = change(cloneStored(before))
      if (!next) return { before, after: before }

      next.order.updatedAt = new Date().toISOString()
      const beforeCells = orderToCells(before)
      const afterCells = orderToCells(next)
      const changed = ORDER_COLUMNS.filter((column) => beforeCells[column.key] !== afterCells[column.key])
      writeCells(
        table.sheet,
        row.rowNumber,
        changed.map((column) => ({ column, index: table.columns[column.key], value: afterCells[column.key] })),
      )
      this.table = null
      // Читаем обратно через маппер, чтобы ответ совпадал с тем, что лежит в таблице
      return { before, after: cellsToOrder((key) => afterCells[key]) ?? next }
    })
  }

  private getSheet(): GoogleAppsScript.Spreadsheet.Sheet {
    this.sheet ??= openOrdersSheet(this.spreadsheetId)
    return this.sheet
  }

  private readTable(fresh = false): Table {
    if (this.table && !fresh) return this.table

    const sheet = this.getSheet()
    const values = sheet.getDataRange().getValues() as SheetValue[][]
    const headers = (values[0] ?? []).map(normalizeHeader)
    const columns = {} as Record<ColumnKey, number>
    const missing: string[] = []
    for (const column of ORDER_COLUMNS) {
      const index = headers.indexOf(normalizeHeader(column.header))
      if (index === -1) missing.push(column.header)
      else columns[column.key] = index
    }
    if (missing.length > 0) throw sheetNotReady(`нет столбцов ${missing.map((name) => `«${name}»`).join(', ')}`)

    const rows: TableRow[] = []
    for (let index = 1; index < values.length; index++) {
      const line = values[index] ?? []
      const stored = cellsToOrder((key) => line[columns[key]])
      if (stored) rows.push({ rowNumber: index + 1, stored })
    }

    this.table = { sheet, columns, rows }
    return this.table
  }
}

function cloneStored(stored: StoredOrder): StoredOrder {
  return JSON.parse(JSON.stringify(stored)) as StoredOrder
}

interface CellWrite {
  column: ColumnDef
  /** Индекс столбца в листе, с 0 */
  index: number
  value: CellValue
}

/**
 * Пишет ячейки строки, склеивая соседние столбцы в один диапазон.
 * Сначала формат, потом значение: так текст остаётся текстом («+7999…», «2026-10-13T…», «=…»).
 * Чужие столбцы владельца не трогаем.
 */
function writeCells(sheet: GoogleAppsScript.Spreadsheet.Sheet, rowNumber: number, cells: CellWrite[]): void {
  const sorted = [...cells].sort((a, b) => a.index - b.index)
  let start = 0
  while (start < sorted.length) {
    let end = start
    while (end + 1 < sorted.length && sorted[end + 1]!.index === sorted[end]!.index + 1) end++
    const group = sorted.slice(start, end + 1)
    const range = sheet.getRange(rowNumber, group[0]!.index + 1, 1, group.length)
    range.setNumberFormats([group.map((cell) => NUMBER_FORMATS[cell.column.type])])
    range.setValues([group.map((cell) => cell.value)])
    start = end + 1
  }
}
