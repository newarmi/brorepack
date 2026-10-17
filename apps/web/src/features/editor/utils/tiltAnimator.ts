import type { TiltOptions } from '../constants/tilt';
import type { TiltAngles } from './tilt';
import { FLAT_TILT, formatTiltTransform, getFrameFactor, stepTilt } from './tilt';

/** Самый длинный учитываемый кадр: после фриза плашка не прыгает, а доезжает плавно */
const MAX_FRAME_MS = 100;

export interface TiltAnimator {
  /** Плавно повернуть к углам; кадры останавливаются сами, когда плашка доехала */
  moveTo: (angles: TiltAngles) => void;
  /** Сразу вернуть в исходное положение без анимации */
  reset: () => void;
}

/**
 * Анимирует только transform элемента, через requestAnimationFrame, без перерисовки Vue.
 * В покое transform снимается: плашка рисуется так же чётко, как без наклона.
 */
export const createTiltAnimator = (
  element: HTMLElement,
  settings: Pick<TiltOptions, 'perspective' | 'smoothing'>,
): TiltAnimator => {
  let current = FLAT_TILT;
  let goal = FLAT_TILT;
  let frameId: number | null = null;
  let lastFrameTime = 0;

  const applyTransform = (): void => {
    element.style.setProperty('transform', formatTiltTransform(current, settings.perspective));
  };

  const renderFrame = (time: number): void => {
    const deltaMs = Math.min(time - lastFrameTime, MAX_FRAME_MS);
    lastFrameTime = time;
    current = stepTilt(current, goal, getFrameFactor(settings.smoothing, deltaMs));
    applyTransform();
    const isSettled = current.x === goal.x && current.y === goal.y;
    frameId = isSettled ? null : requestAnimationFrame(renderFrame);
  };

  const moveTo = (angles: TiltAngles): void => {
    goal = angles;
    if (frameId !== null) {
      return;
    }
    lastFrameTime = performance.now();
    frameId = requestAnimationFrame(renderFrame);
  };

  const reset = (): void => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
    }
    frameId = null;
    current = FLAT_TILT;
    goal = FLAT_TILT;
    applyTransform();
  };

  return { moveTo, reset };
};
