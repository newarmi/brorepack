// Мелочи, которых нет в Apps Script: в рантайме нет URLSearchParams, URL, TextEncoder и Buffer.

/** UTF-8 байты строки (Byte[] Apps Script — знаковые, от -128 до 127) */
export function utf8Bytes(value: string): GoogleAppsScript.Byte[] {
  return Utilities.newBlob(value).getBytes()
}

export function toHex(bytes: readonly number[]): string {
  let hex = ''
  for (const byte of bytes) hex += (byte & 0xff).toString(16).padStart(2, '0')
  return hex
}

/** Знаковые байты Apps Script → 0–255 */
export function toUnsigned(bytes: readonly number[]): number[] {
  return bytes.map((byte) => byte & 0xff)
}

function decodeQueryComponent(value: string): string {
  return decodeURIComponent(value.replace(/\+/g, ' '))
}

/**
 * Разбор query string так же, как это делает URLSearchParams: пары в исходном порядке,
 * «+» — пробел, percent-decoding. null — если строка закодирована с ошибкой.
 */
export function parseQueryString(query: string): [string, string][] | null {
  const pairs: [string, string][] = []
  const source = query.startsWith('?') ? query.slice(1) : query
  try {
    for (const part of source.split('&')) {
      if (part === '') continue
      const separator = part.indexOf('=')
      const rawKey = separator === -1 ? part : part.slice(0, separator)
      const rawValue = separator === -1 ? '' : part.slice(separator + 1)
      pairs.push([decodeQueryComponent(rawKey), decodeQueryComponent(rawValue)])
    }
  } catch {
    return null
  }
  return pairs
}

/** Сравнение секретов без раннего выхода на первом несовпавшем символе */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index++) diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  return diff === 0
}

/** Дата из ячейки таблицы: Date приходит из другого «realm», поэтому без instanceof */
export function isDate(value: unknown): value is Date {
  return Object.prototype.toString.call(value) === '[object Date]'
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Добавляет параметр к адресу, учитывая, есть ли уже `?` */
export function appendQueryParam(url: string, key: string, value: string): string {
  const [base = '', hash] = url.split('#')
  const separator = base.includes('?') ? '&' : '?'
  return `${base}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}${hash !== undefined ? `#${hash}` : ''}`
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
