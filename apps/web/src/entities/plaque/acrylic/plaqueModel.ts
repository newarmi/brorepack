import type { Texture } from 'three/webgpu';
import { Group, MathUtils, Mesh, MeshStandardNodeMaterial, PlaneGeometry } from 'three/webgpu';

import { createAcrylicMaterials } from './acrylicMaterial';
import type { AcrylicQuality } from './config';
import { PLAQUE_SIZE_M, PLAQUE_THICKNESS_M, PRODUCT_HEIGHT_M, STAND } from './config';
import { disposeObject } from './disposeObject';
import { createGlowMaterial } from './glowMaterial';
import { createPlaqueGeometry } from './plaqueGeometry';
import { createStandGeometry } from './standGeometry';

export interface PlaqueModel {
  /** Корень, который поворачивается целиком: плашка и подставка — один предмет */
  root: Group;
  setDesignTexture: (designTexture: Texture) => void;
  setTemplateColor: (hex: string) => void;
  setLit: (isLit: boolean) => void;
  /** Углы в градусах */
  setRotation: (angles: { x: number; y: number }) => void;
  /** Шаг анимаций (кроссфейд дизайна, подсветка); true, пока нужен следующий кадр */
  update: (deltaSeconds: number) => boolean;
  dispose: () => void;
}

/** Подставка — тёмный матовый брусок. Без подсветки её не видно, как в CSS-версии, но место она держит */
const createStand = (): Mesh<ReturnType<typeof createStandGeometry>, MeshStandardNodeMaterial> => {
  const material = new MeshStandardNodeMaterial({
    color: STAND.color,
    roughness: STAND.roughness,
    metalness: 0,
    transparent: true,
    opacity: 0,
  });
  return new Mesh(createStandGeometry(), material);
};

/**
 * Акриловая плашка на подставке со свечением позади.
 * Низ подставки — на y = 0 внутри предмета; сам предмет сдвинут так, чтобы вращаться вокруг своего центра
 */
export const createPlaqueModel = (quality: AcrylicQuality, templateColor: string): PlaqueModel => {
  const materials = createAcrylicMaterials(quality);
  const glow = createGlowMaterial(templateColor);

  const plaque = new Mesh(createPlaqueGeometry(), [materials.face, materials.edge]);
  // Плашка стоит в пазу: её низ — на дне паза
  plaque.position.y = STAND.height - STAND.slotDepth + PLAQUE_SIZE_M.height / 2;

  const glowPlane = new Mesh(new PlaneGeometry(glow.size.width, glow.size.height), glow.material);
  glowPlane.position.set(0, plaque.position.y, -PLAQUE_THICKNESS_M / 2 - 0.001);
  // Свечение рисуется первым: оно позади и не пишет глубину
  glowPlane.renderOrder = -1;

  const stand = createStand();

  const product = new Group();
  product.position.y = -PRODUCT_HEIGHT_M / 2;
  product.add(glowPlane, plaque, stand);

  const root = new Group();
  root.add(product);

  const setRotation = (angles: { x: number; y: number }): void => {
    root.rotation.set(MathUtils.degToRad(angles.x), MathUtils.degToRad(angles.y), 0);
  };

  const update = (deltaSeconds: number): boolean => {
    const isDesignFading = materials.update(deltaSeconds);
    const isGlowFading = glow.update(deltaSeconds);
    stand.material.opacity = glow.getLitProgress();
    stand.visible = stand.material.opacity > 0;
    return isDesignFading || isGlowFading;
  };

  const dispose = (): void => {
    // Текстуры дизайна живут в узлах TSL — их освобождают сами материалы акрила
    materials.dispose();
    disposeObject(root);
  };

  return {
    root,
    setDesignTexture: materials.setDesignTexture,
    setTemplateColor: glow.setTemplateColor,
    setLit: glow.setLit,
    setRotation,
    update,
    dispose,
  };
};
