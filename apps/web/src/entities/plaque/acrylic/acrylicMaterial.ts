import { float, mix, oneMinus, uniform, vec3 } from 'three/tsl';
import type { Texture } from 'three/webgpu';
import { Color, MeshPhysicalNodeMaterial } from 'three/webgpu';

import type { AcrylicQuality, AcrylicSettings } from './config';
import {
  ACRYLIC,
  EDGE_GRADIENT,
  FACE_GRADIENT,
  PLAQUE_THICKNESS_M,
  QUALITY_PRESETS,
} from './config';
import { createDesignCrossfade } from './designCrossfade';
import { applySurfaceGradient, toLinearVector } from './surfaceGradient';

export interface AcrylicMaterials {
  /** Лицевая и задняя грани: дизайн клиента напечатан на акриле */
  face: MeshPhysicalNodeMaterial;
  /** Торцы и фаска: чистый акрил с переливом */
  edge: MeshPhysicalNodeMaterial;
  /** Новый дизайн: прежний плавно растворяется, как при смене шаблона в CSS-версии */
  setDesignTexture: (designTexture: Texture) => void;
  /** Шаг кроссфейда; true, пока он идёт и нужен следующий кадр */
  update: (deltaSeconds: number) => boolean;
  dispose: () => void;
}

/** Общие для лица и торцов свойства акрила. thickness — та же константа, что глубина геометрии */
const createAcrylicBase = (
  quality: AcrylicQuality,
  settings: AcrylicSettings,
): MeshPhysicalNodeMaterial => {
  const preset = QUALITY_PRESETS[quality];
  return new MeshPhysicalNodeMaterial({
    roughness: settings.roughness,
    metalness: 0,
    ior: settings.ior,
    thickness: PLAQUE_THICKNESS_M,
    clearcoat: preset.clearcoat,
    clearcoatRoughness: settings.clearcoatRoughness,
    attenuationColor: new Color(settings.tint),
    attenuationDistance: settings.attenuationDistance,
    // Без transmission акрил просвечивает обычной прозрачностью
    transparent: !preset.hasTransmission,
  });
};

/**
 * Материалы акриловой плашки.
 * high — настоящее преломление (transmission) там, где акрил не запечатан;
 * medium и low — полупрозрачность без лишнего прохода рендера
 */
export const createAcrylicMaterials = (
  quality: AcrylicQuality,
  settings: AcrylicSettings = ACRYLIC,
): AcrylicMaterials => {
  const { hasTransmission } = QUALITY_PRESETS[quality];
  const tint = vec3(uniform(toLinearVector(settings.tint)));
  const crossfade = createDesignCrossfade();
  const { design } = crossfade;
  // Запечатанная часть непрозрачна, акрил виден только по краям и в скруглённых углах
  const printed = design.a;

  const face = createAcrylicBase(quality, settings);
  face.colorNode = applySurfaceGradient(mix(tint, design.rgb, printed), FACE_GRADIENT);
  face.emissiveNode = design.rgb.mul(printed).mul(settings.printBrightness);
  if (hasTransmission) {
    face.transmissionNode = oneMinus(printed).mul(settings.transmission);
  } else {
    face.opacityNode = mix(float(settings.opacity), float(1), printed);
  }

  const edge = createAcrylicBase(quality, settings);
  edge.colorNode = applySurfaceGradient(tint, EDGE_GRADIENT);
  edge.transmission = hasTransmission ? settings.transmission : 0;
  edge.opacity = hasTransmission ? 1 : settings.opacity;

  const dispose = (): void => {
    crossfade.dispose();
    face.dispose();
    edge.dispose();
  };

  return {
    face,
    edge,
    setDesignTexture: crossfade.setDesignTexture,
    update: crossfade.update,
    dispose,
  };
};
