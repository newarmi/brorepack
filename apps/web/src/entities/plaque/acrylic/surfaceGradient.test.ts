import { vec3 } from 'three/tsl';
import { describe, expect, it } from 'vitest';

import { FACE_GRADIENT } from './config';
import { applySurfaceGradient, normalizeStops } from './surfaceGradient';

describe('surface gradient', () => {
  it('sorts stops and starts the loop at 0', () => {
    const stops = normalizeStops([
      { offset: 0.7, color: '#0000ff' },
      { offset: 0.2, color: '#ff0000' },
      { offset: 1.4, color: '#00ff00' },
    ]);
    expect(stops.map((stop) => stop.offset)).toEqual([0, 0.7, 1]);
    expect(stops.map((stop) => stop.color)).toEqual(['#ff0000', '#0000ff', '#00ff00']);
  });

  it('accepts from 2 to 6 stops', () => {
    const stop = { offset: 0, color: '#ffffff' };
    expect(() => normalizeStops([stop])).toThrow();
    expect(() => normalizeStops(Array.from({ length: 7 }, () => stop))).toThrow();
    expect(normalizeStops([stop, stop])).toHaveLength(2);
  });

  it('builds a node for every blend mode and kind', () => {
    for (const blend of ['screen', 'overlay', 'add', 'multiply'] as const) {
      for (const kind of ['linear', 'radial'] as const) {
        const base = vec3(0.5);
        const gradient = { ...FACE_GRADIENT, blend, kind, intensity: 0.5 };
        expect(applySurfaceGradient(base, gradient)).not.toBe(base);
      }
    }
  });

  it('leaves the surface untouched when the gradient is off', () => {
    const base = vec3(0.5);
    expect(applySurfaceGradient(base, { ...FACE_GRADIENT, intensity: 0 })).toBe(base);
  });
});
