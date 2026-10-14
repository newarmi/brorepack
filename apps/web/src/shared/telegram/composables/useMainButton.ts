import { computed, onBeforeUnmount, onMounted, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, WatchStopHandle } from 'vue';

import type { MainButtonState } from '../stores/mainButtonStore';
import { useMainButtonStore } from '../stores/mainButtonStore';

export interface UseMainButtonOptions {
  text: MaybeRefOrGetter<string>;
  visible?: MaybeRefOrGetter<boolean>;
  disabled?: MaybeRefOrGetter<boolean>;
  loading?: MaybeRefOrGetter<boolean>;
  onClick: () => void;
}

/**
 * Главная кнопка экрана. Внутри Telegram — нативная WebApp.MainButton,
 * в браузере — её имитация в DevTelegramChrome. Кнопка принадлежит
 * последнему смонтированному экрану и прячется при его размонтировании.
 */
export const useMainButton = (options: UseMainButtonOptions): void => {
  const mainButton = useMainButtonStore();
  const owner = Symbol('main-button');

  const state = computed<MainButtonState>(() => {
    const text = toValue(options.text);
    return {
      text,
      visible: (toValue(options.visible) ?? true) && text.length > 0,
      disabled: toValue(options.disabled) ?? false,
      loading: toValue(options.loading) ?? false,
    };
  });

  let stopWatch: WatchStopHandle | null = null;

  onMounted(() => {
    mainButton.claim(owner, options.onClick);
    stopWatch = watch(state, (value) => mainButton.update(owner, value), {
      immediate: true,
    });
  });

  onBeforeUnmount(() => {
    stopWatch?.();
    mainButton.release(owner);
  });
};

export default useMainButton;
