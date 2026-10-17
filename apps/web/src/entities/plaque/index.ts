/**
 * Плашка: превью (тот же SVG, что уходит в печать), шаблоны и подписи.
 */

export { default as PlaquePreview } from './components/PlaquePreview.vue';
export { CUSTOM_TEMPLATE_ID } from './constants/template';
export { getPreviewArt, loadPrintArt } from './utils/art';
export { formatDesignSummary, formatPlaqueTitle } from './utils/format';
