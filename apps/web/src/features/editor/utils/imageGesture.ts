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

type PointerHandler = (event: PointerEvent) => void;

interface GestureHandlers {
  down: PointerHandler;
  move: PointerHandler;
  end: PointerHandler;
  wheel: (event: WheelEvent) => void;
}

/**
 * up, cancel и потеря захвата (системный жест, сворачивание приложения) завершают касание одинаково.
 * wheel — не passive, иначе preventDefault не остановит прокрутку
 */
const listenGesture = (element: HTMLElement, handlers: GestureHandlers): (() => void) => {
  element.addEventListener('pointerdown', handlers.down);
  element.addEventListener('pointermove', handlers.move);
  element.addEventListener('pointerup', handlers.end);
  element.addEventListener('pointercancel', handlers.end);
  element.addEventListener('lostpointercapture', handlers.end);
  element.addEventListener('wheel', handlers.wheel, { passive: false });
  return () => {
    element.removeEventListener('pointerdown', handlers.down);
    element.removeEventListener('pointermove', handlers.move);
    element.removeEventListener('pointerup', handlers.end);
    element.removeEventListener('pointercancel', handlers.end);
    element.removeEventListener('lostpointercapture', handlers.end);
    element.removeEventListener('wheel', handlers.wheel);
  };
};

/**
 * Двигает картинку клиента по плашке через Pointer Events: мышь или один палец — сдвиг,
 * два пальца — ещё масштаб и поворот, колесо мыши — масштаб вокруг курсора.
 * Возвращает функцию, которая снимает обработчики
 */
export const bindImageGesture = (
  element: HTMLElement,
  options: ImageGestureOptions,
): (() => void) => {
  const pointers = new Map<number, Point>();
  // Положение картинки и пальцев в начале жеста: шаг считается от них, а не накапливается по кадрам
  let startTransform: PlaqueImageTransform | null = null;
  let startPoints: Point[] = [];
  let frameId = 0;

  // Палец добавился или убрался — новый отсчёт, иначе картинка прыгнет
  const restartGesture = (): void => {
    startTransform = pointers.size > 0 ? options.getTransform() : null;
    startPoints = [...pointers.values()].slice(0, 2);
  };

  // Не чаще кадра: каждое изменение перерисовывает SVG плашки
  const applyPointers = (): void => {
    frameId = 0;
    if (startTransform) {
      const points = [...pointers.values()].slice(0, 2);
      options.onChange(applyGestureStep(startTransform, getPointersStep(startPoints, points)));
    }
  };

  const pointerDownHandler = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    // WebKit иначе начинает выделение текста или перетаскивание картинки мышью
    event.preventDefault();
    // Захват: палец может уйти за край плашки, а жест продолжится
    element.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, toPlaquePoint(options.frame, event));
    restartGesture();
  };

  const pointerMoveHandler = (event: PointerEvent): void => {
    if (pointers.has(event.pointerId)) {
      pointers.set(event.pointerId, toPlaquePoint(options.frame, event));
      frameId ||= requestAnimationFrame(applyPointers);
    }
  };

  const pointerEndHandler = (event: PointerEvent): void => {
    if (pointers.delete(event.pointerId)) {
      restartGesture();
    }
  };

  const unlisten = listenGesture(element, {
    down: pointerDownHandler,
    move: pointerMoveHandler,
    end: pointerEndHandler,
    wheel: createWheelHandler(options),
  });

  return () => {
    cancelAnimationFrame(frameId);
    unlisten();
  };
};
