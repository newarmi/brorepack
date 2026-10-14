import type { TelegramWebApp } from './types';

export const webApp: TelegramWebApp | null =
  (typeof window !== 'undefined' && window.Telegram?.WebApp) || null;

/** Внутри Telegram initData всегда непустая; в обычном браузере скрипт есть, но данных нет */
export const isTelegram = Boolean(webApp?.initData);

export const initData = webApp?.initData ?? '';

/** start_param из ссылки t.me/<bot>?startapp=… */
export const startParam: string | null = (isTelegram && webApp?.initDataUnsafe.start_param) || null;

/** Есть ли в клиенте Telegram метод из Bot API указанной версии */
export const checkTelegramVersion = (version: string): boolean => {
  return isTelegram && webApp !== null && webApp.isVersionAtLeast(version);
};
