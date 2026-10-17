import { onBeforeUnmount, onMounted, shallowRef } from 'vue';
import type { Ref } from 'vue';

import type { TiltOptions } from '../constants/tilt';
import { TILT_OPTIONS } from '../constants/tilt';
import { bindTiltGesture } from '../utils/tiltGesture';

/**
 * Наклон элемента пальцем или мышью (CSS 3D transform + Pointer Events).
 * При prefers-reduced-motion обработчики не вешаются и элемент остаётся статичным;
 * настройку можно переключить, не закрывая приложение.
 * `isTiltEnabled` — для класса с touch-action: none: без наклона свайп по элементу прокручивает страницу.
 */
export const usePointerTilt = (
  target: Readonly<Ref<HTMLElement | null>>,
  options: Partial<TiltOptions> = {},
) => {
  const settings = { ...TILT_OPTIONS, ...options };
  const isTiltEnabled = shallowRef(false);
  let unbind: (() => void) | null = null;
  let reducedMotion: MediaQueryList | null = null;

  const disable = (): void => {
    unbind?.();
    unbind = null;
    isTiltEnabled.value = false;
  };

  const updateTilt = (): void => {
    const element = target.value;
    if (!element || reducedMotion?.matches) {
      disable();
      return;
    }
    if (!unbind) {
      unbind = bindTiltGesture(element, settings);
      isTiltEnabled.value = true;
    }
  };

  onMounted(() => {
    if (typeof window.PointerEvent !== 'function') {
      return;
    }
    reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
    reducedMotion?.addEventListener('change', updateTilt);
    updateTilt();
  });

  onBeforeUnmount(() => {
    reducedMotion?.removeEventListener('change', updateTilt);
    disable();
  });

  return { isTiltEnabled };
};

export default usePointerTilt;
