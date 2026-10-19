import { computed, shallowRef } from 'vue';
import type { Ref } from 'vue';

import { usePointerTilt } from './usePointerTilt';

/**
 * 3D-плашка из акрила поверх CSS-версии (AcrylicPlaque3D из entities/plaque).
 * CSS-версия рисуется сразу и наклоняется пальцем, пока 3D не готово; если 3D недоступно
 * или потерян GPU-контекст — она остаётся, и пользователь ничего не теряет
 */
export const useAcrylicPreview = (product: Readonly<Ref<HTMLElement | null>>) => {
  const is3dReady = shallowRef(false);
  const is3dFailed = shallowRef(false);
  // Наклон CSS-плашки нужен, только пока она видна: 3D-версия вращается сама
  const isTiltActive = computed(() => !is3dReady.value);
  const { isTiltEnabled } = usePointerTilt(product, {}, isTiltActive);

  const acrylicReadyHandler = (): void => {
    is3dReady.value = true;
  };

  const acrylicFailHandler = (): void => {
    is3dFailed.value = true;
    is3dReady.value = false;
  };

  return { isTiltEnabled, is3dReady, is3dFailed, acrylicReadyHandler, acrylicFailHandler };
};

export default useAcrylicPreview;
