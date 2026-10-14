// Эмуляция сервисов Google Apps Script в памяти — ровно то, чем пользуется src/.
// Семантика повторяет Apps Script там, где это важно: знаковые байты, порядок аргументов HMAC,
// приведение типов ячеек таблицы, границы листа, multipart в UrlFetchApp.
import { createHash, createHmac, randomUUID } from 'node:crypto'

/* eslint-disable @typescript-eslint/no-explicit-any */

// --- байты ---

export type Bytes = number[]

export function toSigned(buffer: Uint8Array): Bytes {
  return Array.from(buffer, (byte) => (byte > 127 ? byte - 256 : byte))
}

export function toBuffer(value: string | Bytes): Buffer {
  if (typeof value === 'string') return Buffer.from(value, 'utf8')
  if (!Array.isArray(value)) throw new TypeError('Ожидался Byte[] или строка')
  for (const byte of value) {
    if (!Number.isInteger(byte) || byte < -128 || byte > 255) throw new TypeError(`Неверный байт: ${byte}`)
  }
  return Buffer.from(value.map((byte) => byte & 0xff))
}

// --- Blob ---

export class FakeBlob {
  constructor(
    public bytes: Buffer,
    public contentType: string | null = null,
    public name: string | null = null,
  ) {}

  getBytes(): Bytes {
    return toSigned(this.bytes)
  }
  getDataAsString(): string {
    return this.bytes.toString('utf8')
  }
  getContentType(): string | null {
    return this.contentType
  }
  setContentType(value: string): this {
    this.contentType = value
    return this
  }
  getName(): string | null {
    return this.name
  }
  setName(value: string): this {
    this.name = value
    return this
  }
  copyBlob(): FakeBlob {
    return new FakeBlob(Buffer.from(this.bytes), this.contentType, this.name)
  }
}

// --- Utilities ---

const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/

export function createUtilities() {
  return {
    DigestAlgorithm: { SHA_256: 'SHA_256', SHA_1: 'SHA_1', MD5: 'MD5' },
    Charset: { UTF_8: 'UTF_8', US_ASCII: 'US_ASCII' },
    /** Как в Apps Script: (value, key) — сначала сообщение, потом ключ */
    computeHmacSha256Signature(value: string | Bytes, key: string | Bytes): Bytes {
      return toSigned(createHmac('sha256', toBuffer(key)).update(toBuffer(value)).digest())
    },
    computeDigest(algorithm: string, value: string | Bytes): Bytes {
      const name = { SHA_256: 'sha256', SHA_1: 'sha1', MD5: 'md5' }[algorithm]
      if (!name) throw new Error(`Неизвестный алгоритм ${algorithm}`)
      return toSigned(createHash(name).update(toBuffer(value)).digest())
    },
    base64Encode(value: string | Bytes): string {
      return toBuffer(value).toString('base64')
    },
    base64Decode(encoded: string): Bytes {
      if (typeof encoded !== 'string' || !BASE64_PATTERN.test(encoded) || encoded.length % 4 === 1) {
        throw new Error('Exception: Could not decode string.')
      }
      return toSigned(Buffer.from(encoded, 'base64'))
    },
    newBlob(data: string | Bytes, contentType?: string, name?: string): FakeBlob {
      return new FakeBlob(toBuffer(data), contentType ?? null, name ?? null)
    },
    getUuid(): string {
      return randomUUID()
    },
  }
}

// --- PropertiesService ---

export function createProperties(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial))
  const properties = {
    getProperty: (key: string) => (store.has(key) ? store.get(key)! : null),
    setProperty(key: string, value: string) {
      store.set(key, String(value))
      return properties
    },
    deleteProperty(key: string) {
      store.delete(key)
      return properties
    },
    getProperties: () => Object.fromEntries(store),
    setProperties(values: Record<string, string>) {
      for (const [key, value] of Object.entries(values)) store.set(key, String(value))
      return properties
    },
    getKeys: () => [...store.keys()],
  }
  return { store, service: { getScriptProperties: () => properties } }
}

// --- CacheService ---

export function createCache(now: () => number) {
  const store = new Map<string, { value: string; expiresAt: number }>()
  const cache = {
    get(key: string): string | null {
      const entry = store.get(key)
      if (!entry || entry.expiresAt <= now()) return null
      return entry.value
    },
    put(key: string, value: string, ttlSeconds = 600) {
      if (key.length > 250) throw new Error('Cache key too long')
      if (value.length > 100 * 1024) throw new Error('Argument too large: value')
      store.set(key, { value, expiresAt: now() + Math.min(ttlSeconds, 21600) * 1000 })
    },
    remove(key: string) {
      store.delete(key)
    },
  }
  return { store, service: { getScriptCache: () => cache } }
}

// --- LockService ---

