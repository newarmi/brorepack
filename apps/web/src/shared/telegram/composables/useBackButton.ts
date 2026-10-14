import type { MaybeRefOrGetter, WatchStopHandle } from 'vue';
import { onBeforeUnmount, onMounted, toValue, watch } from 'vue';

import { useBackButtonStore } from '../stores/backButtonStore';

/**
 * Перехватывает нажатие «Назад» (нативная BackButton или «‹ Назад» в dev-шапке),
 * пока экран смонтирован и `enabled` = true. Например, закрывает шторку вместо перехода.
 * По умолчанию «Назад» ведёт по истории — см. app/router/goBack.ts.
 */
export const useBackButton = (
  handler: () => void,
  enabled: MaybeRefOrGetter<boolean> = true,
): void => {
  const backButton = useBackButtonStore();
  const owner = Symbol('back-button');
  let stopWatch: WatchStopHandle | null = null;

  const toggleHandler = (isEnabled: boolean): void => {
    if (isEnabled) {
      backButton.pushHandler(owner, handler);
      return;
    }
    backButton.removeHandler(owner);
  };

  onMounted(() => {
    stopWatch = watch(() => toValue(enabled), toggleHandler, { immediate: true });
  });

  onBeforeUnmount(() => {
    stopWatch?.();
    backButton.removeHandler(owner);
  });
};

export default useBackButton;
