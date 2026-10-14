import { computed, shallowRef } from 'vue';
import { defineStore } from 'pinia';

// Общее состояние «нативной» BackButton Telegram: и для WebApp.BackButton, и для DevTelegramChrome

interface BackHandler {
  owner: symbol;
  handler: () => void;
}

/** «Назад» по умолчанию ведёт по истории; экран может временно перехватить нажатие (стек) */
export const useBackButtonStore = defineStore('telegramBackButton', () => {
  /** Видимость по маршруту: на стартовом экране кнопки нет */
  const isVisibleOnRoute = shallowRef(false);
  const handlers = shallowRef<BackHandler[]>([]);
  let defaultHandler: (() => void) | null = null;

  const isVisible = computed(() => isVisibleOnRoute.value || handlers.value.length > 0);

  const setVisibleOnRoute = (isVisible: boolean): void => {
    isVisibleOnRoute.value = isVisible;
  };

  const setDefaultHandler = (handler: () => void): void => {
    defaultHandler = handler;
  };

  const removeHandler = (owner: symbol): void => {
    handlers.value = handlers.value.filter((item) => item.owner !== owner);
  };

  const pushHandler = (owner: symbol, handler: () => void): void => {
    removeHandler(owner);
    handlers.value = [...handlers.value, { owner, handler }];
  };

  const click = (): void => {
    const lastHandler = handlers.value.at(-1);
    if (lastHandler) {
      lastHandler.handler();
      return;
    }
    defaultHandler?.();
  };

  return { isVisible, setVisibleOnRoute, setDefaultHandler, pushHandler, removeHandler, click };
});
