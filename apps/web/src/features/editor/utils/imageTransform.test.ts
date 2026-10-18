import { PLAQUE_VIEWBOX } from '@brorepack/shared';
import { describe, expect, it } from 'vitest';

import {
  applyGestureStep,
  clampTransform,
  EMPTY_STEP,
  getFitScale,
  getFittedTransform,
  getPointersStep,
  normalizeRotation,
  PLAQUE_CENTER,
} from './imageTransform';

const WIDE = { width: 2000, height: 1000 };
const TALL = { width: 500, height: 2000 };

describe('getFittedTransform', () => {
  it('ставит картинку по центру и вписывает целиком по узкой стороне плашки', () => {
    const transform = getFittedTransform(WIDE);
    expect(transform).toMatchObject({ ...PLAQUE_CENTER, rotation: 0 });
    expect(WIDE.width * transform.scale).toBeCloseTo(PLAQUE_VIEWBOX.width);
    expect(WIDE.height * transform.scale).toBeLessThan(PLAQUE_VIEWBOX.height);
  });

  it('высокую картинку вписывает по высоте', () => {
    expect(TALL.height * getFitScale(TALL)).toBeCloseTo(PLAQUE_VIEWBOX.height);
  });
});

describe('clampTransform', () => {
  it('не даёт центру уйти за край плашки и ограничивает масштаб', () => {
    const fit = getFitScale(WIDE);
    const clamped = clampTransform({ x: -50, y: 9999, scale: fit * 100, rotation: 0 }, WIDE);
    expect(clamped).toMatchObject({ x: 0, y: PLAQUE_VIEWBOX.height });
    expect(clamped.scale).toBeCloseTo(fit * 6);
    expect(clampTransform({ ...clamped, scale: 0 }, WIDE).scale).toBeCloseTo(fit * 0.1);
  });
});

describe('normalizeRotation', () => {
  it('сводит угол к −180…180', () => {
    expect(normalizeRotation(190)).toBe(-170);
    expect(normalizeRotation(-190)).toBe(170);
    expect(normalizeRotation(720)).toBe(0);
  });
});

describe('жесты', () => {
  const start = { x: 100, y: 100, scale: 1, rotation: 0 };

  it('один палец сдвигает картинку', () => {
    const step = getPointersStep([{ x: 10, y: 10 }], [{ x: 30, y: 5 }]);
    expect(applyGestureStep(start, step)).toEqual({ x: 120, y: 95, scale: 1, rotation: 0 });
  });

  it('два пальца разводятся и поворачиваются — масштаб и угол вокруг точки между ними', () => {
    // Пальцы вокруг центра картинки: были по горизонтали на расстоянии 20, стали по вертикали на 40
    const from = [
      { x: 90, y: 100 },
      { x: 110, y: 100 },
    ];
    const to = [
      { x: 100, y: 80 },
      { x: 100, y: 120 },
    ];
    const result = applyGestureStep(start, getPointersStep(from, to));
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(100);
    expect(result.scale).toBeCloseTo(2);
    expect(result.rotation).toBeCloseTo(90);
  });

  it('масштаб вокруг точки сбоку сдвигает центр картинки от неё', () => {
    const step = { ...EMPTY_STEP, pivot: { x: 0, y: 100 }, zoom: 2 };
    expect(applyGestureStep(start, step)).toMatchObject({ x: 200, y: 100, scale: 2 });
  });

  it('без пальцев ничего не меняет', () => {
    expect(applyGestureStep(start, getPointersStep([], []))).toEqual(start);
  });
});
