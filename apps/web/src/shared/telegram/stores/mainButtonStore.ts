import { reactive } from 'vue';
import { defineStore } from 'pinia';

// Общее состояние «нативной» MainButton Telegram. Его читают и настоящая
// WebApp.MainButton (внутри Telegram), и DevTelegramChrome (в браузере),
// поэтому useMainButton работает одинаково в обоих режимах.

export interface MainButtonState {
  text: string;
  visible: boolean;
  disabled: boolean;
  loading: boolean;
}

const getHiddenState = (): MainButtonState => {
  return { text: '', visible: false, disabled: false, loading: false };
};

/** Кнопка принадлежит последнему экрану, который её занял; чужие обновления игнорируются */
export const useMainButtonStore = defineStore('telegramMainButton', () => {
  const state = reactive<MainButtonState>(getHiddenState());
  let owner: symbol | null = null;
  let clickHandler: (() => void) | null = null;

  const claim = (newOwner: symbol, handler: () => void): void => {
    owner = newOwner;
    clickHandler = handler;
  };

  const update = (updateOwner: symbol, newState: MainButtonState): void => {
    if (owner === updateOwner) {
      Object.assign(state, newState);
    }
  };

  const release = (releaseOwner: symbol): void => {
    if (owner !== releaseOwner) {
      return;
    }
    owner = null;
    clickHandler = null;
    Object.assign(state, getHiddenState());
  };

  const click = (): void => {
    if (state.visible && !state.disabled && !state.loading) {
      clickHandler?.();
    }
  };

  return { state, claim, update, release, click };
});
