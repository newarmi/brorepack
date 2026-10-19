import { describe, expect, it } from 'vitest';

import { ROTATION } from './config';
import type { RotationState } from './rotation';
import {
  checkRotationSettled,
  getDragRotation,
  getSwayTarget,
  REST_ROTATION,
  stepRotation,
} from './rotation';

const FRAME = 1 / 60;

const run = (state: RotationState, seconds: number, isSwayEnabled = false): RotationState => {
  let next = state;
  for (let time = 0; time < seconds; time += FRAME) {
    next = stepRotation(next, { deltaSeconds: FRAME, isSwayEnabled }, ROTATION);
  }
  return next;
};

describe('rotation', () => {
  it('turns after the finger and never exceeds the limits', () => {
    // Вправо — правый край уходит назад (rotation.y > 0), вниз — верх выходит вперёд (rotation.x > 0)
    const right = getDragRotation({ x: 0, y: 0 }, { x: 40, y: 0 }, ROTATION);
    expect(right.y).toBeGreaterThan(0);
    const down = getDragRotation({ x: 0, y: 0 }, { x: 0, y: 40 }, ROTATION);
    expect(down.x).toBeGreaterThan(0);
    const far = getDragRotation({ x: 0, y: 0 }, { x: 10_000, y: -10_000 }, ROTATION);
    expect(Math.abs(far.y)).toBeLessThanOrEqual(ROTATION.maxDegreesY);
    expect(Math.abs(far.x)).toBeLessThanOrEqual(ROTATION.maxDegreesX);
  });

  it('continues from the current angle without a jump', () => {
    const start = { x: 8, y: -20 };
    const same = getDragRotation(start, { x: 0, y: 0 }, ROTATION);
    expect(same.x).toBeCloseTo(start.x, 6);
    expect(same.y).toBeCloseTo(start.y, 6);
  });

  it('keeps moving after a throw and then springs back to rest', () => {
    const thrown = { ...REST_ROTATION, y: 10, velocityY: 120 };
    const soon = run(thrown, 0.05);
    expect(soon.y).toBeGreaterThan(thrown.y);
    const later = run(thrown, 3);
    expect(Math.abs(later.y)).toBeLessThan(0.05);
  });

  it('pushes back beyond the limit', () => {
    const overshoot = { ...REST_ROTATION, y: ROTATION.maxDegreesY + 10 };
    const next = run(overshoot, 0.2);
    expect(next.y).toBeLessThan(ROTATION.maxDegreesY);
  });

  it('starts swaying only after the idle delay', () => {
    const idle = run(REST_ROTATION, ROTATION.idleDelaySeconds - 0.5, true);
    expect(idle.swaySeconds).toBe(0);
    expect(checkRotationSettled(idle)).toBe(true);
    const swaying = run(REST_ROTATION, ROTATION.idleDelaySeconds + 2, true);
    expect(swaying.swaySeconds).toBeGreaterThan(0);
    expect(checkRotationSettled(swaying)).toBe(false);
  });

  it('never sways with reduced motion', () => {
    const state = run(REST_ROTATION, ROTATION.idleDelaySeconds + 5, false);
    expect(state.swaySeconds).toBe(0);
    expect(getSwayTarget(0, ROTATION)).toEqual({ x: 0, y: 0 });
  });
});
