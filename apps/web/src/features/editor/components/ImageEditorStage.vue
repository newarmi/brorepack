<template>
  <!-- Жест слушается на всей области: на телефоне не нужно целиться пальцами в плашку -->
  <div ref="stage" class="image-stage">
    <div ref="frame" class="image-stage__frame">
      <!-- Та же картинка за плашкой, полупрозрачная: видно, какая часть обрежется краем -->
      <svg
        class="image-stage__overflow"
        :viewBox="`0 0 ${PLAQUE_VIEWBOX.width} ${PLAQUE_VIEWBOX.height}`"
        aria-hidden="true"
      >
        <g v-if="props.image" :transform="imageTransform">
          <image
            :href="props.image.href"
            :x="-props.image.width / 2"
            :y="-props.image.height / 2"
            :width="props.image.width"
            :height="props.image.height"
          />
        </g>
      </svg>
      <PlaquePreview class="image-stage__plaque" :design="props.design" :image="props.image" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';

import type { PlaqueDesign, PlaqueImage, PlaqueImageTransform } from '@brorepack/shared';
import { PLAQUE_VIEWBOX } from '@brorepack/shared';

import { PlaquePreview } from '@/entities/plaque';

import { useImageGesture } from '../composables/useImageGesture';

const emits = defineEmits<{ transformImage: [transform: PlaqueImageTransform] }>();

const props = defineProps<{
  design: PlaqueDesign;
  image: PlaqueImage | null;
}>();

const stage = useTemplateRef<HTMLElement>('stage');
const frame = useTemplateRef<HTMLElement>('frame');

useImageGesture(
  { target: stage, frame },
  () => props.image,
  (transform) => emits('transformImage', transform),
);

// Тот же порядок, что в renderPlaqueSvg: центр → поворот → масштаб
const imageTransform = computed(() => {
  if (!props.image) {
    return '';
  }
  const { x, y, rotation, scale } = props.image;
  return `translate(${x} ${y}) rotate(${rotation}) scale(${scale})`;
});
</script>

<style scoped>
/* container-type: size — плашка вписывается и по ширине, и по высоте свободного места (единицы cqw/cqh) */
.image-stage {
  display: grid;
  place-items: center;
  min-height: 0;
  overflow: hidden;
  container-type: size;
  cursor: move;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

/* Поля вокруг плашки — чтобы был виден полупрозрачный край картинки, который обрежется */
.image-stage__frame {
  position: relative;
  width: min(86cqw, 92cqh * 148 / 210);
}

.image-stage__overflow {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  opacity: 0.35;
  pointer-events: none;
}

.image-stage__plaque {
  position: relative;
  box-shadow: 0 0 0 1px var(--color-line-strong);
}
</style>
