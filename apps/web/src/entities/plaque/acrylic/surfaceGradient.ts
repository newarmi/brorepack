import {
  cos,
  dot,
  float,
  fract,
  length,
  mix,
  normalView,
  smoothstep,
  step,
  time,
  uniform,
  uv,
  vec2,
  vec3,
} from 'three/tsl';
import type { Node } from 'three/webgpu';
import { Color, Vector3 } from 'three/webgpu';

import type { GradientBlend, GradientStop, SurfaceGradient } from './config';

export type FloatNode = Node<'float'>;
export type ColorNode = Node<'vec3'>;

const MIN_STOPS = 2;
const MAX_STOPS = 6;

/** Точки по возрастанию; первая — в 0, чтобы зацикленный градиент сходился без шва */
export const normalizeStops = (stops: GradientStop[]): GradientStop[] => {
  if (stops.length < MIN_STOPS || stops.length > MAX_STOPS) {
    throw new Error(`У градиента должно быть от ${MIN_STOPS} до ${MAX_STOPS} точек`);
  }
  const sorted = [...stops].sort((left, right) => left.offset - right.offset);
  return sorted.map((stop, index) => ({
    offset: index === 0 ? 0 : Math.min(Math.max(stop.offset, 0), 1),
    color: stop.color,
  }));
};

/** Режимы наложения слоя на основу — как mix-blend-mode в CSS */
const BLEND_NODES: Record<GradientBlend, (base: ColorNode, layer: ColorNode) => ColorNode> = {
  screen: (base, layer) => float(1).sub(float(1).sub(base).mul(float(1).sub(layer))),
  multiply: (base, layer) => base.mul(layer),
  add: (base, layer) => base.add(layer).min(1),
  overlay: (base, layer) => {
    const dark = base.mul(layer).mul(2);
    const light = float(1).sub(float(1).sub(base).mul(float(1).sub(layer)).mul(2));
    return mix(dark, light, step(0.5, base));
  },
};

/** Координата 0…1 вдоль градиента: линейная — проекция UV на направление, радиальная — расстояние до центра */
const buildGradientCoordinate = (gradient: SurfaceGradient): FloatNode => {
  const centered = uv().sub(vec2(gradient.center.x, gradient.center.y));
  if (gradient.kind === 'radial') {
    return length(centered).mul(2);
  }
  const radians = (gradient.direction * Math.PI) / 180;
  return dot(centered, vec2(Math.cos(radians), Math.sin(radians))).add(0.5);
};

/**
 * Позиция на градиенте: место на поверхности + время + поворот.
 * normalView меняется при повороте плашки относительно камеры — отсюда перелив при вращении
 */
const buildGradientPhase = (gradient: SurfaceGradient): FloatNode => {
  const viewTerm = normalView.x.add(normalView.y).mul(gradient.viewShift);
  return fract(buildGradientCoordinate(gradient).add(time.mul(gradient.speed)).add(viewTerm));
};

/** HEX (sRGB) → линейный цвет рабочего пространства сцены. Вектор, а не Color: так uniform типизирован как vec3 */
export const toLinearVector = (hex: string): Vector3 => {
  const color = new Color(hex);
  return new Vector3(color.r, color.g, color.b);
};

/** Цвет зацикленного градиента: плавные переходы между соседними точками, после последней — к первой */
const buildGradientColor = (stops: GradientStop[], phase: FloatNode): ColorNode => {
  // Цвета — uniform: их можно поменять на лету, не пересобирая шейдер
  const [first, ...rest] = stops.map((stop) => ({
    offset: stop.offset,
    color: vec3(uniform(toLinearVector(stop.color))),
  }));
  if (!first) {
    throw new Error('У градиента нет точек');
  }
  let color: ColorNode = first.color;
  let previousOffset = first.offset;
  for (const stop of rest) {
    color = mix(color, stop.color, smoothstep(previousOffset, stop.offset, phase));
    previousOffset = stop.offset;
  }
  return mix(color, first.color, smoothstep(previousOffset, 1, phase));
};

/**
 * Градиент живёт на поверхности: накладывается на цвет материала с заданной силой,
 * а не подменяет его. mask (0…1) ограничивает, где он виден
 */
export const applySurfaceGradient = (
  base: ColorNode,
  gradient: SurfaceGradient,
  mask: FloatNode = float(1),
): ColorNode => {
  // Выключенный градиент не попадает в шейдер вовсе
  if (gradient.intensity <= 0) {
    return base;
  }
  const layer = buildGradientColor(normalizeStops(gradient.stops), buildGradientPhase(gradient));
  const blended = BLEND_NODES[gradient.blend](base, layer);
  return mix(base, blended, mask.mul(gradient.intensity));
};

/** Радуга по углу 0…1 (косинусная палитра): для бегущей RGB-кромки, где точки градиента не нужны */
export const buildRainbow = (phase: FloatNode): ColorNode => {
  const angle = phase.mul(Math.PI * 2);
  const third = (Math.PI * 2) / 3;
  return vec3(cos(angle), cos(angle.sub(third)), cos(angle.add(third)))
    .mul(0.5)
    .add(0.5);
};
