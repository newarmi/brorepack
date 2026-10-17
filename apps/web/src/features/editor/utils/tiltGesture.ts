import type { TiltOptions } from '../constants/tilt';
import { FLAT_TILT, getDragTilt } from './tilt';
import { createTiltAnimator } from './tiltAnimator';

/**
 * Вешает на элемент наклон пальцем или мышью через Pointer Events.
 * Слушает только первое касание; после отпускания элемент плавно возвращается.
 * Возвращает функцию, которая снимает обработчики и выпрямляет элемент.
 */
export const bindTiltGesture = (element: HTMLElement, settings: TiltOptions): (() => void) => {
  const animator = createTiltAnimator(element, settings);
  let activePointerId: number | null = null;
  let startX = 0;
  let startY = 0;

  const pointerDownHandler = (event: PointerEvent): void => {
    // Второй палец и правая кнопка мыши не перехватывают жест
    if (activePointerId !== null || !event.isPrimary || event.button !== 0) {
      return;
    }
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    // Захват: палец может уйти за край плашки, а жест продолжится
    element.setPointerCapture(event.pointerId);
  };

  const pointerMoveHandler = (event: PointerEvent): void => {
    if (event.pointerId !== activePointerId) {
      return;
    }
    // offsetWidth/offsetHeight не меняются от transform, поэтому наклон не влияет на расчёт
    const shift = { x: event.clientX - startX, y: event.clientY - startY };
    const size = { width: element.offsetWidth, height: element.offsetHeight };
    animator.moveTo(getDragTilt(shift, size, settings));
  };

  // up, cancel и потеря захвата (системный жест, сворачивание приложения) завершают жест одинаково.
  // После pointerup захват браузер снимает сам; lostpointercapture после этого уже не совпадёт по id
  const pointerEndHandler = (event: PointerEvent): void => {
    if (event.pointerId !== activePointerId) {
      return;
    }
    activePointerId = null;
    animator.moveTo(FLAT_TILT);
  };

  element.addEventListener('pointerdown', pointerDownHandler);
  element.addEventListener('pointermove', pointerMoveHandler);
  element.addEventListener('pointerup', pointerEndHandler);
  element.addEventListener('pointercancel', pointerEndHandler);
  element.addEventListener('lostpointercapture', pointerEndHandler);

  return () => {
    element.removeEventListener('pointerdown', pointerDownHandler);
    element.removeEventListener('pointermove', pointerMoveHandler);
    element.removeEventListener('pointerup', pointerEndHandler);
    element.removeEventListener('pointercancel', pointerEndHandler);
    element.removeEventListener('lostpointercapture', pointerEndHandler);
    animator.reset();
  };
};
