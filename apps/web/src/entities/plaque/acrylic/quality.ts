import type { AcrylicQuality } from './config';

/**
 * Качество по умолчанию: настоящее преломление — только на десктопе с WebGPU.
 * На телефонах и в WebGL 2 — medium, на слабых телефонах (≤ 4 ядер) — low
 */
export const getAutoQuality = (): AcrylicQuality => {
  const isFinePointer = window.matchMedia?.('(pointer: fine)').matches ?? false;
  if ('gpu' in navigator && isFinePointer) {
    return 'high';
  }
  const isWeakDevice = !isFinePointer && (navigator.hardwareConcurrency || 8) <= 4;
  return isWeakDevice ? 'low' : 'medium';
};

/** ?gl=webgl в адресе — WebGL 2 даже там, где есть WebGPU: так проверяют fallback */
export const checkWebGLForced = (): boolean => {
  return new URLSearchParams(window.location.search).get('gl') === 'webgl';
};