export function createLocks() {
  const state = { busy: false, held: 0, acquired: 0 }
  const service = {
    getScriptLock() {
      let has = false
      return {
        tryLock(_timeoutMs: number) {
          if (state.busy || state.held > 0) return false
          state.held++
          state.acquired++
          has = true
          return true
        },
        waitLock(timeoutMs: number) {
          if (!this.tryLock(timeoutMs)) throw new Error('Lock timeout')
        },
        releaseLock() {
          if (has) {
            state.held--
            has = false
          }
        },
        hasLock: () => has,
      }
    },
  }
  return { state, service }
}

// --- SpreadsheetApp ---

interface Cell {
  value: unknown
  format: string | null
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/

/** Как Sheets разбирает введённую строку, если формат ячейки не «обычный текст» */
function coerceUserEntered(value: unknown, format: string | null): unknown {
  if (value === null || value === undefined) return ''
  if (format === '@') {
    // «Обычный текст»: всё хранится строкой как есть
    return typeof value === 'string' ? value : String(value)
  }
  if (typeof value !== 'string') return value
  if (value.startsWith("'")) return value.slice(1)
  if (value.startsWith('=')) return { formula: value }
  if (/^[+-]?\d+([.,]\d+)?$/.test(value.trim())) return Number(value.trim().replace(',', '.'))
  if (ISO_DATE_PATTERN.test(value.trim())) return new Date(value.trim())
  if (/^(true|false)$/i.test(value.trim())) return value.trim().toLowerCase() === 'true'
  return value
}

export class FakeRange {
  constructor(
    readonly sheet: FakeSheet,
    readonly row: number,
    readonly column: number,
    readonly numRows: number,
    readonly numColumns: number,
  ) {}

  private forEach(callback: (cell: Cell, r: number, c: number) => void) {
    for (let r = 0; r < this.numRows; r++) {
      for (let c = 0; c < this.numColumns; c++) callback(this.sheet.cell(this.row + r, this.column + c), r, c)
    }
  }

  private checkShape(values: unknown[][]) {
    if (!Array.isArray(values) || values.length !== this.numRows || values.some((line) => !Array.isArray(line) || line.length !== this.numColumns)) {
      throw new Error(
        `The number of rows or columns in the data does not match the range: ${values?.length}x${values?.[0]?.length} vs ${this.numRows}x${this.numColumns}`,
      )
    }
  }

  getValues(): unknown[][] {
    const result: unknown[][] = Array.from({ length: this.numRows }, () => new Array(this.numColumns).fill(''))
    this.forEach((cell, r, c) => {
      const value = cell.value
      result[r]![c] = value && typeof value === 'object' && 'formula' in (value as object) ? '#FORMULA' : value
    })
    return result
  }
  getValue(): unknown {
    return this.getValues()[0]![0]
  }
  setValues(values: unknown[][]): this {
    this.checkShape(values)
    this.forEach((cell, r, c) => {
      cell.value = coerceUserEntered(values[r]![c], cell.format)
    })
    this.sheet.spreadsheet.app.writes++
    return this
  }
  setValue(value: unknown): this {
    this.forEach((cell) => {
      cell.value = coerceUserEntered(value, cell.format)
    })
    return this
  }
  getNumberFormats(): (string | null)[][] {
    const result: (string | null)[][] = Array.from({ length: this.numRows }, () => new Array(this.numColumns).fill(null))
    this.forEach((cell, r, c) => (result[r]![c] = cell.format))
    return result
  }
  setNumberFormat(format: string): this {
    this.forEach((cell) => (cell.format = format))
    return this
  }
  setNumberFormats(formats: string[][]): this {
    this.checkShape(formats)
    this.forEach((cell, r, c) => (cell.format = formats[r]![c]!))
    return this
  }
  setDataValidation(rule: unknown): this {
    this.sheet.validations.push({ row: this.row, column: this.column, numRows: this.numRows, numColumns: this.numColumns, rule })
    return this
  }
  setFontWeight(value: string): this {
    this.sheet.styles.push({ row: this.row, column: this.column, style: 'fontWeight', value })
    return this
  }
  setBackground(value: string): this {
    this.sheet.styles.push({ row: this.row, column: this.column, style: 'background', value })
    return this
  }
  setFontColor(value: string): this {
    this.sheet.styles.push({ row: this.row, column: this.column, style: 'fontColor', value })
    return this
  }
  setVerticalAlignment(value: string): this {
    this.sheet.styles.push({ row: this.row, column: this.column, style: 'verticalAlignment', value })
    return this
  }
}

export class FakeSheet {
  /** rows[r][c], с 0 */
  private rows: Cell[][] = []
  frozenRows = 0
  columnWidths = new Map<number, number>()
  validations: { row: number; column: number; numRows: number; numColumns: number; rule: any }[] = []
  styles: { row: number; column: number; style: string; value: string }[] = []

