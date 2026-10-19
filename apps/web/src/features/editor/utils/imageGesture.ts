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

type ScreenPoint = Pick<MouseEvent, 'clientX' | 'clientY'>;

/** Экранная точка (курсор или палец) → пункты листа */
const toPlaquePoint = (frame: HTMLElement, point: ScreenPoint): Point => {
  const rect = frame.getBoundingClientRect();
  const ratio = PLAQUE_VIEWBOX.width / rect.width;
  return { x: (point.clientX - rect.left) * ratio, y: (point.clientY - rect.top) * ratio };
};

/**
 * Пальцы и курсор, которые сейчас двигают картинку. Шаг считается от положения картинки и пальцев
 * в начале жеста, а не накапливается по событиям
 */
const createGesture = (options: ImageGestureOptions) => {
  const pointers = new Map<number, Point>();
  let startTransform: PlaqueImageTransform | null = null;
  let startPoints: Point[] = [];

  // Палец добавился или убрался — новый отсчёт, иначе картинка прыгнет
  const restart = (): void => {
    startTransform = pointers.size > 0 ? options.getTransform() : null;
    startPoints = [...pointers.values()].slice(0, 2);
  };

  // Было «не чаще кадра: каждое изменение перерисовывает SVG плашки».
  // Теперь картинка двигается CSS-трансформацией, а WebKit и так присылает движение не чаще кадра, — поэтому
  // сразу в обработчике, без requestAnimationFrame: в Telegram на iPhone отложенный кадр мог не дождаться
  // следующего движения, и картинка стояла
  const apply = (): void => {
    countGesture(startTransform ? 'apply' : 'applyIdle');
    if (startTransform) {
      const points = [...pointers.values()].slice(0, 2);
      options.onChange(applyGestureStep(startTransform, getPointersStep(startPoints, points)));
    }
  };

  return { pointers, restart, apply };
};

type Gesture = ReturnType<typeof createGesture>;

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
 * iOS (Safari и Telegram) на экране поверх страницы может забрать палец под прокрутку или «резиновый»
 * отскок, несмотря на touch-action: none, — тогда приходит pointercancel и картинка не двигается.
 * Отмена touchmove надёжно оставляет жест нам.
 * Отмены одного touchmove мало: в Telegram на iPhone веб-вью решает «это прокрутка» уже на первом
 * сдвиге пальца и обрывает касание через ~80 мс (замер на устройстве). Отменённый touchstart
 * сразу говорит WebKit, что касание наше, и прокрутка не начинается.
 *
 * Пальцы — через Touch Events на самой сцене. Касание всегда приходит туда, где началось, даже если палец
 * ушёл за край, поэтому захват и слушатели на window не нужны. Захват пальца (setPointerCapture)
 * не используем — Telegram на iPhone снимает его через ~30 мс после начала движения (lostpointercapture,
 * замер на устройстве), и картинка вставала, хотя палец ещё двигался. Без захвата Pointer Events для пальца
 * в Telegram на iPhone всё равно двигали картинку только в первые ~30 мс касания, в Safari такого нет
 */
const createTouchHandlers = (gesture: Gesture, frame: HTMLElement) => {
  const start = (event: TouchEvent): void => {
    event.preventDefault();
    countGesture('touchstart');
    // Первый палец нового касания сбрасывает прежние: если отпускание прошлого потерялось, он не помешает
    if (event.touches.length === event.changedTouches.length) {
      gesture.pointers.clear();
    }
    Array.from(event.changedTouches).forEach((touch) => {
      gesture.pointers.set(touch.identifier, toPlaquePoint(frame, touch));
    });
    gesture.restart();
  };

  const move = (event: TouchEvent): void => {
    event.preventDefault();
    countGesture('touchmove');
    const touches = Array.from(event.changedTouches).filter((touch) =>
      gesture.pointers.has(touch.identifier),
    );
    touches.forEach((touch) => {
      gesture.pointers.set(touch.identifier, toPlaquePoint(frame, touch));
    });
    if (touches.length > 0) {
      gesture.apply();
    }
  };

  const end = (event: TouchEvent): void => {
    countGesture(`end:${event.type}`);
    const removed = Array.from(event.changedTouches).filter((touch) =>
      gesture.pointers.delete(touch.identifier),
    );
    if (removed.length > 0) {
      gesture.restart();
    }
  };

  return { start, move, end };
};

/**
 * Мышь и перо — через Pointer Events: нажатие на сцене, движение и отпускание на window,
 * чтобы курсор мог уйти за край сцены. Пальцы здесь пропускаем — их ведут Touch Events
 */
const createPointerHandlers = (gesture: Gesture, frame: HTMLElement) => {
  const down = (event: PointerEvent): void => {
    if (event.pointerType === 'touch' || event.button !== 0) {
      return;
    }
    // WebKit иначе начинает выделение текста или перетаскивание картинки мышью
    event.preventDefault();
    gesture.pointers.clear();
    gesture.pointers.set(event.pointerId, toPlaquePoint(frame, event));
    gesture.restart();
  };

  const move = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch' && gesture.pointers.has(event.pointerId)) {
      gesture.pointers.set(event.pointerId, toPlaquePoint(frame, event));
      gesture.apply();
    }
  };

  const end = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch' && gesture.pointers.delete(event.pointerId)) {
      gesture.restart();
    }
  };

  return { down, move, end };
};

/**
 * Двигает картинку клиента по плашке: мышь или один палец — сдвиг,
 * два пальца — ещё масштаб и поворот, колесо мыши — масштаб вокруг курсора.
 * touchstart, touchmove и wheel — не passive, иначе preventDefault не остановит прокрутку.
 * Возвращает функцию, которая снимает обработчики
 */
export const bindImageGesture = (
  element: HTMLElement,
  options: ImageGestureOptions,
): (() => void) => {
  const gesture = createGesture(options);
  const touch = createTouchHandlers(gesture, options.frame);
  const pointer = createPointerHandlers(gesture, options.frame);
  const wheel = createWheelHandler(options);

  element.addEventListener('touchstart', touch.start, { passive: false });
  element.addEventListener('touchmove', touch.move, { passive: false });
  element.addEventListener('touchend', touch.end);
  element.addEventListener('touchcancel', touch.end);
  element.addEventListener('pointerdown', pointer.down);
  element.addEventListener('wheel', wheel, { passive: false });
  window.addEventListener('pointermove', pointer.move);
  window.addEventListener('pointerup', pointer.end);
  window.addEventListener('pointercancel', pointer.end);

  return () => {
    element.removeEventListener('touchstart', touch.start);
    element.removeEventListener('touchmove', touch.move);
    element.removeEventListener('touchend', touch.end);
    element.removeEventListener('touchcancel', touch.end);
    element.removeEventListener('pointerdown', pointer.down);
    element.removeEventListener('wheel', wheel);
    window.removeEventListener('pointermove', pointer.move);
    window.removeEventListener('pointerup', pointer.end);
    window.removeEventListener('pointercancel', pointer.end);
  };
};
