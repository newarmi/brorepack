import type { BufferGeometry } from 'three/webgpu';
import { ExtrudeGeometry, Shape } from 'three/webgpu';

import { STAND } from './config';

/**
 * Профиль подставки сбоку: брусок с пазом сверху посередине.
 * Ось X профиля — глубина подставки, ось Y — высота
 */
const createStandProfile = (): Shape => {
  const halfDepth = STAND.depth / 2;
  const halfSlot = STAND.slotWidth / 2;
  const slotBottom = STAND.height - STAND.slotDepth;
  return new Shape()
    .moveTo(-halfDepth, 0)
    .lineTo(halfDepth, 0)
    .lineTo(halfDepth, STAND.height)
    .lineTo(halfSlot, STAND.height)
    .lineTo(halfSlot, slotBottom)
    .lineTo(-halfSlot, slotBottom)
    .lineTo(-halfSlot, STAND.height)
    .lineTo(-halfDepth, STAND.height)
    .closePath();
};

/**
 * Подставка в метрах: низ на y = 0, центр по X и Z — в начале координат.
 * Паз становится настоящей геометрией, а не тёмной полосой градиента, как было в CSS
 */
export const createStandGeometry = (): BufferGeometry => {
  const geometry = new ExtrudeGeometry(createStandProfile(), {
    depth: STAND.width - 2 * STAND.bevel,
    bevelEnabled: true,
    bevelThickness: STAND.bevel,
    bevelSize: STAND.bevel,
    bevelOffset: -STAND.bevel,
    bevelSegments: 2,
  });
  // Профиль выдавлен по Z — разворачиваем выдавливание вдоль ширины (ось X)
  geometry.rotateY(Math.PI / 2);
  geometry.translate(-STAND.width / 2 + STAND.bevel, 0, 0);
  geometry.computeBoundingBox();
  return geometry;
};
