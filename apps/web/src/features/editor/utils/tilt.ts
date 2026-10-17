import type { TiltOptions } from '../constants/tilt';

/** Наклон в градусах: x — rotateX, y — rotateY */
export interface TiltAngles {
  x: number;
  y: number;
}

export const FLAT_TILT: TiltAngles = { x: 0, y: 0 };

/** Ближе этого (в градусах) считаем, что плашка уже на месте */
const SETTLE_EPSILON = 0.01;

/**
 * Угол наклона по сдвигу пальца. tanh даёт мягкий упор: у центра плашка следует за пальцем,
 * у предела сопротивляется и никогда его не переходит.
 */
export const getTiltAngle = (shift: number, range: number, maxAngle: number): number => {
  if (range <= 0) {
    return 0;
  }
  return maxAngle * Math.tanh(shift / range);
};

/** Наклон по сдвигу пальца от точки касания. Палец вниз — верх выходит вперёд, вправо — правый край уходит назад */
export const getDragTilt = (
  shift: { x: number; y: number },
  size: { width: number; height: number },
  settings: Pick<TiltOptions, 'dragRange' | 'maxRotateX' | 'maxRotateY'>,
): TiltAngles => ({
  x: -getTiltAngle(shift.y, size.height * settings.dragRange, settings.maxRotateX),
  y: getTiltAngle(shift.x, size.width * settings.dragRange, settings.maxRotateY),
});

/**
 * Какую часть пути до цели пройти за кадр длиной `deltaMs`, чтобы скорость не зависела от частоты кадров.
 * `smoothing` — доля пути за кадр 60 fps.
 */
export const getFrameFactor = (smoothing: number, deltaMs: number): number =>
  1 - (1 - smoothing) ** (deltaMs / (1000 / 60));

/** Шаг к цели; совсем близко — сразу цель, чтобы анимация закончилась */
export const stepTilt = (current: TiltAngles, goal: TiltAngles, factor: number): TiltAngles => {
  const next = {
    x: current.x + (goal.x - current.x) * factor,
    y: current.y + (goal.y - current.y) * factor,
  };
  const isSettled =
    Math.abs(goal.x - next.x) < SETTLE_EPSILON && Math.abs(goal.y - next.y) < SETTLE_EPSILON;
  return isSettled ? { ...goal } : next;
};

/**
 * CSS transform для наклона; для ровной плашки — пустая строка.
 * Перспективу задаёт родитель (CSS perspective): так у вложенных 3D-деталей общая камера
 */
export const formatTiltTransform = (angles: TiltAngles): string => {
  if (angles.x === 0 && angles.y === 0) {
    return '';
  }
  return `rotateX(${angles.x.toFixed(2)}deg) rotateY(${angles.y.toFixed(2)}deg)`;
};
