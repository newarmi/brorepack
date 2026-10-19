import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';
import type { Ref } from 'vue';

import type { TiltOptions } from '../constants/tilt';
import { TILT_OPTIONS } from '../constants/tilt';
import { bindTiltGesture } from '../utils/tiltGesture';

/**
 * Наклон элемента пальцем или мышью (CSS 3D transform + Pointer Events).
 * При prefers-reduced-motion обработчики не вешаются и элемент остаётся статичным;
 * настройку можно переключить, не закрывая приложение.
 * `isTiltEnabled` — для класса с touch-action: none: без наклона свайп по элементу прокручивает страницу.
 * `isActive` — выключатель снаружи: например, когда вместо CSS-плашки показана 3D-версия.
 */
export const usePointerTilt = (
  target: Readonly<Ref<HTMLElement | null>>,
  options: Partial<TiltOptions> = {},
  isActive: Readonly<Ref<boolean>> = shallowRef(true),
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
    if (!element || reducedMotion?.matches || !isActive.value) {
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

  // До монтирования элемента нет — включение и так произойдёт в onMounted
  watch(isActive, () => {
    if (typeof window.PointerEvent === 'function' && target.value) {
      updateTilt();
    }
  });

  onBeforeUnmount(() => {
    reducedMotion?.removeEventListener('change', updateTilt);
    disable();
  });

  return { isTiltEnabled };
};

export default usePointerTilt;