  constructor(
    readonly spreadsheet: FakeSpreadsheet,
    public name: string,
    public maxRows = 1000,
    public maxColumns = 26,
  ) {}

  cell(row: number, column: number): Cell {
    if (row < 1 || column < 1 || row > this.maxRows || column > this.maxColumns) {
      throw new Error(`Exception: The coordinates of the range are outside the dimensions of the sheet. (${row}, ${column})`)
    }
    const line = (this.rows[row - 1] ??= [])
    return (line[column - 1] ??= { value: '', format: null })
  }

  private isFilled(cell: Cell | undefined): boolean {
    return cell !== undefined && cell.value !== '' && cell.value !== null && cell.value !== undefined
  }

  getName() {
    return this.name
  }
  setName(name: string) {
    this.name = name
    return this
  }
  getLastRow(): number {
    for (let r = this.rows.length - 1; r >= 0; r--) if ((this.rows[r] ?? []).some((cell) => this.isFilled(cell))) return r + 1
    return 0
  }
  getLastColumn(): number {
    let last = 0
    for (const line of this.rows) {
      for (let c = (line ?? []).length - 1; c >= 0; c--) {
        if (this.isFilled(line![c])) {
          last = Math.max(last, c + 1)
          break
        }
      }
    }
    return last
  }
  getMaxRows() {
    return this.maxRows
  }
  getMaxColumns() {
    return this.maxColumns
  }
  insertRowsAfter(_afterPosition: number, howMany: number) {
    this.maxRows += howMany
    return this
  }
  deleteRow(rowPosition: number) {
    this.rows.splice(rowPosition - 1, 1)
    return this
  }
  insertColumnsAfter(_afterPosition: number, howMany: number) {
    this.maxColumns += howMany
    return this
  }
  getRange(row: number, column: number, numRows = 1, numColumns = 1): FakeRange {
    if (typeof row !== 'number') throw new Error('Эмулятор поддерживает только getRange(row, column, ...)')
    // Проверка границ — как в Sheets
    this.cell(row + numRows - 1, column + numColumns - 1)
    this.cell(row, column)
    return new FakeRange(this, row, column, numRows, numColumns)
  }
  getDataRange(): FakeRange {
    this.spreadsheet.app.reads++
    return new FakeRange(this, 1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1))
  }
  setFrozenRows(rows: number) {
    this.frozenRows = rows
  }
  getFrozenRows() {
    return this.frozenRows
  }
  setColumnWidth(column: number, width: number) {
    this.columnWidths.set(column, width)
    return this
  }

  // --- для тестов ---

  /** Значения как отдаёт getDataRange().getValues() */
  dump(): unknown[][] {
    return new FakeRange(this, 1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1)).getValues()
  }
  /** Строки как объекты по заголовкам */
  records(): Record<string, unknown>[] {
    const [headers = [], ...lines] = this.dump()
    return lines.map((line) => Object.fromEntries(headers.map((header, index) => [String(header), line[index]])))
  }
}

export class FakeSpreadsheet {
  sheets: FakeSheet[] = []

  constructor(
    readonly app: FakeSpreadsheetApp,
    readonly id: string,
    public name: string,
  ) {
    this.sheets.push(new FakeSheet(this, 'Лист1'))
  }

  getId() {
    return this.id
  }
  getName() {
    return this.name
  }
  getUrl() {
    return `https://docs.google.com/spreadsheets/d/${this.id}/edit`
  }
  getSheets() {
    return [...this.sheets]
  }
  getSheetByName(name: string) {
    return this.sheets.find((sheet) => sheet.name === name) ?? null
  }
  insertSheet(name: string) {
    if (this.getSheetByName(name)) throw new Error(`Лист «${name}» уже есть`)
    const sheet = new FakeSheet(this, name)
    this.sheets.push(sheet)
    return sheet
  }
}

class FakeDataValidationBuilder {
  rule: { type?: string; values?: string[]; showDropdown?: boolean; allowInvalid?: boolean; helpText?: string } = {}
  requireValueInList(values: string[], showDropdown = true) {
    this.rule = { ...this.rule, type: 'VALUE_IN_LIST', values: [...values], showDropdown }
    return this
  }
  requireCheckbox() {
    this.rule = { ...this.rule, type: 'CHECKBOX' }
    return this
  }
  setAllowInvalid(allowInvalid: boolean) {
    this.rule.allowInvalid = allowInvalid
    return this
  }
  setHelpText(text: string) {
    this.rule.helpText = text
    return this
  }
  build() {
    return { ...this.rule }
  }
}

export class FakeSpreadsheetApp {
  spreadsheets = new Map<string, FakeSpreadsheet>()
  reads = 0
  writes = 0
  flushes = 0
  private counter = 0

