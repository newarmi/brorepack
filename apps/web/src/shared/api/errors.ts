export const API_ERROR_CODES = {
  networkError: 'network_error',
  serverError: 'server_error',
  unknown: 'unknown',
  unauthorized: 'unauthorized',
  forbidden: 'forbidden',
  notFound: 'not_found',
  invalidNickname: 'invalid_nickname',
  playerNotFound: 'player_not_found',
  faceitUnavailable: 'faceit_unavailable',
  faceitNotConfigured: 'faceit_not_configured',
  validationError: 'validation_error',
  orderNotPayable: 'order_not_payable',
  paymentUnavailable: 'payment_unavailable',
  botUnavailable: 'bot_unavailable',
} as const;

/** Понятные тексты на случай, если сервер не прислал `message` */
const ERROR_MESSAGES: Record<string, string> = {
  [API_ERROR_CODES.networkError]: 'Нет связи с сервером. Проверь интернет и попробуй ещё раз',
  [API_ERROR_CODES.unauthorized]: 'Не получилось войти. Открой приложение заново из чата с ботом',
  [API_ERROR_CODES.forbidden]: 'Нет доступа',
  [API_ERROR_CODES.notFound]: 'Не нашли такой заказ',
  [API_ERROR_CODES.invalidNickname]: 'Ник FACEIT — латиница, цифры, «-» и «_»',
  [API_ERROR_CODES.playerNotFound]: 'Не нашли такого игрока на FACEIT',
  [API_ERROR_CODES.faceitUnavailable]: 'FACEIT сейчас не отвечает. Попробуй через минуту',
  [API_ERROR_CODES.faceitNotConfigured]: 'FACEIT ещё не подключён к магазину. Попробуй позже',
  [API_ERROR_CODES.validationError]: 'Проверь заполненные поля',
  [API_ERROR_CODES.orderNotPayable]: 'Этот заказ уже нельзя оплатить',
  [API_ERROR_CODES.paymentUnavailable]: 'Оплата временно недоступна. Попробуй чуть позже',
  [API_ERROR_CODES.botUnavailable]: 'Бот сейчас выключен — скачай файлы кнопками ниже',
};

const DEFAULT_ERROR_MESSAGE = 'Что-то пошло не так. Попробуй ещё раз';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly serverMessage: string | null;

  constructor(status: number, code: string, serverMessage?: string | null) {
    super(serverMessage || ERROR_MESSAGES[code] || DEFAULT_ERROR_MESSAGE);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.serverMessage = serverMessage ?? null;
  }
}

/** Любая ошибка загрузки → ApiError, чтобы экраны работали с одним типом */
export const toApiError = (error: unknown): ApiError => {
  return error instanceof ApiError ? error : new ApiError(0, API_ERROR_CODES.unknown);
};

export const getErrorMessage = (error: unknown, fallback = DEFAULT_ERROR_MESSAGE): string => {
  return error instanceof ApiError ? error.message : fallback;
};

export const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === 'AbortError';
};
