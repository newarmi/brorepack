import { Box3, Texture } from 'three/webgpu';
import { describe, expect, it, vi } from 'vitest';

import { createAcrylicMaterials } from './acrylicMaterial';
import { ACRYLIC, PLAQUE_THICKNESS_M, QUALITY_PRESETS } from './config';
import { createPlaqueGeometry } from './plaqueGeometry';

describe('createAcrylicMaterials', () => {
  it('uses acrylic optics and the same thickness as the geometry', () => {
    const { face, edge } = createAcrylicMaterials('high');
    const box = new Box3().setFromBufferAttribute(
      createPlaqueGeometry().getAttribute('position') as Parameters<Box3['setFromBufferAttribute']>[0],
    );
    for (const material of [face, edge]) {
      expect(material.ior).toBe(1.49);
      expect(material.roughness).toBe(ACRYLIC.roughness);
      expect(material.thickness).toBe(PLAQUE_THICKNESS_M);
      expect(material.thickness).toBeCloseTo(box.max.z - box.min.z, 9);
    }
  });

  it('turns on transmission only for high quality', () => {
    const high = createAcrylicMaterials('high');
    expect(high.face.transmissionNode).not.toBeNull();
    expect(high.edge.transmission).toBe(ACRYLIC.transmission);
    expect(high.face.transparent).toBe(false);

    const medium = createAcrylicMaterials('medium');
    expect(medium.face.transmissionNode).toBeNull();
    expect(medium.edge.transmission).toBe(0);
    expect(medium.edge.opacity).toBe(ACRYLIC.opacity);
    expect(medium.face.transparent).toBe(true);
  });

  it('takes clearcoat from the quality preset', () => {
    expect(createAcrylicMaterials('high').face.clearcoat).toBe(QUALITY_PRESETS.high.clearcoat);
    expect(createAcrylicMaterials('low').face.clearcoat).toBe(0);
  });

  it('cross-fades designs and frees the one that left', () => {
    const materials = createAcrylicMaterials('medium');
    const first = new Texture();
    const second = new Texture();
    const third = new Texture();
    const firstDispose = vi.spyOn(first, 'dispose');

    materials.setDesignTexture(first);
    // Первый дизайн появляется без растворения
    expect(materials.update(0.016)).toBe(false);

    materials.setDesignTexture(second);
    expect(materials.update(0.1)).toBe(true);
    // Последний шаг растворения ещё меняет картинку, после него кадры не нужны
    expect(materials.update(1)).toBe(true);
    expect(materials.update(0.016)).toBe(false);

    materials.setDesignTexture(third);
    expect(firstDispose).toHaveBeenCalledOnce();
  });

  it('disposes materials and design textures', () => {
    const materials = createAcrylicMaterials('high');
    const design = new Texture();
    const designDispose = vi.spyOn(design, 'dispose');
    const faceDispose = vi.spyOn(materials.face, 'dispose');
    const edgeDispose = vi.spyOn(materials.edge, 'dispose');
    materials.setDesignTexture(design);

    materials.dispose();

    expect(designDispose).toHaveBeenCalled();
    expect(faceDispose).toHaveBeenCalled();
    expect(edgeDispose).toHaveBeenCalled();
  });
});
