/** Ошибка с HTTP-кодом и кодом для клиента: отдаётся как `{ ok: false, status, error, message }` */
export class HttpError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly issues?: ValidationIssue[]

  constructor(statusCode: number, code: string, message?: string, issues?: ValidationIssue[]) {
    super(message ?? code)
    this.name = 'HttpError'
    this.statusCode = statusCode
    this.code = code
    if (issues) this.issues = issues
  }

  get publicMessage(): string | undefined {
    return this.message === this.code ? undefined : this.message
  }
}

export interface ValidationIssue {
  path: string
  message: string
}

export const notFound = (message = 'Не найдено') => new HttpError(404, 'not_found', message)
export const forbidden = (message = 'Нет доступа') => new HttpError(403, 'forbidden', message)
export const unauthorized = () => new HttpError(401, 'unauthorized', 'Открой приложение из Telegram')
export const badRequest = (message: string) => new HttpError(400, 'bad_request', message)

export function validationError(issues: ValidationIssue[]): HttpError {
  return new HttpError(400, 'validation_error', issues[0]?.message ?? 'Проверь данные', issues)
}

/** Сообщение ошибки для лога: стек, если есть */
export function describeError(error: unknown): string {
  if (error instanceof Error) return error.stack ?? `${error.name}: ${error.message}`
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}
