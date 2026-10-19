import type { Material, Object3D, Texture } from 'three/webgpu';
import { Mesh } from 'three/webgpu';

const checkTexture = (value: unknown): value is Texture => {
  return typeof value === 'object' && value !== null && 'isTexture' in value;
};

/** Материал и текстуры в его свойствах (map, normalMap…). Текстуры узлов TSL освобождает их владелец */
export const disposeMaterial = (material: Material): void => {
  Object.values(material).filter(checkTexture).forEach((item) => item.dispose());
  material.dispose();
};

/**
 * Освобождает GPU-ресурсы всего дерева: геометрии, материалы и их текстуры.
 * Сам объект из сцены не убирает — сцена после этого больше не рисуется
 */
export const disposeObject = (root: Object3D): void => {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return;
    }
    child.geometry.dispose();
    const materials: Material[] = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach(disposeMaterial);
  });
};
