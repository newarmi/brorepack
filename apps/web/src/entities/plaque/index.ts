/**
 * Плашка: превью (тот же SVG, что уходит в печать), шаблоны и подписи.
 * 3D-превью из акрила 5 мм — acrylic/ (Three.js грузится лениво, отдельным чанком; без WebGPU и WebGL 2 — событие fail).
 */

export { default as AcrylicPlaque3D } from './acrylic/AcrylicPlaque3D.vue';
export { default as PlaquePreview } from './components/PlaquePreview.vue';
export { CUSTOM_TEMPLATE_ID } from './constants/template';
export { getFrontArt, getPreviewArt, loadPrintArt } from './utils/art';
export { loadEmbeddedFontCss } from './utils/embeddedFonts';
export { formatDesignSummary, formatPlaqueTitle } from './utils/format';