  openById(id: string) {
    const spreadsheet = this.spreadsheets.get(id)
    if (!spreadsheet) throw new Error(`Exception: Unexpected error while getting the method or property openById on object SpreadsheetApp. (${id})`)
    return spreadsheet
  }
  create(name: string) {
    const id = `sheet-${++this.counter}-${randomUUID().slice(0, 8)}`
    const spreadsheet = new FakeSpreadsheet(this, id, name)
    this.spreadsheets.set(id, spreadsheet)
    return spreadsheet
  }
  flush() {
    this.flushes++
  }
  newDataValidation() {
    return new FakeDataValidationBuilder()
  }
}

// --- UrlFetchApp ---

export interface FetchCall {
  url: string
  params: Record<string, any>
}

export interface FakeResponseInit {
  code?: number
  body?: unknown
}

export type FetchHandler = (call: FetchCall) => FakeResponseInit | undefined

function makeResponse({ code = 200, body = '' }: FakeResponseInit) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return {
    getResponseCode: () => code,
    getContentText: () => text,
    getHeaders: () => ({ 'Content-Type': 'application/json' }),
    getAllHeaders: () => ({ 'Content-Type': 'application/json' }),
    getBlob: () => new FakeBlob(Buffer.from(text, 'utf8'), 'application/json'),
    getContent: () => toSigned(Buffer.from(text, 'utf8')),
  }
}

export function createUrlFetch() {
  const calls: FetchCall[] = []
  const handlers: FetchHandler[] = []
  const service = {
    fetch(url: string, params: Record<string, any> = {}) {
      const call = { url, params }
      calls.push(call)
      // Без muteHttpExceptions Apps Script бросает на 4xx/5xx — src всегда ставит muteHttpExceptions
      for (const handler of handlers) {
        const result = handler(call)
        if (result) {
          if (!params.muteHttpExceptions && (result.code ?? 200) >= 400) throw new Error(`Request failed for ${url} returned code ${result.code}`)
          return makeResponse(result)
        }
      }
      throw new Error(`Exception: DNS error: ${url}`)
    },
    fetchAll() {
      throw new Error('fetchAll не эмулируется')
    },
  }
  return { calls, handlers, service }
}

// --- ContentService / HtmlService ---

export class FakeTextOutput {
  readonly kind = 'text'
  mimeType = 'TEXT'
  constructor(readonly content: string) {}
  setMimeType(mimeType: string) {
    this.mimeType = mimeType
    return this
  }
  getMimeType() {
    return this.mimeType
  }
  getContent() {
    return this.content
  }
}

export class FakeHtmlOutput {
  readonly kind = 'html'
  constructor(readonly content: string) {}
  getContent() {
    return this.content
  }
}

// --- console ---

export interface LogEntry {
  level: 'log' | 'info' | 'warn' | 'error'
  message: string
}

export function createConsole(logs: LogEntry[]) {
  const write = (level: LogEntry['level']) => (...args: unknown[]) => {
    const message = args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ')
    logs.push({ level, message })
    if (process.env.GAS_DEBUG) process.stderr.write(`[gas ${level}] ${message}\n`)
  }
  return { log: write('log'), info: write('info'), warn: write('warn'), error: write('error') }
}

// --- Сборка окружения ---

export interface GasEnvOptions {
  properties?: Record<string, string>
  /** Время для CacheService (сервисы Apps Script живут в реальном времени, как и скрипт) */
  now?: () => number
}

export function createGasEnv(options: GasEnvOptions = {}) {
  const now = options.now ?? Date.now
  const logs: LogEntry[] = []
  const properties = createProperties(options.properties)
  const cache = createCache(now)
  const locks = createLocks()
  const spreadsheetApp = new FakeSpreadsheetApp()
  const urlFetch = createUrlFetch()
  const fakeConsole = createConsole(logs)

  const globals = {
    console: fakeConsole,
    Logger: { log: (...args: unknown[]) => fakeConsole.log(...args) },
    Utilities: createUtilities(),
    PropertiesService: properties.service,
    CacheService: cache.service,
    LockService: locks.service,
    SpreadsheetApp: spreadsheetApp,
    UrlFetchApp: urlFetch.service,
    ContentService: {
      MimeType: { JSON: 'JSON', TEXT: 'TEXT', JAVASCRIPT: 'JAVASCRIPT' },
      createTextOutput: (content = '') => new FakeTextOutput(content),
    },
    HtmlService: {
      createHtmlOutput: (html = '') => new FakeHtmlOutput(String(html)),
    },
  }

  return { globals, logs, properties, cache, locks, spreadsheetApp, urlFetch }
}

export type GasEnv = ReturnType<typeof createGasEnv>
