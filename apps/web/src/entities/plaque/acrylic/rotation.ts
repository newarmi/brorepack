import type { RotationSettings } from './config';

// Чистая физика поворота: без DOM и Three.js, поэтому покрыта тестами.
// Углы — в градусах; x — наклон вперёд-назад, y — поворот влево-вправо (как rotation в Three.js)

export interface RotationState {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  /** Сколько секунд плашку никто не трогает */
  idleSeconds: number;
  /** Сколько длится покачивание; 0 — его нет */
  swaySeconds: number;
}

export const REST_ROTATION: RotationState = {
  x: 0,
  y: 0,
  velocityX: 0,
  velocityY: 0,
  idleSeconds: 0,
  swaySeconds: 0,
};

/** Ближе этого (градусы и градусы в секунду) считаем, что плашка остановилась */
const SETTLE_EPSILON = 0.01;

/** За сколько секунд покачивание набирает полный размах — без рывка из покоя */
const SWAY_RAMP_SECONDS = 1.5;

/** Мягкий упор при перетаскивании: у центра плашка идёт за пальцем, у предела сопротивляется */
export const softLimit = (angle: number, limit: number): number => {
  return limit * Math.tanh(angle / limit);
};

/** Обратная к softLimit: из какого «сырого» угла получился текущий. Нужна, чтобы при касании плашка не дёргалась */
const unsoftLimit = (angle: number, limit: number): number => {
  const ratio = Math.min(Math.max(angle / limit, -0.999), 0.999);
  return limit * Math.atanh(ratio);
};

/**
 * Плашка поворачивается вслед за пальцем, как будто её толкают: палец вправо — правый край уходит назад,
 * палец вниз — верх выходит вперёд. Так же наклоняется CSS-версия (getDragTilt)
 */
export const getDragRotation = (
  start: { x: number; y: number },
  shift: { x: number; y: number },
  settings: RotationSettings,
): { x: number; y: number } => ({
  x: softLimit(
    unsoftLimit(start.x, settings.maxDegreesX) + shift.y * settings.degreesPerPixel,
    settings.maxDegreesX,
  ),
  y: softLimit(
    unsoftLimit(start.y, settings.maxDegreesY) + shift.x * settings.degreesPerPixel,
    settings.maxDegreesY,
  ),
});

/** Куда тянет пружина: в покой или к точке покачивания */
export const getSwayTarget = (
  swaySeconds: number,
  settings: RotationSettings,
): { x: number; y: number } => {
  if (swaySeconds <= 0) {
    return { x: 0, y: 0 };
  }
  const ramp = Math.min(1, swaySeconds / SWAY_RAMP_SECONDS);
  const phase = (swaySeconds / settings.swayPeriodSeconds) * Math.PI * 2;
  return {
    x: Math.sin(phase * 0.7) * settings.swayDegreesX * ramp,
    y: Math.sin(phase) * settings.swayDegreesY * ramp,
  };
};

/** Сила, возвращающая за предел: пружина в разы жёстче обычной */
const getLimitOvershoot = (angle: number, limit: number): number => {
  return Math.sign(angle) * Math.max(0, Math.abs(angle) - limit);
};

interface AxisStep {
  angle: number;
  velocity: number;
  target: number;
  limit: number;
}

/** Затухающая пружина на одной оси: инерция после отпускания и мягкий возврат */
const stepAxis = (axis: AxisStep, deltaSeconds: number, settings: RotationSettings): AxisStep => {
  const acceleration =
    -settings.stiffness * (axis.angle - axis.target) -
    settings.limitStiffness * getLimitOvershoot(axis.angle, axis.limit);
  const velocity = (axis.velocity + acceleration * deltaSeconds) * settings.friction ** deltaSeconds;
  return { ...axis, velocity, angle: axis.angle + velocity * deltaSeconds };
};

export interface RotationStep {
  deltaSeconds: number;
  /** false при prefers-reduced-motion: плашка просто возвращается в покой */
  isSwayEnabled: boolean;
}

/** Шаг свободного движения (палец не касается плашки) */
export const stepRotation = (
  state: RotationState,
  step: RotationStep,
  settings: RotationSettings,
): RotationState => {
  const { deltaSeconds, isSwayEnabled } = step;
  const idleSeconds = state.idleSeconds + deltaSeconds;
  const isSwaying = isSwayEnabled && idleSeconds > settings.idleDelaySeconds;
  const swaySeconds = isSwaying ? state.swaySeconds + deltaSeconds : 0;
  const target = getSwayTarget(swaySeconds, settings);
  const axisX = stepAxis(
    { angle: state.x, velocity: state.velocityX, target: target.x, limit: settings.maxDegreesX },
    deltaSeconds,
    settings,
  );
  const axisY = stepAxis(
    { angle: state.y, velocity: state.velocityY, target: target.y, limit: settings.maxDegreesY },
    deltaSeconds,
    settings,
  );
  return {
    x: axisX.angle,
    y: axisY.angle,
    velocityX: axisX.velocity,
    velocityY: axisY.velocity,
    idleSeconds,
    swaySeconds,
  };
};

/** Плашка в покое и не покачивается — кадры можно не рисовать */
export const checkRotationSettled = (state: RotationState): boolean => {
  return (
    state.swaySeconds === 0 &&
    Math.abs(state.x) < SETTLE_EPSILON &&
    Math.abs(state.y) < SETTLE_EPSILON &&
    Math.abs(state.velocityX) < SETTLE_EPSILON &&
    Math.abs(state.velocityY) < SETTLE_EPSILON
  );
};
