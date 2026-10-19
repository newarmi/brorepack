import type { AcrylicQuality } from './config';

/**
 * Качество по умолчанию: настоящее преломление — только на десктопе с WebGPU, иначе medium.
 * low сам не выбирается: Safari ради приватности занижает navigator.hardwareConcurrency,
 * и iPhone по числу ядер выглядел «слабым» — плашка рисовалась мутной и без сглаживания
 */
export const getAutoQuality = (): AcrylicQuality => {
  const isFinePointer = window.matchMedia?.('(pointer: fine)').matches ?? false;
  return 'gpu' in navigator && isFinePointer ? 'high' : 'medium';
};

/** ?gl=webgl в адресе — WebGL 2 даже там, где есть WebGPU: так проверяют fallback */
export const checkWebGLForced = (): boolean => {
  return new URLSearchParams(window.location.search).get('gl') === 'webgl';
};
