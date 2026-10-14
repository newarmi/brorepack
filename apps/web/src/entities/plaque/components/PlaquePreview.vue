<template>
  <!-- SVG собирает renderPlaqueSvg, пользовательский текст в нём экранирован -->
  <!-- eslint-disable vue/no-v-html -->
  <div
    class="plaque-preview"
    :class="{ 'plaque-preview--glow': props.glow }"
    :aria-hidden="props.decorative || undefined"
    v-html="svg"
  />
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';

import type { PlaqueDesign } from '@brorepack/shared';
import { renderPlaqueSvg } from '@brorepack/shared';

const props = withDefaults(
  defineProps<{
    design: PlaqueDesign;
    glow?: boolean;
    /** Миниатюра рядом с текстом — скрыть от скринридеров, чтобы не дублировать подпись */
    decorative?: boolean;
  }>(),
  { glow: false, decorative: false },
);

// id внутри SVG должны быть уникальны на странице: превью бывает несколько
const idPrefix = `plaque-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

// Та же функция рендерит файл для печати, поэтому превью совпадает с результатом.
// Пользовательский текст экранируется внутри renderPlaqueSvg (escapeXml).
const svg = computed(() => renderPlaqueSvg(props.design, { idPrefix }));
</script>

<style scoped>
.plaque-preview {
  aspect-ratio: 210 / 297;
  width: 100%;
  border-radius: 1.9% / 1.35%;
  line-height: 0;
}

.plaque-preview--glow {
  box-shadow:
    0 0 0 1px rgb(92 200 255 / 25%),
    0 10px 40px rgb(47 140 255 / 45%),
    0 0 80px rgb(47 140 255 / 25%);
}

.plaque-preview :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
