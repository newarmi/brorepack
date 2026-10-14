import { readonly, shallowRef } from 'vue';

import { getErrorMessage } from '@/shared/api/errors';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastMessage {
  id: number;
  text: string;
  tone: ToastTone;
}

const DEFAULT_DURATION_MS = 3200;
const ERROR_DURATION_MS = 4200;

// Тост один на всё приложение: новый заменяет предыдущий
const current = shallowRef<ToastMessage | null>(null);
let nextId = 1;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const hideToast = (): void => {
  if (hideTimer) {
    clearTimeout(hideTimer);
  }
  hideTimer = null;
  current.value = null;
};

const showToast = (
  text: string,
  tone: ToastTone = 'info',
  duration = DEFAULT_DURATION_MS,
): void => {
  if (hideTimer) {
    clearTimeout(hideTimer);
  }
  current.value = { id: nextId++, text, tone };
  hideTimer = setTimeout(hideToast, duration);
};

/** Ошибка сети или API → тост с сообщением сервера, если оно есть */
const showErrorToast = (error: unknown, fallback?: string): void => {
  showToast(getErrorMessage(error, fallback), 'error', ERROR_DURATION_MS);
};

export const useToast = () => {
  return {
    toast: readonly(current),
    showToast,
    showErrorToast,
    hideToast,
  };
};

export default useToast;
