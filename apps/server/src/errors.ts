/** Ошибка с HTTP-кодом и кодом для клиента: отдаётся как `{ error, message }` */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message?: string,
  ) {
    super(message ?? code)
    this.name = 'HttpError'
  }

  get publicMessage(): string | undefined {
    return this.message === this.code ? undefined : this.message
  }
}

export const notFound = (message = 'Не найдено') => new HttpError(404, 'not_found', message)
export const forbidden = (message = 'Нет доступа') => new HttpError(403, 'forbidden', message)
