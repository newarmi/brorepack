import type {
  TelegramImpactStyle,
  TelegramInvoiceStatus,
  TelegramNotificationType,
} from '../types/telegram.d.ts';
import { checkTelegramVersion, isTelegram, startParam, webApp } from '../webApp/webApp';

const DEV_PHONE = '+7 900 000-00-00';

const haptic = {
  impact: (style: TelegramImpactStyle = 'light'): void => {
    if (checkTelegramVersion('6.1')) {
      webApp?.HapticFeedback.impactOccurred(style);
    }
  },
  selection: (): void => {
    if (checkTelegramVersion('6.1')) {
      webApp?.HapticFeedback.selectionChanged();
    }
  },
  notify: (type: TelegramNotificationType): void => {
    if (checkTelegramVersion('6.1')) {
      webApp?.HapticFeedback.notificationOccurred(type);
    }
  },
};

/** Открывает счёт Telegram Payments. Вне Telegram не вызывается — там тестовая оплата */
const openInvoice = (url: string): Promise<TelegramInvoiceStatus> => {
  return new Promise((resolve) => {
    if (!webApp || !checkTelegramVersion('6.1')) {
      resolve('failed');
      return;
    }
    webApp.openInvoice(url, (status) => resolve(status));
  });
};

const normalizePhone = (phone: string): string => {
  const trimmed = phone.trim();
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
};

/** Телефон из Telegram в один тап; null — пользователь отказался или клиент не умеет */
const requestContact = (): Promise<string | null> => {
  if (!isTelegram) {
    return Promise.resolve(DEV_PHONE);
  }
  return new Promise((resolve) => {
    if (!webApp || !checkTelegramVersion('6.9')) {
      resolve(null);
      return;
    }
    webApp.requestContact((isShared, response) => {
      const isSent = isShared && response?.status === 'sent';
      resolve(isSent ? normalizePhone(response.responseUnsafe.contact.phone_number) : null);
    });
  });
};

const openTelegramLink = (url: string): void => {
  if (webApp && isTelegram) {
    webApp.openTelegramLink(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};

/** Закрывает мини-приложение; вне Telegram возвращает false — решает вызывающий */
const close = (): boolean => {
  if (!webApp || !isTelegram) {
    return false;
  }
  webApp.close();
  return true;
};

const telegram = {
  isTelegram,
  startParam,
  haptic,
  openInvoice,
  requestContact,
  openTelegramLink,
  close,
} as const;

export type TelegramApi = typeof telegram;

/** Всё, что приложение делает с Telegram, — через этот объект; вне Telegram методы безопасны */
export const useTelegram = (): TelegramApi => {
  return telegram;
};

export default useTelegram;
