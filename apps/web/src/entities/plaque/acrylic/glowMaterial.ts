import {
  abs,
  atan,
  exp,
  float,
  interleavedGradientNoise,
  length,
  max,
  min,
  mix,
  oneMinus,
  screenCoordinate,
  smoothstep,
  time,
  uniform,
  uv,
  vec2,
  vec3,
} from 'three/tsl';
import { AdditiveBlending, MeshBasicNodeMaterial } from 'three/webgpu';

import { GLOW, METERS_PER_POINT, PLAQUE_CORNER_RADIUS_PT, PLAQUE_SIZE_M } from './config';
import { buildRainbow, toLinearVector } from './surfaceGradient';

export interface GlowMaterial {
  material: MeshBasicNodeMaterial;
  /** Размер плоскости свечения, м: плашка плюс поля под ореол */
  size: { width: number; height: number };
  setTemplateColor: (hex: string) => void;
  setLit: (isLit: boolean) => void;
  /** Шаг включения/выключения подсветки; true, пока он идёт */
  update: (deltaSeconds: number) => boolean;
  /** 0 — подсветка выключена, 1 — включена полностью; по нему появляется подставка */
  getLitProgress: () => number;
}

/**
 * Свечение позади плашки — плоскость с аддитивным смешиванием.
 * Без подсветки — мягкий ореол цвета шаблона (прежний box-shadow PlaquePreview),
 * с подсветкой — RGB-кромка, бегущая по кругу (прежний conic-gradient). Оба — TSL, без текстур
 */
export const createGlowMaterial = (templateColor: string): GlowMaterial => {
  const size = {
    width: PLAQUE_SIZE_M.width + GLOW.margin * 2,
    height: PLAQUE_SIZE_M.height + GLOW.margin * 2,
  };
  const halfPlaque = vec2(PLAQUE_SIZE_M.width / 2, PLAQUE_SIZE_M.height / 2);
  const radius = PLAQUE_CORNER_RADIUS_PT * METERS_PER_POINT;

  // Точка плоскости в метрах от центра плашки
  const point = uv().sub(0.5).mul(vec2(size.width, size.height));
  // Расстояние до края скруглённого прямоугольника (SDF): 0 на кромке, растёт наружу
  const corner = abs(point).sub(halfPlaque).add(radius);
  const distance = length(max(corner, 0)).add(min(max(corner.x, corner.y), 0)).sub(radius);
  // К краю плоскости свечение плавно гаснет до нуля — иначе видна граница прямоугольника
  const edgeFade = oneMinus(smoothstep(GLOW.margin * 0.5, GLOW.margin, distance));
  const shape = exp(abs(distance).div(GLOW.falloff).negate()).mul(edgeFade);

  const colorUniform = uniform(toLinearVector(templateColor));
  const color = vec3(colorUniform);
  const lit = uniform(0);
  // Оттенок — по углу вокруг центра плюс время: цвета бегут по кромке
  const hue = atan(point.y, point.x).div(Math.PI * 2).add(time.mul(GLOW.litSpeed));
  const intensity = mix(float(GLOW.templateIntensity), float(GLOW.litIntensity), lit);

  const material = new MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  material.colorNode = mix(color, buildRainbow(hue), lit);
  // Шум в полшага 8-битного цвета (dithering): плавный тёмный градиент без полос-«лесенок»
  const dither = interleavedGradientNoise(screenCoordinate).sub(0.5).div(255);
  material.opacityNode = max(shape.mul(intensity).add(dither), 0);

  let isLitGoal = false;

  const setTemplateColor = (hex: string): void => {
    colorUniform.value.copy(toLinearVector(hex));
  };

  const setLit = (isLit: boolean): void => {
    isLitGoal = isLit;
  };

  const update = (deltaSeconds: number): boolean => {
    const goal = isLitGoal ? 1 : 0;
    if (lit.value === goal) {
      return false;
    }
    const step = deltaSeconds / GLOW.fadeSeconds;
    lit.value = isLitGoal ? Math.min(1, lit.value + step) : Math.max(0, lit.value - step);
    return true;
  };

  const getLitProgress = (): number => lit.value;

  return { material, size, setTemplateColor, setLit, update, getLitProgress };
};
