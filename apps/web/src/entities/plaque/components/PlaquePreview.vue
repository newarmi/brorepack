<template>
  <!-- SVG собирает renderPlaqueSvg, пользовательский текст в нём экранирован -->
  <!-- eslint-disable vue/no-v-html -->
  <div
    ref="root"
    class="plaque-preview"
    :class="{ 'plaque-preview--glow': props.glow }"
    :style="{ '--glow-color': glowColor }"
    :aria-hidden="props.decorative || undefined"
    v-html="svg"
  />
</template>

<script setup lang="ts">
import { computed, useId, useTemplateRef, watchPostEffect } from 'vue';

import type { PlaqueDesign, PlaqueImage } from '@brorepack/shared';
import {
  formatPlaqueImageTransform,
  getPlaqueImageId,
  getTemplate,
  renderPlaqueSvg,
} from '@brorepack/shared';

import { getFrontArt, getPreviewArt } from '../utils/art';

const props = withDefaults(
  defineProps<{
    design: PlaqueDesign;
    glow?: boolean;
    /** Картинка клиента поверх фона шаблона */
    image?: PlaqueImage | null;
    /** Миниатюра рядом с текстом — скрыть от скринридеров, чтобы не дублировать подпись */
    decorative?: boolean;
  }>(),
  { glow: false, image: null, decorative: false },
);

// id внутри SVG должны быть уникальны на странице: превью бывает несколько
const idPrefix = `plaque-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

// Та же функция рендерит файл для печати, поэтому превью совпадает с результатом.
// Пользовательский текст экранируется внутри renderPlaqueSvg (escapeXml).
// Свечение — цвета шаблона: под красной плашкой красное, под белой — белое
const glowColor = computed(() => getTemplate(props.design.templateId).glowColor);

// Положение картинки в разметку не входит: при перетаскивании строка SVG та же, и v-html не пересоздаёт DOM.
// Иначе каждый кадр жеста заново создавал бы все <image> и отрывал от документа узел под пальцем
const STILL_IMAGE = { x: 0, y: 0, scale: 1, rotation: 0 };

const svg = computed(() =>
  renderPlaqueSvg(props.design, {
    idPrefix,
    art: getPreviewArt(props.design.templateId),
    image: props.image ? { ...props.image, ...STILL_IMAGE } : undefined,
    frontArt: getFrontArt(props.design.templateId),
  }),
);

const root = useTemplateRef<HTMLElement>('root');

// Post-эффект: и при монтировании, и после того как v-html вставил новую разметку (смена шаблона, ника, файла).
// svg читаем, чтобы перезапуститься после такой пересборки
watchPostEffect(() => {
  const markup = svg.value;
  const image = props.image;
  const imageGroup = root.value?.querySelector(`#${getPlaqueImageId(idPrefix)}`);
  if (markup && image && imageGroup) {
    imageGroup.setAttribute('transform', formatPlaqueImageTransform(image));
  }
});
</script>

<style scoped>
.plaque-preview {
  aspect-ratio: 148 / 210;
  width: 100%;
  border-radius: 1.9% / 1.35%;
  line-height: 0;
}

.plaque-preview--glow {
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--glow-color) 35%, transparent),
    0 10px 40px color-mix(in srgb, var(--glow-color) 40%, transparent),
    0 0 80px color-mix(in srgb, var(--glow-color) 22%, transparent);
}

.plaque-preview :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
