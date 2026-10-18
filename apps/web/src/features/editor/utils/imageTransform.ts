import type { PlaqueImageTransform } from '@brorepack/shared';
import { PLAQUE_VIEWBOX } from '@brorepack/shared';

import { IMAGE_LIMITS } from '../constants/image';

// Геометрия картинки клиента на плашке. Все величины — в пунктах листа (как в renderPlaqueSvg),
// поэтому положение не зависит от размера экрана: экранные пиксели переводятся в пункты один раз, в жесте

export interface ImageSize {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Изменение за жест: точка, вокруг которой масштаб и поворот, сам масштаб, поворот и сдвиг */
export interface GestureStep {
  pivot: Point;
  zoom: number;
  rotation: number;
  shift: Point;
}

export const PLAQUE_CENTER: Point = { x: PLAQUE_VIEWBOX.width / 2, y: PLAQUE_VIEWBOX.height / 2 };

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

/** Только положение — без href и размеров картинки */
export const pickTransform = (transform: PlaqueImageTransform): PlaqueImageTransform => {
  const { x, y, scale, rotation } = transform;
  return { x, y, scale, rotation };
};

/** Масштаб, при котором картинка целиком помещается на плашку, — это «100 %» */
export const getFitScale = (size: ImageSize): number => {
  return Math.min(PLAQUE_VIEWBOX.width / size.width, PLAQUE_VIEWBOX.height / size.height);
};

/** Начальное положение: по центру, целиком на плашке, без поворота */
export const getFittedTransform = (size: ImageSize): PlaqueImageTransform => {
  return { ...PLAQUE_CENTER, scale: getFitScale(size), rotation: 0 };
};

/** Угол в диапазоне −180…180, чтобы ползунок не упирался после нескольких оборотов */
export const normalizeRotation = (degrees: number): number => {
  const rotation = ((((degrees + 180) % 360) + 360) % 360) - 180;
  return Object.is(rotation, -0) ? 0 : rotation;
};

/** Центр картинки не уходит за край плашки — её всегда можно поймать пальцем; масштаб в пределах */
export const clampTransform = (
  transform: PlaqueImageTransform,
  size: ImageSize,
): PlaqueImageTransform => {
  const fitScale = getFitScale(size);
  return {
    x: clamp(transform.x, 0, PLAQUE_VIEWBOX.width),
    y: clamp(transform.y, 0, PLAQUE_VIEWBOX.height),
    scale: clamp(transform.scale, fitScale * IMAGE_LIMITS.minZoom, fitScale * IMAGE_LIMITS.maxZoom),
    rotation: normalizeRotation(transform.rotation),
  };
};

/**
 * Масштаб и поворот вокруг точки (пальцы, курсор) плюс сдвиг.
 * Центр картинки поворачивается и отдаляется от этой точки так же, как сама картинка,
 * поэтому место под пальцами остаётся под пальцами
 */
export const applyGestureStep = (
  transform: PlaqueImageTransform,
  step: GestureStep,
): PlaqueImageTransform => {
  const radians = (step.rotation * Math.PI) / 180;
  const offsetX = (transform.x - step.pivot.x) * step.zoom;
  const offsetY = (transform.y - step.pivot.y) * step.zoom;
  return {
    x: step.pivot.x + step.shift.x + offsetX * Math.cos(radians) - offsetY * Math.sin(radians),
    y: step.pivot.y + step.shift.y + offsetX * Math.sin(radians) + offsetY * Math.cos(radians),
    scale: transform.scale * step.zoom,
    rotation: transform.rotation + step.rotation,
  };
};

const getDistance = (a: Point, b: Point): number => Math.hypot(b.x - a.x, b.y - a.y);
const getAngle = (a: Point, b: Point): number => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
const getMidpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Шаг без изменений — для жеста, в котором ещё нет ни одного пальца */
export const EMPTY_STEP: GestureStep = {
  pivot: { x: 0, y: 0 },
  zoom: 1,
  rotation: 0,
  shift: { x: 0, y: 0 },
};

/** Шаг жеста по положению пальцев в начале и сейчас: один палец двигает, два — ещё масштабируют и вращают */
export const getPointersStep = (from: Point[], to: Point[]): GestureStep => {
  const [fromA, fromB] = from;
  const [toA, toB] = to;
  if (!fromA || !toA) {
    return EMPTY_STEP;
  }
  if (!fromB || !toB) {
    return { ...EMPTY_STEP, pivot: fromA, shift: { x: toA.x - fromA.x, y: toA.y - fromA.y } };
  }
  const fromMid = getMidpoint(fromA, fromB);
  const toMid = getMidpoint(toA, toB);
  const fromDistance = getDistance(fromA, fromB);
  return {
    pivot: fromMid,
    zoom: fromDistance > 0 ? getDistance(toA, toB) / fromDistance : 1,
    rotation: getAngle(toA, toB) - getAngle(fromA, fromB),
    shift: { x: toMid.x - fromMid.x, y: toMid.y - fromMid.y },
  };
};
