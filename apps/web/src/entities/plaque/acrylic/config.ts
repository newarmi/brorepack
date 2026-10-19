import { PLAQUE_PRINT_SIZE_MM, PLAQUE_VIEWBOX } from '@brorepack/shared';

// Все настройки 3D-плашки. Масштаб сцены: 1 unit = 1 метр,
// поэтому размеры здесь — в метрах, а углы — в градусах

const METERS_PER_MM = 0.001;

/** Толщина акрила. Одна константа и для геометрии, и для material.thickness — расходиться им нельзя */
export const PLAQUE_THICKNESS_M = 5 * METERS_PER_MM;

/** Лист A5 — тот же размер, что у файла для печати */
export const PLAQUE_SIZE_M = {
  width: PLAQUE_PRINT_SIZE_MM.A5.width * METERS_PER_MM,
  height: PLAQUE_PRINT_SIZE_MM.A5.height * METERS_PER_MM,
};

/** Сколько метров в пункте листа: SVG-контур и арт нарисованы в pt (PLAQUE_VIEWBOX) */
export const METERS_PER_POINT = PLAQUE_SIZE_M.width / PLAQUE_VIEWBOX.width;

/** Скругление углов — как у clipPath в renderPlaqueSvg (rx 8 pt) */
export const PLAQUE_CORNER_RADIUS_PT = 8;

/**
 * Фаска по краю акрила. Внешний контур при этом не растёт (bevelOffset = −size),
 * а глубина выдавливания уменьшается на две фаски — полная толщина остаётся ровно 5 мм
 */
export const PLAQUE_BEVEL = {
  isEnabled: true,
  thickness: 0.4 * METERS_PER_MM,
  size: 0.4 * METERS_PER_MM,
  segments: 2,
};

export type PlaqueBevel = typeof PLAQUE_BEVEL;

/** Подставка: пропорции прежней CSS-подставки (268 / 230 ширины плашки), паз — под 5 мм с зазором */
export const STAND = {
  width: (PLAQUE_SIZE_M.width * 268) / 230,
  height: 9 * METERS_PER_MM,
  depth: 31 * METERS_PER_MM,
  // Зазор 0.5 мм с каждой стороны
  slotWidth: PLAQUE_THICKNESS_M + METERS_PER_MM,
  slotDepth: 4 * METERS_PER_MM,
  bevel: 0.6 * METERS_PER_MM,
  color: '#141414',
  roughness: 0.9,
};

/** Высота предмета целиком: плашка утоплена в паз */
export const PRODUCT_HEIGHT_M = STAND.height - STAND.slotDepth + PLAQUE_SIZE_M.height;

/** Акрил: прозрачность, оттенок и блики. Работает одинаково в WebGPU и WebGL 2 */
export const ACRYLIC = {
  /** Оттенок толщи акрила: на торцах он чуть зеленоватый, как у настоящего листа */
  tint: '#e6f2ee',
  /** Насколько свет проходит сквозь незапечатанный акрил (только quality: high) */
  transmission: 1,
  /** Непрозрачность незапечатанного акрила там, где transmission выключен (medium, low) */
  opacity: 0.45,
  roughness: 0.06,
  ior: 1.49,
  clearcoatRoughness: 0.1,
  /** На каком расстоянии свет в толще приобретает оттенок tint, м */
  attenuationDistance: 0.05,
  /** Собственная яркость печати: без неё дизайн в тени темнее, чем в 2D-превью, и ник читается хуже */
  printBrightness: 0.3,
};

export type AcrylicSettings = typeof ACRYLIC;

export type AcrylicQuality = 'high' | 'medium' | 'low';

export interface QualityPreset {
  /** Настоящее преломление: лишний проход рендера, дорого на телефонах */
  hasTransmission: boolean;
  clearcoat: number;
  maxPixelRatio: number;
  isAntialias: boolean;
  /** Частота кадров, когда плашку никто не трогает (покачивание, перелив) */
  idleFps: number;
}

export const QUALITY_PRESETS: Record<AcrylicQuality, QualityPreset> = {
  high: { hasTransmission: true, clearcoat: 0.3, maxPixelRatio: 2, isAntialias: true, idleFps: 60 },
  medium: {
    hasTransmission: false,
    clearcoat: 0.2,
    maxPixelRatio: 1.75,
    isAntialias: true,
    idleFps: 60,
  },
  low: { hasTransmission: false, clearcoat: 0, maxPixelRatio: 1.25, isAntialias: false, idleFps: 30 },
};

export type GradientBlend = 'screen' | 'overlay' | 'add' | 'multiply';

export interface GradientStop {
  /** Положение 0…1. Градиент зациклен: после последней точки цвет возвращается к первой */
  offset: number;
  color: string;
}

