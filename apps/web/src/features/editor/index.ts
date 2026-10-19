/**
 * Конструктор плашки: выбор шаблона, надпись, подсветка и проверка дизайна.
 * Своя картинка на «Своём дизайне»: CustomImageCard в конструкторе, ImageEditorStage + ImageEditorToolbar
 * и useImageEditSession — отдельный экран правки.
 */

export { default as CustomImageCard } from './components/CustomImageCard.vue';
export { default as GestureProbe } from './components/GestureProbe.vue';
export { default as ImageEditorStage } from './components/ImageEditorStage.vue';
export { default as ImageEditorToolbar } from './components/ImageEditorToolbar.vue';
export { default as LightStandRow } from './components/LightStandRow.vue';
export { default as PlaqueStage } from './components/PlaqueStage.vue';
export { default as TemplatePicker } from './components/TemplatePicker.vue';
export { useDesignValidation } from './composables/useDesignValidation';
export { useImageEditSession } from './composables/useImageEditSession';
