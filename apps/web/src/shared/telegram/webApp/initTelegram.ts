import { watchEffect } from 'vue';

import { THEME_COLORS } from '@/shared/config/theme';

import { useBackButtonStore } from '../stores/backButtonStore';
import type { TelegramWebApp } from '../types/telegram';
import { checkTelegramVersion, isTelegram, webApp } from './webApp';

const setupAppearance = (app: TelegramWebApp): void => {
  app.ready();
  app.expand();
  if (checkTelegramVersion('6.1')) {
    app.setBackgroundColor(THEME_COLORS.background);
  }
  if (checkTelegramVersion('6.9')) {
    app.setHeaderColor(THEME_COLORS.header);
  }
  if (checkTelegramVersion('7.10')) {
    app.setBottomBarColor?.(THEME_COLORS.background);
  }
  if (checkTelegramVersion('7.7')) {
    app.disableVerticalSwipes?.();
  }
};

// Главная кнопка — своя (MainButtonBar.vue): нативную MainButton рисует клиент системным шрифтом,
// и её текст нельзя анимировать. Нативную прячем — вдруг клиент оставил её видимой
const hideNativeMainButton = (app: TelegramWebApp): void => {
  app.MainButton.hideProgress();
  app.MainButton.setParams({ is_visible: false });
};

const bindBackButton = (app: TelegramWebApp): void => {
  if (!checkTelegramVersion('6.1')) {
    return;
  }
  const backButton = useBackButtonStore();
  app.BackButton.onClick(backButton.click);
  watchEffect(() => {
    if (backButton.isVisible) {
      app.BackButton.show();
      return;
    }
    app.BackButton.hide();
  });
};

let isInitialized = false;

/** Вызывается один раз при старте приложения, после подключения Pinia */
export const initTelegram = (): void => {
  if (isInitialized || !webApp || !isTelegram) {
    return;
  }
  isInitialized = true;
  setupAppearance(webApp);
  hideNativeMainButton(webApp);
  bindBackButton(webApp);
};
