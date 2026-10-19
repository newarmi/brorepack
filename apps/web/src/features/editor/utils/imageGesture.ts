import type { PlaqueImageTransform } from '@brorepack/shared';
import { PLAQUE_VIEWBOX } from '@brorepack/shared';

import { IMAGE_LIMITS } from '../constants/image';
import type { Point } from './imageTransform';
import { applyGestureStep, EMPTY_STEP, getPointersStep } from './imageTransform';

export interface ImageGestureOptions {
  /** Рамка плашки: по ней экранные точки переводятся в пункты. Жест слушается на всей области вокруг */
  frame: HTMLElement;
  getTransform: () => PlaqueImageTransform;
  onChange: (transform: PlaqueImageTransform) => void;
}

/** Экранная точка → пункты листа */
const toPlaquePoint = (frame: HTMLElement, event: MouseEvent): Point => {
  const rect = frame.getBoundingClientRect();
  const ratio = PLAQUE_VIEWBOX.width / rect.width;
  return { x: (event.clientX - rect.left) * ratio, y: (event.clientY - rect.top) * ratio };
};

/** Колесо мыши масштабирует картинку вокруг курсора, а не прокручивает страницу */
const createWheelHandler = (options: ImageGestureOptions) => {
  return (event: WheelEvent): void => {
    event.preventDefault();
    const zoom = IMAGE_LIMITS.wheelZoomStep ** (-event.deltaY / 100);
    const step = { ...EMPTY_STEP, pivot: toPlaquePoint(options.frame, event), zoom };
    options.onChange(applyGestureStep(options.getTransform(), step));
  };
};

/**
 * Двигает картинку клиента по плашке через Pointer Events — одинаково мышью, пальцем и пером:
 * один палец или курсор — сдвиг, два пальца — ещё масштаб и поворот, колесо мыши — масштаб вокруг курсора.
 * wheel — не passive, иначе preventDefault не остановит прокрутку.
 * Возвращает функцию, которая снимает обработчики
 */
export const bindImageGesture = (
  element: HTMLElement,
  options: ImageGestureOptions,
): (() => void) => {
  const pointers = new Map<number, Point>();
  // Положение картинки и пальцев в начале жеста: шаг считается от них, а не накапливается по событиям
  let startTransform: PlaqueImageTransform | null = null;
  let startPoints: Point[] = [];

  // Палец добавился или убрался — новый отсчёт, иначе картинка прыгнет
  const restartGesture = (): void => {
    startTransform = pointers.size > 0 ? options.getTransform() : null;
    startPoints = [...pointers.values()].slice(0, 2);
  };

  const pointerDownHandler = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    // WebKit иначе начинает выделение текста или перетаскивание картинки мышью
    event.preventDefault();
    // Захват: палец может уйти за край сцены, а его события всё равно придут сюда
    element.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, toPlaquePoint(options.frame, event));
    restartGesture();
  };

  // Сразу, без requestAnimationFrame: картинка двигается CSS-трансформацией, а браузер и так
  // присылает pointermove примерно раз в кадр
  const pointerMoveHandler = (event: PointerEvent): void => {
    if (startTransform && pointers.has(event.pointerId)) {
      pointers.set(event.pointerId, toPlaquePoint(options.frame, event));
      const points = [...pointers.values()].slice(0, 2);
      options.onChange(applyGestureStep(startTransform, getPointersStep(startPoints, points)));
    }
  };

  // up и cancel (системный жест, сворачивание приложения) завершают касание одинаково
  const pointerEndHandler = (event: PointerEvent): void => {
    if (pointers.delete(event.pointerId)) {
      restartGesture();
    }
  };

  const wheelHandler = createWheelHandler(options);

  element.addEventListener('pointerdown', pointerDownHandler);
  element.addEventListener('pointermove', pointerMoveHandler);
  element.addEventListener('pointerup', pointerEndHandler);
  element.addEventListener('pointercancel', pointerEndHandler);
  element.addEventListener('wheel', wheelHandler, { passive: false });

  return () => {
    element.removeEventListener('pointerdown', pointerDownHandler);
    element.removeEventListener('pointermove', pointerMoveHandler);
    element.removeEventListener('pointerup', pointerEndHandler);
    element.removeEventListener('pointercancel', pointerEndHandler);
    element.removeEventListener('wheel', wheelHandler);
  };
};
