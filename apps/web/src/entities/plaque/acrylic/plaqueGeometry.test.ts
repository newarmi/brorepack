import { Box3 } from 'three/webgpu';
import { describe, expect, it } from 'vitest';

import { PLAQUE_BEVEL, PLAQUE_SIZE_M, PLAQUE_THICKNESS_M } from './config';
import { createPlaqueGeometry, PLAQUE_FACE_GROUP } from './plaqueGeometry';

const getSize = (geometry: ReturnType<typeof createPlaqueGeometry>) => {
  const box = new Box3().setFromBufferAttribute(
    geometry.getAttribute('position') as Parameters<Box3['setFromBufferAttribute']>[0],
  );
  return {
    width: box.max.x - box.min.x,
    height: box.max.y - box.min.y,
    depth: box.max.z - box.min.z,
    center: box.getCenter(box.min.clone()),
  };
};

// Шестиугольник в pt листа — фигурная плашка из будущих шаблонов
const HEXAGON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg"><path d="M100 0L300 0L400 200L300 400L100 400L0 200Z"/></svg>';

describe('createPlaqueGeometry', () => {
  it('is exactly 5 mm thick with the bevel', () => {
    const size = getSize(createPlaqueGeometry());
    expect(size.depth).toBeCloseTo(PLAQUE_THICKNESS_M, 9);
    expect(PLAQUE_THICKNESS_M).toBe(0.005);
  });

  it('is exactly 5 mm thick without the bevel', () => {
    const geometry = createPlaqueGeometry(undefined, { ...PLAQUE_BEVEL, isEnabled: false });
    expect(getSize(geometry).depth).toBeCloseTo(PLAQUE_THICKNESS_M, 9);
  });

  it('keeps the A5 sheet size in meters and is centered', () => {
    const size = getSize(createPlaqueGeometry());
    expect(size.width).toBeCloseTo(PLAQUE_SIZE_M.width, 6);
    expect(size.height).toBeCloseTo(PLAQUE_SIZE_M.height, 6);
    expect(size.center.length()).toBeLessThan(1e-9);
  });

  it('maps the face texture onto the whole sheet', () => {
    const geometry = createPlaqueGeometry();
    const uvAttribute = geometry.getAttribute('uv');
    const faceGroup = geometry.groups.find((group) => group.materialIndex === PLAQUE_FACE_GROUP);
    expect(faceGroup).toBeDefined();
    const start = faceGroup?.start ?? 0;
    const uValues: number[] = [];
    for (let index = start; index < start + (faceGroup?.count ?? 0); index += 1) {
      uValues.push(uvAttribute.getX(index));
      expect(uvAttribute.getY(index)).toBeGreaterThanOrEqual(0);
      expect(uvAttribute.getY(index)).toBeLessThanOrEqual(1);
    }
    expect(Math.min(...uValues)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...uValues)).toBeLessThanOrEqual(1);
  });

  it('extrudes any SVG outline to the same 5 mm', () => {
    expect(getSize(createPlaqueGeometry(HEXAGON_SVG)).depth).toBeCloseTo(PLAQUE_THICKNESS_M, 9);
  });

  it('rejects an outline without shapes', () => {
    expect(() => createPlaqueGeometry('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).toThrow();
  });
});