export interface SurfaceGradient {
  kind: 'linear' | 'radial';
  /** Направление линейного градиента, градусы от оси X против часовой */
  direction: number;
  /** Центр радиального градиента в UV лицевой грани */
  center: { x: number; y: number };
  /** От 2 до 6 точек */
  stops: GradientStop[];
  /** Сдвиг градиента за секунду, доли его длины. 0 — без анимации */
  speed: number;
  /** Насколько поворот плашки сдвигает градиент: из-за этого он переливается при вращении */
  viewShift: number;
  blend: GradientBlend;
  /** Сила наложения на поверхность, 0…1. Градиент не заменяет материал, а ложится поверх */
  intensity: number;
}

// Цвета — те же, что у прежней CSS-подсветки (conic-gradient в PlaqueStage.vue)
const RAINBOW_STOPS: GradientStop[] = [
  { offset: 0, color: '#ff2d55' },
  { offset: 0.17, color: '#ff9500' },
  { offset: 0.34, color: '#ffd60a' },
  { offset: 0.5, color: '#30d158' },
  { offset: 0.67, color: '#0a84ff' },
  { offset: 0.84, color: '#bf5af2' },
];

/**
 * Перелив по лицевой грани. Выключен (intensity 0): радуга спорила с дизайном клиента.
 * Смешивание идёт в линейном цвете — на тёмном фоне даже 0.035 уже заметная засветка
 */
export const FACE_GRADIENT: SurfaceGradient = {
  kind: 'linear',
  direction: 35,
  center: { x: 0.5, y: 0.5 },
  stops: RAINBOW_STOPS,
  speed: 0.02,
  viewShift: 0.8,
  blend: 'screen',
  intensity: 0,
};

/** Перелив на торцах: там акрил не запечатан, градиент заметнее */
export const EDGE_GRADIENT: SurfaceGradient = {
  ...FACE_GRADIENT,
  direction: 90,
  viewShift: 1.5,
  intensity: 0.35,
};

/** Свечение позади плашки: цвет шаблона, а с подсветкой — бегущая RGB-кромка */
export const GLOW = {
  /** На сколько плоскость свечения больше плашки с каждой стороны, м. К краю плоскости свечение гаснет до нуля */
  margin: 0.07,
  /** Затухание свечения от края плашки, м */
  falloff: 0.012,
  /** Сила свечения цвета шаблона без подсветки */
  templateIntensity: 0.35,
  litIntensity: 1.1,
  /** Оборотов RGB-кромки в секунду — как прежние 6 с на круг */
  litSpeed: 1 / 6,
  /** Время плавного включения подсветки, с */
  fadeSeconds: 0.3,
};

/** На сколько холст больше места предмета с каждой стороны (доли его ширины и высоты): при повороте углы не обрезаются */
export const CANVAS_OVERFLOW = { x: 0.45, y: 0.25 };

export const CAMERA = {
  fov: 30,
  near: 0.01,
  far: 2,
  /** Камера чуть выше предмета, как прежний perspective-origin: верх подставки виден и без наклона */
  elevationDegrees: 6,
};

/** Поворот пальцем: пределы, инерция, пружина и покачивание в простое */
export const ROTATION = {
  maxDegreesX: 14,
  maxDegreesY: 38,
  /** Градусов поворота на пиксель сдвига пальца */
  degreesPerPixel: 0.35,
  /** Доля скорости, которая остаётся через секунду свободного вращения */
  friction: 0.02,
  /** Жёсткость пружины к покою, 1/с² */
  stiffness: 40,
  /** Жёсткость за пределом: плашка упирается мягко, без жёсткой стенки */
  limitStiffness: 260,
  /** Через сколько секунд простоя начинается покачивание */
  idleDelaySeconds: 3,
  swayDegreesY: 10,
  swayDegreesX: 3,
  /** Период покачивания, с */
  swayPeriodSeconds: 7,
};

export type RotationSettings = typeof ROTATION;

/** Текстура дизайна: ширина экрана × DPR × запас на поворот, но не больше лимита */
export const DESIGN_TEXTURE = {
  maxWidth: 1024,
  oversample: 1.5,
  /** Картинка клиента внутри SVG уменьшается до этой стороны */
  maxImageSide: 1600,
  anisotropy: 4,
  /** Пауза после ввода ника перед перерисовкой текстуры, мс */
  debounceMs: 150,
  /** Кроссфейд при смене шаблона, с — как прежний plaque-swap */
  fadeSeconds: 0.28,
};

/** Через сколько миллисекунд без пользователей рендерер освобождается */
export const RENDERER_RELEASE_DELAY_MS = 5000;
