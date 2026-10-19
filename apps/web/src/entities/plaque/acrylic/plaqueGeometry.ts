import { PLAQUE_VIEWBOX } from '@brorepack/shared';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import type { BufferGeometry, Shape } from 'three/webgpu';
import { ExtrudeGeometry } from 'three/webgpu';

import type { PlaqueBevel } from './config';
import {
  METERS_PER_POINT,
  PLAQUE_BEVEL,
  PLAQUE_CORNER_RADIUS_PT,
  PLAQUE_SIZE_M,
  PLAQUE_THICKNESS_M,
} from './config';

/** Группы ExtrudeGeometry: 0 — лицевая и задняя грани, 1 — торцы и фаска */
export const PLAQUE_FACE_GROUP = 0;
export const PLAQUE_EDGE_GROUP = 1;

/** Контур плашки в pt листа — тот же прямоугольник со скруглением, что clipPath в renderPlaqueSvg */
export const buildPlaqueOutlineSvg = (): string => {
  const { width, height } = PLAQUE_VIEWBOX;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" rx="${PLAQUE_CORNER_RADIUS_PT}"/>`,
    '</svg>',
  ].join('');
};

/** SVG-контур (pt, ось Y вниз) → фигуры для выдавливания. Заливка каждого пути — отдельная фигура */
export const parseOutlineShapes = (outlineSvg: string): Shape[] => {
  const { paths } = new SVGLoader().parse(outlineSvg);
  const shapes = paths.flatMap((path) => SVGLoader.createShapes(path));
  if (!shapes.length) {
    throw new Error('В SVG-контуре плашки нет ни одной фигуры');
  }
  return shapes;
};

/**
 * Лицевая грань получает UV 0…1 по всему листу: текстура дизайна ложится так же, как в SVG.
 * Стандартные UV ExtrudeGeometry — это просто координаты точек, для текстуры они не годятся
 */
const normalizeFaceUvs = (geometry: BufferGeometry): void => {
  const position = geometry.getAttribute('position');
  const uvAttribute = geometry.getAttribute('uv');
  const { width, height } = PLAQUE_SIZE_M;
  // Внешний край — граница листа, лицевая грань меньше него на ширину фаски
  const faceGroups = geometry.groups.filter((group) => group.materialIndex === PLAQUE_FACE_GROUP);
  for (const group of faceGroups) {
    for (let index = group.start; index < group.start + group.count; index += 1) {
      const u = (position.getX(index) + width / 2) / width;
      const v = (position.getY(index) + height / 2) / height;
      uvAttribute.setXY(index, u, v);
    }
  }
  uvAttribute.needsUpdate = true;
};

/**
 * Акриловая плашка: SVG-контур, выдавленный на 5 мм, с фаской.
 * Центр — в начале координат, лицевая грань смотрит на +Z, единицы — метры
 */
export const createPlaqueGeometry = (
  outlineSvg: string = buildPlaqueOutlineSvg(),
  bevel: PlaqueBevel = PLAQUE_BEVEL,
): BufferGeometry => {
  // Строим в пунктах листа и только потом переводим в метры: фаска и глубина пересчитываются туда же
  const bevelThickness = bevel.isEnabled ? bevel.thickness : 0;
  const bevelSize = bevel.isEnabled ? bevel.size : 0;
  const geometry = new ExtrudeGeometry(parseOutlineShapes(outlineSvg), {
    depth: (PLAQUE_THICKNESS_M - 2 * bevelThickness) / METERS_PER_POINT,
    bevelEnabled: bevel.isEnabled,
    bevelThickness: bevelThickness / METERS_PER_POINT,
    bevelSize: bevelSize / METERS_PER_POINT,
    bevelOffset: -bevelSize / METERS_PER_POINT,
    bevelSegments: bevel.segments,
    curveSegments: 6,
  });
  geometry.scale(METERS_PER_POINT, METERS_PER_POINT, METERS_PER_POINT);
  // Поворот на 180° вокруг X: ось Y из SVG (вниз) становится осью Y сцены (вверх).
  // Это поворот, а не отражение, — порядок обхода треугольников и нормали остаются верными
  geometry.rotateX(Math.PI);
  geometry.center();
  normalizeFaceUvs(geometry);
  geometry.computeBoundingBox();
  return geometry;
};
