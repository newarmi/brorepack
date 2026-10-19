import type { RotationSettings } from './config';
import { ROTATION } from './config';
import type { RotationState } from './rotation';
import { checkRotationSettled, getDragRotation, REST_ROTATION, stepRotation } from './rotation';

export interface RotationFrame {
  x: number;
  y: number;
  /** Плашка двигается или её держат — нужен кадр */
  isMoving: boolean;
  isDragging: boolean;
}

export interface RotationControl {
  update: (deltaSeconds: number) => RotationFrame;
  dispose: () => void;
}

interface PointerSample {
  x: number;
  y: number;
  /** event.timeStamp, мс */
  time: number;
}

/** Если палец замер дольше этого перед отпусканием — бросок без инерции */
const RELEASE_PAUSE_MS = 80;

/** Доля новой скорости при сглаживании: одно резкое событие не превращается в бросок */
const VELOCITY_SMOOTHING = 0.8;

const smoothVelocity = (previous: number, angleShift: number, deltaSeconds: number): number => {
  return (angleShift / deltaSeconds) * VELOCITY_SMOOTHING + previous * (1 - VELOCITY_SMOOTHING);
};

/**
 * Состояние жеста без DOM: начало, движение, отпускание и шаг кадра.
 * isReducedMotion — функция, потому что настройку можно переключить, не закрывая приложение
 */
const createRotationController = (settings: RotationSettings, isReducedMotion: () => boolean) => {
  let state: RotationState = { ...REST_ROTATION };
  let isDragging = false;
  let startPoint = { x: 0, y: 0 };
  let startAngles = { x: 0, y: 0 };
  let lastMoveTime = 0;

  const start = (sample: PointerSample): void => {
    isDragging = true;
    startPoint = { x: sample.x, y: sample.y };
    startAngles = { x: state.x, y: state.y };
    lastMoveTime = sample.time;
    state = { ...state, velocityX: 0, velocityY: 0, idleSeconds: 0, swaySeconds: 0 };
  };

  const move = (sample: PointerSample): void => {
    const shift = { x: sample.x - startPoint.x, y: sample.y - startPoint.y };
    const next = getDragRotation(startAngles, shift, settings);
    const deltaSeconds = (sample.time - lastMoveTime) / 1000;
    lastMoveTime = sample.time;
    if (deltaSeconds <= 0) {
      state = { ...state, ...next };
      return;
    }
    state = {
      ...state,
      ...next,
      velocityX: smoothVelocity(state.velocityX, next.x - state.x, deltaSeconds),
      velocityY: smoothVelocity(state.velocityY, next.y - state.y, deltaSeconds),
    };
  };

  const end = (time: number): void => {
    isDragging = false;
    const isThrown = time - lastMoveTime < RELEASE_PAUSE_MS && !isReducedMotion();
    if (!isThrown) {
      state = { ...state, velocityX: 0, velocityY: 0 };
    }
  };

  const update = (deltaSeconds: number): RotationFrame => {
    if (isDragging) {
      return { x: state.x, y: state.y, isMoving: true, isDragging: true };
    }
    state = stepRotation(state, { deltaSeconds, isSwayEnabled: !isReducedMotion() }, settings);
    const isSettled = checkRotationSettled(state);
    if (isSettled) {
      state = { ...REST_ROTATION, idleSeconds: state.idleSeconds };
    }
    return { x: state.x, y: state.y, isMoving: !isSettled, isDragging: false };
  };

  return { start, move, end, update };
};

/**
 * Поворот плашки пальцем или мышью (Pointer Events): инерция после отпускания,
 * пружина обратно и покачивание в простое. При prefers-reduced-motion — только поворот за пальцем
 */
export const bindRotation = (
  element: HTMLElement,
  settings: RotationSettings = ROTATION,
): RotationControl => {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
  const controller = createRotationController(settings, () => reducedMotion?.matches ?? false);
  let activePointerId: number | null = null;

  const pointerDownHandler = (event: PointerEvent): void => {
    // Второй палец и правая кнопка мыши не перехватывают жест
    if (activePointerId !== null || !event.isPrimary || event.button !== 0) {
      return;
    }
    // Иначе Safari и Telegram Desktop начинают выделять текст под плашкой
    event.preventDefault();
    activePointerId = event.pointerId;
    controller.start({ x: event.clientX, y: event.clientY, time: event.timeStamp });
    // Захват: палец может уйти за край холста, а жест продолжится
    element.setPointerCapture(event.pointerId);
  };

  const pointerMoveHandler = (event: PointerEvent): void => {
    if (event.pointerId === activePointerId) {
      controller.move({ x: event.clientX, y: event.clientY, time: event.timeStamp });
    }
  };

  // up, cancel и потеря захвата (системный жест, сворачивание приложения) завершают жест одинаково
  const pointerEndHandler = (event: PointerEvent): void => {
    if (event.pointerId === activePointerId) {
      activePointerId = null;
      controller.end(event.timeStamp);
    }
  };

  element.addEventListener('pointerdown', pointerDownHandler);
  element.addEventListener('pointermove', pointerMoveHandler);
  element.addEventListener('pointerup', pointerEndHandler);
  element.addEventListener('pointercancel', pointerEndHandler);
  element.addEventListener('lostpointercapture', pointerEndHandler);

  const dispose = (): void => {
    element.removeEventListener('pointerdown', pointerDownHandler);
    element.removeEventListener('pointermove', pointerMoveHandler);
    element.removeEventListener('pointerup', pointerEndHandler);
    element.removeEventListener('pointercancel', pointerEndHandler);
    element.removeEventListener('lostpointercapture', pointerEndHandler);
  };

  return { update: controller.update, dispose };
};
