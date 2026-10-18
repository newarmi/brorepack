/**
 * Слой доступа к бэкенду.
 * call(endpoint) → выбранный транспорт (transports/rest — apps/server, transports/gas — Apps Script).
 * Ошибки любого транспорта приходят как ApiError (errors.ts). Подпись запроса берётся из shared/telegram.
 * sendRequest/readJson — fetch для внешних сервисов вне call() (геокодер подсказок адреса).
 */

export { call } from './client';
export { API_ERROR_CODES, ApiError, isAbortError } from './errors';
export { readJson, sendRequest } from './transports/http';
export { requestRestBlob } from './transports/rest';
