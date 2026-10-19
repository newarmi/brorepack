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

/** Временная диагностика: что происходит внутри жеста на телефоне (показывает GestureProbe) */
export const gestureCounters: Record<string, number> = {};

export const countGesture = (name: string): void => {
  gestureCounters[name] = (gestureCounters[name] ?? 0) + 1;
};

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
 * iOS (Safari и Telegram) на экране поверх страницы может забрать палец под прокрутку или «резиновый»
 * отскок, несмотря на touch-action: none, — тогда приходит pointercancel и картинка не двигается.
 * Отмена touchmove надёжно оставляет жест нам.
 * Отмены одного touchmove мало: в Telegram на iPhone веб-вью решает «это прокрутка» уже на первом
 * сдвиге пальца и обрывает касание через ~80 мс (замер на устройстве). Отменённый touchstart
 * сразу говорит WebKit, что касание наше, и прокрутка не начинается
 */
const preventTouchScroll = (event: TouchEvent): void => {
  event.preventDefault();
};

/**
 * Касание начинается на сцене, а движение и отпускание слушаются на window: палец может уйти за край
 * сцены, а жест продолжится. Захват пальца (setPointerCapture) не используем — Telegram на iPhone
 * снимает его через ~30 мс после начала движения (lostpointercapture, замер на устройстве),
 * и картинка вставала, хотя палец ещё двигался.
 * wheel, touchstart и touchmove — не passive, иначе preventDefault не остановит прокрутку
 */
const listenGesture = (element: HTMLElement, handlers: GestureHandlers): (() => void) => {
  element.addEventListener('touchstart', preventTouchScroll, { passive: false });
  element.addEventListener('touchmove', preventTouchScroll, { passive: false });
  element.addEventListener('pointerdown', handlers.down);
  element.addEventListener('wheel', handlers.wheel, { passive: false });
  window.addEventListener('pointermove', handlers.move);
  window.addEventListener('pointerup', handlers.end);
  window.addEventListener('pointercancel', handlers.end);
  return () => {
    element.removeEventListener('touchstart', preventTouchScroll);
    element.removeEventListener('touchmove', preventTouchScroll);
    element.removeEventListener('pointerdown', handlers.down);
    element.removeEventListener('wheel', handlers.wheel);
    window.removeEventListener('pointermove', handlers.move);
    window.removeEventListener('pointerup', handlers.end);
    window.removeEventListener('pointercancel', handlers.end);
  };
};

/** Первый палец нового касания сбрасывает прежние: если отпускание прошлого потерялось, он не помешает */
const addPointer = (
  pointers: Map<number, Point>,
  event: PointerEvent,
  frame: HTMLElement,
): void => {
  countGesture('down');
  if (event.isPrimary) {
    pointers.clear();
  }
  pointers.set(event.pointerId, toPlaquePoint(frame, event));
};

/** Новое положение пальца, если он участвует в жесте; false — чужой палец */
const updatePointer = (
  pointers: Map<number, Point>,
  event: PointerEvent,
  frame: HTMLElement,
): boolean => {
  const isTracked = pointers.has(event.pointerId);
  countGesture(isTracked ? 'move' : 'ignored');
  if (isTracked) {
    pointers.set(event.pointerId, toPlaquePoint(frame, event));
  }
  return isTracked;
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
    countGesture(startTransform ? 'apply' : 'applyIdle');
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
    addPointer(pointers, event, options.frame);
    restartGesture();
  };

  const pointerMoveHandler = (event: PointerEvent): void => {
    if (updatePointer(pointers, event, options.frame)) {
      frameId ||= requestAnimationFrame(applyPointers);
    }
  };

  const pointerEndHandler = (event: PointerEvent): void => {
    countGesture(`end:${event.type}`);
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
