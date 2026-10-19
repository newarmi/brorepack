<template>
  <!-- SVG собирает renderPlaqueSvg, пользовательский текст в нём экранирован -->
  <!-- eslint-disable vue/no-v-html -->
  <div
    class="plaque-preview"
    :class="{ 'plaque-preview--glow': props.glow }"
    :style="{ '--glow-color': glowColor }"
    :aria-hidden="props.decorative || undefined"
    v-html="svg"
  />
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';

import type { PlaqueDesign, PlaqueImage, RenderPlaqueOptions } from '@brorepack/shared';
import { getTemplate, renderPlaqueSvg } from '@brorepack/shared';

import { getFrontArt, getPreviewArt } from '../utils/art';

const props = withDefaults(
  defineProps<{
    design: PlaqueDesign;
    glow?: boolean;
    /** Картинка клиента поверх фона шаблона */
    image?: PlaqueImage | null;
    /** Миниатюра рядом с текстом — скрыть от скринридеров, чтобы не дублировать подпись */
    decorative?: boolean;
    /** Только слой под картинкой клиента или над ней — для редактора, где картинка лежит между ними */
    layer?: RenderPlaqueOptions['layer'];
  }>(),
  { glow: false, image: null, decorative: false, layer: undefined },
);

// id внутри SVG должны быть уникальны на странице: превью бывает несколько
const idPrefix = `plaque-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

// Та же функция рендерит файл для печати, поэтому превью совпадает с результатом.
// Пользовательский текст экранируется внутри renderPlaqueSvg (escapeXml).
// Свечение — цвета шаблона: под красной плашкой красное, под белой — белое
const glowColor = computed(() => getTemplate(props.design.templateId).glowColor);

const svg = computed(() =>
  renderPlaqueSvg(props.design, {
    idPrefix,
    art: getPreviewArt(props.design.templateId),
    image: props.image ?? undefined,
    frontArt: getFrontArt(props.design.templateId),
    layer: props.layer,
  }),
);
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
