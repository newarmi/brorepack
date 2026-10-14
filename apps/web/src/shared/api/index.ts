/**
 * Слой доступа к бэкенду.
 * call(endpoint) → выбранный транспорт (transports/rest — apps/server, transports/gas — Apps Script).
 * Ошибки любого транспорта приходят как ApiError (errors.ts). Подпись запроса берётся из shared/telegram.
 */

export { call } from './client';
export { API_ERROR_CODES, ApiError } from './errors';
export { requestRestBlob } from './transports/rest';
