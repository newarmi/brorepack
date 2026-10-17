import { describe, expect, it } from 'vitest';

import { TILT_OPTIONS } from '../constants/tilt';
import {
  FLAT_TILT,
  formatTiltTransform,
  getDragTilt,
  getFrameFactor,
  getTiltAngle,
  stepTilt,
} from './tilt';

const SIZE = { width: 200, height: 280 };

describe('tilt', () => {
  it('follows the finger and never exceeds the limit', () => {
    expect(getTiltAngle(0, 100, 25)).toBe(0);
    expect(getTiltAngle(50, 100, 25)).toBeGreaterThan(0);
    expect(getTiltAngle(-50, 100, 25)).toBeLessThan(0);
    expect(getTiltAngle(10_000, 100, 25)).toBeLessThanOrEqual(25);
    expect(getTiltAngle(-10_000, 100, 18)).toBeGreaterThanOrEqual(-18);
  });

  it('stays flat when the card has no size yet', () => {
    expect(getTiltAngle(50, 0, 25)).toBe(0);
  });

  it('keeps drag tilt within ±18° by X and ±25° by Y', () => {
    const tilt = getDragTilt({ x: 5000, y: 5000 }, SIZE, TILT_OPTIONS);
    expect(tilt.x).toBeLessThan(0);
    expect(tilt.x).toBeGreaterThanOrEqual(-TILT_OPTIONS.maxRotateX);
    expect(tilt.y).toBeGreaterThan(0);
    expect(tilt.y).toBeLessThanOrEqual(TILT_OPTIONS.maxRotateY);
  });

  it('moves the same distance per second at any frame rate', () => {
    const frame60 = getFrameFactor(0.2, 1000 / 60);
    const leftAfterTwo60fpsFrames = (1 - frame60) ** 2;
    const leftAfterOne30fpsFrame = 1 - getFrameFactor(0.2, 1000 / 30);
    expect(frame60).toBeCloseTo(0.2, 6);
    expect(leftAfterOne30fpsFrame).toBeCloseTo(leftAfterTwo60fpsFrames, 6);
  });

  it('snaps to the goal when close enough', () => {
    expect(stepTilt({ x: 10, y: 0 }, FLAT_TILT, 0.5)).toEqual({ x: 5, y: 0 });
    expect(stepTilt({ x: 0.005, y: -0.005 }, FLAT_TILT, 0.2)).toEqual(FLAT_TILT);
  });

  it('drops transform for a flat card', () => {
    expect(formatTiltTransform(FLAT_TILT, 900)).toBe('');
    expect(formatTiltTransform({ x: -3, y: 4.567 }, 900)).toBe(
      'perspective(900px) rotateX(-3.00deg) rotateY(4.57deg)',
    );
  });
});
