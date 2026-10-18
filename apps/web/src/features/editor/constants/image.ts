/** Форматы картинки клиента: PNG и WebP сохраняют прозрачность */
export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/** Для input accept: расширения нужны Android-галереям, которые не знают MIME */
export const IMAGE_ACCEPT = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';

export const IMAGE_LIMITS = {
  /** Больше — скорее всего не картинка с телефона, а исходник; браузер может не вытянуть декодирование */
  maxFileBytes: 20 * 1024 * 1024,
  /** Длинная сторона после уменьшения: плашка на экране — пара сотен точек, для эскиза дизайнеру хватает */
  maxSide: 2048,
  /** Масштаб относительно «целиком на плашке» (100 %) */
  minZoom: 0.1,
  maxZoom: 6,
  /** Во сколько раз меняет масштаб одно деление колеса мыши (deltaY = 100) */
  wheelZoomStep: 1.1,
};
