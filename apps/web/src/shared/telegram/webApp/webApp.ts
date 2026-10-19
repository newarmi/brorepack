import type { TelegramWebApp } from '../types/telegram';

const isBrowser = typeof window !== 'undefined';

export const webApp: TelegramWebApp | null = isBrowser ? (window.Telegram?.WebApp ?? null) : null;

/** Внутри Telegram initData всегда непустая; в обычном браузере скрипт есть, но данных нет */
export const isTelegram = Boolean(webApp?.initData);

export const initData = webApp?.initData ?? '';

/** start_param из ссылки t.me/<bot>?startapp=… */
export const startParam: string | null = isTelegram
  ? (webApp?.initDataUnsafe.start_param ?? null)
  : null;

/** Есть ли в клиенте Telegram метод из Bot API указанной версии */
export const checkTelegramVersion = (version: string): boolean => {
  return isTelegram && Boolean(webApp?.isVersionAtLeast(version));
};

/** Клиент Telegram одной строкой — для временной диагностики жестов */
export const describeTelegramClient = (): string => {
  if (!webApp) {
    return 'не Telegram';
  }
  return `${webApp.platform} ${webApp.version} · vswipes ${String(webApp.isVerticalSwipesEnabled)}`;
};
