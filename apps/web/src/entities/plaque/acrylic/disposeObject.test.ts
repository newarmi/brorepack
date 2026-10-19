import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicNodeMaterial,
  MeshStandardNodeMaterial,
  Texture,
} from 'three/webgpu';
import { describe, expect, it, vi } from 'vitest';

import { disposeObject } from './disposeObject';
import { createPlaqueModel } from './plaqueModel';

describe('disposeObject', () => {
  it('frees geometries, every material of a mesh and their textures', () => {
    const geometry = new BoxGeometry();
    const map = new Texture();
    const first = new MeshStandardNodeMaterial({ map });
    const second = new MeshBasicNodeMaterial();
    const root = new Group();
    root.add(new Group().add(new Mesh(geometry, [first, second])));
    const spies = [geometry, map, first, second].map((item) => vi.spyOn(item, 'dispose'));

    disposeObject(root);

    spies.forEach((spy) => expect(spy).toHaveBeenCalled());
  });
});

describe('createPlaqueModel', () => {
  it('builds the plaque, the stand and the glow, and frees them all', () => {
    const model = createPlaqueModel('medium', '#ff5500');
    const meshes: Mesh[] = [];
    model.root.traverse((child) => {
      if (child instanceof Mesh) {
        meshes.push(child);
      }
    });
    expect(meshes).toHaveLength(3);
    const spies = meshes.map((mesh) => vi.spyOn(mesh.geometry, 'dispose'));

    model.dispose();

    spies.forEach((spy) => expect(spy).toHaveBeenCalled());
  });

  it('fades the stand in with the light stand', () => {
    const model = createPlaqueModel('medium', '#ff5500');
    model.setLit(true);
    expect(model.update(0.1)).toBe(true);
    expect(model.update(1)).toBe(true);
    expect(model.update(0.1)).toBe(false);
  });
});
