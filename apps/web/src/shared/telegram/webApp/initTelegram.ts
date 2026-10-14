import { watchEffect } from 'vue';

import { THEME_COLORS } from '@/shared/config/theme';

import { useBackButtonStore } from '../stores/backButtonStore';
import { useMainButtonStore } from '../stores/mainButtonStore';
import type { TelegramWebApp } from '../types/telegram';
import { checkTelegramVersion, isTelegram, webApp } from './webApp';

const setupAppearance = (app: TelegramWebApp): void => {
  app.ready();
  app.expand();
  if (checkTelegramVersion('6.1')) {
    app.setBackgroundColor(THEME_COLORS.background);
  }
  if (checkTelegramVersion('6.9')) {
    app.setHeaderColor(THEME_COLORS.background);
  }
  if (checkTelegramVersion('7.10')) {
    app.setBottomBarColor?.(THEME_COLORS.background);
  }
  if (checkTelegramVersion('7.7')) {
    app.disableVerticalSwipes?.();
  }
};

// MainButton есть с 6.0. Клик сначала проходит через общее состояние: disabled/loading проверяются одинаково.
// Неактивную кнопку красим сами: часть клиентов не меняет её вид при is_active=false
const bindMainButton = (app: TelegramWebApp): void => {
  const mainButton = useMainButtonStore();
  const nativeButton = app.MainButton;
  nativeButton.onClick(mainButton.click);

  watchEffect(() => {
    const { text, visible: isVisible, disabled: isDisabled, loading: isLoading } = mainButton.state;
    if (!isVisible) {
      nativeButton.hideProgress();
      nativeButton.setParams({ is_visible: false });
      return;
    }
    nativeButton.setParams({
      text,
      color: isDisabled ? THEME_COLORS.disabled : THEME_COLORS.accent,
      text_color: isDisabled ? THEME_COLORS.disabledText : THEME_COLORS.accentText,
      is_active: !isDisabled,
      is_visible: true,
    });
    if (isLoading) {
      nativeButton.showProgress(false);
      return;
    }
    nativeButton.hideProgress();
  });
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
  bindMainButton(webApp);
  bindBackButton(webApp);
};
